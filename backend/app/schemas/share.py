from pydantic import BaseModel, EmailStr
from typing import Optional


class ShareFileRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[EmailStr] = None
    message: Optional[str] = None


class ShareFileResponse(BaseModel):
    success: bool
    message: str