from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID


class ShareFileRequest(BaseModel):
    email: EmailStr
    permission: Literal["view", "edit", "admin"] = "view"
    expiry_days: Optional[int] = None


class ShareFileResponse(BaseModel):
    id: UUID
    file_id: UUID
    shared_with_email: str
    permission: str
    shared_at: datetime
    expires_at: Optional[datetime]


class SharedFileInfo(BaseModel):
    share_id: UUID
    file_id: UUID
    original_filename: str
    file_size: int
    mime_type: Optional[str]
    short_code: str
    shared_by_email: str
    shared_by_name: Optional[str]
    permission: str
    shared_at: datetime
    expires_at: Optional[datetime]
    file_expires_at: datetime


class FileCommentCreate(BaseModel):
    content: str


class FileCommentResponse(BaseModel):
    id: UUID
    file_id: UUID
    user_id: UUID
    user_email: str
    user_name: Optional[str]
    content: str
    created_at: datetime


class SharedUserInfo(BaseModel):
    share_id: UUID
    user_id: UUID
    user_email: str
    user_name: Optional[str]
    permission: str
    shared_at: datetime
    expires_at: Optional[datetime]


class SharedUsersResponse(BaseModel):
    file_id: UUID
    shares: List[SharedUserInfo]