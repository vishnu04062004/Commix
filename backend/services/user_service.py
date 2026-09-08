"""User service backed by SQLite persistence."""

from typing import Any, Dict, Optional

from models.user import User, UserCreate, UserUpdate
from services.database import database


class UserService:
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        return database.get_user_by_id(user_id)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        return database.get_user_by_email(email)

    async def create_user(self, user_data: UserCreate) -> User:
        return database.create_or_update_user(user_data)

    async def update_user(self, user_id: str, update_data: UserUpdate) -> Optional[User]:
        return database.update_user(user_id, update_data)

    async def update_google_tokens(self, user_id: str, tokens: Dict[str, Any]) -> bool:
        return database.update_google_tokens(user_id, tokens)

    async def touch_login(self, user_id: str) -> None:
        database.touch_login(user_id)

    async def delete_user(self, user_id: str) -> bool:
        # User deletion is intentionally not exposed by the API yet.
        return False
