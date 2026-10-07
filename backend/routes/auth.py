"""Authentication endpoints for Google OAuth and local development."""

import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from starlette.responses import RedirectResponse

from auth.dependencies import get_current_user
from auth.jwt_handler import get_jwt_handler
from auth.oauth import GoogleOAuthConfig, get_google_oauth_client
from models.user import User, UserCreate
from services.user_service import UserService

router = APIRouter()


def _frontend_url(path: str = "") -> str:
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base_url}/{path.lstrip('/')}" if path else base_url


class RefreshRequest(BaseModel):
    refresh_token: str


class DevLoginRequest(BaseModel):
    email: EmailStr = "demo@commix.dev"
    name: str = "Demo user"


def _tokens_for(user: User) -> dict:
    handler = get_jwt_handler()
    return {
        "access_token": handler.create_access_token({"sub": user.user_id, "email": str(user.email)}),
        "refresh_token": handler.create_refresh_token({"sub": user.user_id, "email": str(user.email)}),
        "token_type": "bearer",
        "expires_in": handler.access_token_expire_minutes * 60,
        "user": user.model_dump(mode="json"),
    }


@router.get("/login")
async def login(request: Request, redirect_url: Optional[str] = None):
    """Start Google OAuth when configured; otherwise use the local demo path."""
    oauth_config = GoogleOAuthConfig()
    if not oauth_config.validate():
        return RedirectResponse(url=redirect_url or _frontend_url("login?demo=1"))
    return await get_google_oauth_client().authorize_redirect(request, oauth_config.redirect_uri)


@router.get("/callback")
async def callback(request: Request):
    oauth_config = GoogleOAuthConfig()
    if not oauth_config.validate():
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    try:
        token = await get_google_oauth_client().authorize_access_token(request)
        userinfo = token.get("userinfo") or {}
        email = userinfo.get("email")
        if not email:
            raise ValueError("Google did not return an email address")
        service = UserService()
        user = await service.create_user(UserCreate(
            email=email,
            name=userinfo.get("name") or email.split("@")[0],
            picture=userinfo.get("picture"),
            google_tokens=token,
        ))
        await service.touch_login(user.user_id)
        user = await service.get_user_by_id(user.user_id) or user
        tokens = _tokens_for(user)
        target = _frontend_url("auth/callback")
        return RedirectResponse(url=f"{target}?access_token={tokens['access_token']}&refresh_token={tokens['refresh_token']}")
    except Exception as exc:
        return RedirectResponse(url=f"{_frontend_url('auth/callback')}?message={str(exc)}")


@router.post("/dev-login")
async def dev_login(payload: DevLoginRequest):
    """Local fallback so the complete product can be previewed without Google."""
    service = UserService()
    user = await service.create_user(UserCreate(email=payload.email, name=payload.name))
    await service.touch_login(user.user_id)
    user = await service.get_user_by_id(user.user_id) or user
    return _tokens_for(user)


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return current_user.model_dump(mode="json")


@router.post("/refresh")
async def refresh(payload: RefreshRequest):
    handler = get_jwt_handler()
    token_data = handler.verify_token(payload.refresh_token, token_type="refresh")
    if not token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await UserService().get_user_by_id(token_data.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _tokens_for(user)


@router.post("/logout")
async def logout():
    return {"message": "Logged out"}
