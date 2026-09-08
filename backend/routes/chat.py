"""Authenticated chat and conversation API backed by SQLite and Gemini."""

import os
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from starlette.config import Config

from auth.dependencies import get_current_user
from models.user import User
from services.database import database

router = APIRouter()
config = Config(str(Path(__file__).resolve().parents[2] / ".env"))


class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=12000)
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConversationCreate(BaseModel):
    user_id: Optional[str] = None
    session_id: str
    first_message: Optional[str] = None


def _owned(conversation_id: str, user: User) -> dict:
    conversation = database.get_conversation(conversation_id, user.user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


async def _generate_with_gemini(history: list[dict], message: str) -> str:
    api_key = config("GEMINI_API_KEY", default=os.getenv("GEMINI_API_KEY", ""))
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    model = config("GEMINI_MODEL", default="gemini-3.6-flash")
    contents = []
    for item in history[-20:]:
        contents.append({"role": "model" if item["role"] == "assistant" else "user", "parts": [{"text": item["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    payload = {
        "systemInstruction": {"parts": [{"text": "You are Commix, a concise and practical AI workspace assistant. Be clear, useful, and honest about limitations."}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 2048},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(url, params={"key": api_key}, json=payload)
        if response.status_code >= 400:
            detail = response.json().get("error", {}).get("message", "Gemini request failed")
            raise HTTPException(status_code=502, detail=detail)
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except HTTPException:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"AI provider unavailable: {exc}") from exc


@router.post("/chat")
async def chat(payload: ChatRequest, current_user: User = Depends(get_current_user)):
    conversation = None
    if payload.session_id:
        conversation = database.get_conversation_by_session(payload.session_id, current_user.user_id)
    if conversation is None:
        conversation = database.create_conversation(current_user.user_id, payload.session_id or f"sess_{uuid4().hex[:10]}", payload.message)

    history = conversation["messages"]
    database.add_message(conversation["conversation_id"], current_user.user_id, "user", payload.message, payload.metadata)
    response_text = await _generate_with_gemini(history, payload.message)
    database.add_message(conversation["conversation_id"], current_user.user_id, "assistant", response_text)
    return {"response": response_text, "session_id": conversation["session_id"], "action_required": False, "suggested_actions": [], "metadata": {"conversation_id": conversation["conversation_id"]}}


@router.get("/api/conversations")
async def list_conversations(limit: int = 50, skip: int = 0, include_archived: bool = False, current_user: User = Depends(get_current_user)):
    conversations, total = database.list_conversations(current_user.user_id, limit, skip, include_archived)
    return {"conversations": conversations, "total": total}


@router.post("/api/conversations")
async def create_conversation(payload: ConversationCreate, current_user: User = Depends(get_current_user)):
    if payload.user_id and payload.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You cannot create a conversation for another user")
    return database.create_conversation(current_user.user_id, payload.session_id, payload.first_message)


@router.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    return _owned(conversation_id, current_user)


@router.get("/api/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, limit: Optional[int] = None, current_user: User = Depends(get_current_user)):
    conversation = _owned(conversation_id, current_user)
    messages = conversation["messages"][-limit:] if limit else conversation["messages"]
    return {"conversation_id": conversation_id, "messages": messages, "total": len(conversation["messages"])}


@router.patch("/api/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, title: str, current_user: User = Depends(get_current_user)):
    _owned(conversation_id, current_user)
    if not database.update_conversation(conversation_id, current_user.user_id, title=title):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation updated"}


@router.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    _owned(conversation_id, current_user)
    database.delete_conversation(conversation_id, current_user.user_id)
    return {"message": "Conversation deleted"}


@router.post("/api/conversations/{conversation_id}/archive")
async def archive_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    _owned(conversation_id, current_user)
    database.update_conversation(conversation_id, current_user.user_id, archived=True)
    return {"message": "Conversation archived"}
