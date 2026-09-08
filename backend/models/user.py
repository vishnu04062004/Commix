"""
User model for the application.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime


class User(BaseModel):
    """User data model"""
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    last_login: Optional[datetime] = None
    created_at: datetime
    preferences: Dict[str, Any] = {
        "timezone": "UTC",
        "language": "en",
        "theme": "light",
        "notifications_enabled": True
    }
    google_tokens: Optional[Dict[str, Any]] = None
    is_admin: bool = False


class UserCreate(BaseModel):
    """User creation model"""
    email: EmailStr
    name: str
    picture: Optional[str] = None
    google_tokens: Optional[Dict[str, Any]] = None


class UserUpdate(BaseModel):
    """User update model"""
    name: Optional[str] = None
    picture: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
