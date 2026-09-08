"""SQLite persistence for local development and small deployments.

The repository uses one short-lived sqlite connection per operation, which is
safe with FastAPI's async request handling and keeps the storage layer easy to
replace with Postgres later.
"""

import json
import os
import sqlite3
from uuid import uuid4
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from models.user import User, UserCreate, UserUpdate


BASE_DIR = Path(__file__).resolve().parents[1]
_configured_database_path = Path(os.getenv("DATABASE_PATH", str(BASE_DIR / "commix.db")))
DATABASE_PATH = _configured_database_path if _configured_database_path.is_absolute() else Path(__file__).resolve().parents[2] / _configured_database_path


def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with _connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                name TEXT NOT NULL,
                picture TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_verified INTEGER NOT NULL DEFAULT 0,
                last_login TEXT,
                created_at TEXT NOT NULL,
                preferences TEXT NOT NULL,
                google_tokens TEXT,
                is_admin INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                session_id TEXT NOT NULL,
                title TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_archived INTEGER NOT NULL DEFAULT 0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                metadata TEXT NOT NULL DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
                ON conversations(user_id, updated_at DESC);
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                metadata TEXT,
                tool_calls TEXT,
                tokens_used INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_time
                ON messages(conversation_id, timestamp);
            """
        )


def _user(row: sqlite3.Row) -> User:
    return User(
        user_id=row["user_id"], email=row["email"], name=row["name"], picture=row["picture"],
        is_active=bool(row["is_active"]), is_verified=bool(row["is_verified"]),
        last_login=datetime.fromisoformat(row["last_login"].replace("Z", "+00:00")) if row["last_login"] else None,
        created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
        preferences=json.loads(row["preferences"] or "{}"),
        google_tokens=json.loads(row["google_tokens"]) if row["google_tokens"] else None,
        is_admin=bool(row["is_admin"]),
    )


class Database:
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        with _connect() as db:
            row = db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
            return _user(row) if row else None

    def get_user_by_email(self, email: str) -> Optional[User]:
        with _connect() as db:
            row = db.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
            return _user(row) if row else None

    def create_or_update_user(self, data: UserCreate) -> User:
        existing = self.get_user_by_email(str(data.email))
        timestamp = _now()
        with _connect() as db:
            if existing:
                db.execute(
                    "UPDATE users SET name = ?, picture = COALESCE(?, picture), google_tokens = COALESCE(?, google_tokens) WHERE user_id = ?",
                    (data.name, data.picture, json.dumps(data.google_tokens) if data.google_tokens else None, existing.user_id),
                )
                return self.get_user_by_id(existing.user_id)  # type: ignore[return-value]
            user_id = f"user_{os.urandom(8).hex()}"
            db.execute(
                "INSERT INTO users (user_id,email,name,picture,created_at,preferences,google_tokens) VALUES (?,?,?,?,?,?,?)",
                (user_id, str(data.email).lower(), data.name, data.picture, timestamp, json.dumps({"timezone": "UTC", "language": "en", "theme": "light", "notifications_enabled": True}), json.dumps(data.google_tokens) if data.google_tokens else None),
            )
        return self.get_user_by_id(user_id)  # type: ignore[return-value]

    def update_user(self, user_id: str, data: UserUpdate) -> Optional[User]:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return self.get_user_by_id(user_id)
        assignments = []
        params: list[Any] = []
        for key, value in values.items():
            assignments.append(f"{key} = ?")
            params.append(json.dumps(value) if key == "preferences" else value)
        params.append(user_id)
        with _connect() as db:
            db.execute(f"UPDATE users SET {', '.join(assignments)} WHERE user_id = ?", params)
        return self.get_user_by_id(user_id)

    def update_google_tokens(self, user_id: str, tokens: dict) -> bool:
        with _connect() as db:
            result = db.execute("UPDATE users SET google_tokens = ? WHERE user_id = ?", (json.dumps(tokens), user_id))
            return result.rowcount > 0

    def touch_login(self, user_id: str) -> None:
        with _connect() as db:
            db.execute("UPDATE users SET last_login = ? WHERE user_id = ?", (_now(), user_id))

    def create_conversation(self, user_id: str, session_id: str, first_message: Optional[str] = None) -> dict:
        conversation_id = f"conv_{uuid4().hex[:12]}"
        timestamp = _now()
        item = {
            "conversation_id": conversation_id, "user_id": user_id, "session_id": session_id,
            "title": (first_message or "New conversation").strip()[:52], "messages": [],
            "created_at": timestamp, "updated_at": timestamp, "is_archived": False,
            "total_tokens": 0, "metadata": {},
        }
        with _connect() as db:
            db.execute(
                "INSERT INTO conversations (conversation_id,user_id,session_id,title,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                (conversation_id, user_id, session_id, item["title"], timestamp, timestamp),
            )
        return item

    def _conversation(self, row: sqlite3.Row) -> dict:
        with _connect() as db:
            message_rows = db.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp", (row["conversation_id"],)).fetchall()
        return {
            "conversation_id": row["conversation_id"], "user_id": row["user_id"], "session_id": row["session_id"],
            "title": row["title"], "messages": [self._message(message) for message in message_rows],
            "created_at": row["created_at"], "updated_at": row["updated_at"],
            "is_archived": bool(row["is_archived"]), "total_tokens": row["total_tokens"],
            "metadata": json.loads(row["metadata"] or "{}"),
        }

    @staticmethod
    def _message(row: sqlite3.Row) -> dict:
        return {"id": row["id"], "role": row["role"], "content": row["content"], "timestamp": row["timestamp"], "metadata": json.loads(row["metadata"] or "{}")}

    def get_conversation(self, conversation_id: str, user_id: Optional[str] = None) -> Optional[dict]:
        with _connect() as db:
            if user_id:
                row = db.execute("SELECT * FROM conversations WHERE conversation_id = ? AND user_id = ?", (conversation_id, user_id)).fetchone()
            else:
                row = db.execute("SELECT * FROM conversations WHERE conversation_id = ?", (conversation_id,)).fetchone()
            return self._conversation(row) if row else None

    def get_conversation_by_session(self, session_id: str, user_id: str) -> Optional[dict]:
        with _connect() as db:
            row = db.execute("SELECT * FROM conversations WHERE session_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1", (session_id, user_id)).fetchone()
            return self._conversation(row) if row else None

    def list_conversations(self, user_id: str, limit: int, skip: int, include_archived: bool) -> tuple[list[dict], int]:
        with _connect() as db:
            archived_clause = "" if include_archived else " AND is_archived = 0"
            total = db.execute(f"SELECT COUNT(*) FROM conversations WHERE user_id = ?{archived_clause}", (user_id,)).fetchone()[0]
            rows = db.execute(f"SELECT * FROM conversations WHERE user_id = ?{archived_clause} ORDER BY updated_at DESC LIMIT ? OFFSET ?", (user_id, min(limit, 100), skip)).fetchall()
            return [self._conversation(row) for row in rows], total

    def add_message(self, conversation_id: str, user_id: str, role: str, content: str, metadata: Optional[dict] = None) -> Optional[dict]:
        if not self.get_conversation(conversation_id, user_id):
            return None
        message_id = uuid4().hex
        timestamp = _now()
        with _connect() as db:
            db.execute("INSERT INTO messages (id,conversation_id,role,content,timestamp,metadata) VALUES (?,?,?,?,?,?)", (message_id, conversation_id, role, content, timestamp, json.dumps(metadata or {})))
            db.execute("UPDATE conversations SET updated_at = ? WHERE conversation_id = ? AND user_id = ?", (timestamp, conversation_id, user_id))
        return {"id": message_id, "role": role, "content": content, "timestamp": timestamp, "metadata": metadata or {}}

    def update_conversation(self, conversation_id: str, user_id: str, title: Optional[str] = None, archived: Optional[bool] = None) -> bool:
        assignments, params = [], []
        if title is not None: assignments.append("title = ?"); params.append(title[:100])
        if archived is not None: assignments.append("is_archived = ?"); params.append(int(archived))
        if not assignments: return False
        assignments.append("updated_at = ?"); params.append(_now()); params.extend([conversation_id, user_id])
        with _connect() as db:
            result = db.execute(f"UPDATE conversations SET {', '.join(assignments)} WHERE conversation_id = ? AND user_id = ?", params)
            return result.rowcount > 0

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        with _connect() as db:
            result = db.execute("DELETE FROM conversations WHERE conversation_id = ? AND user_id = ?", (conversation_id, user_id))
            return result.rowcount > 0


database = Database()
