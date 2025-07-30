from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional
from uuid import UUID
from app.models.user import UserTier


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None


class UserCreate(UserBase):
    username: str
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v.lower()


class UserLogin(UserBase):
    password: str


class UserResponse(UserBase):
    id: UUID
    username: str
    tier: UserTier
    email_verified: bool
    created_at: datetime
    subscription_end_date: Optional[datetime] = None
    is_superuser: bool = False

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse