from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from uuid import UUID


class InitiateMultipartUploadRequest(BaseModel):
    filename: str
    file_size: int = Field(..., gt=0)
    content_type: Optional[str] = "application/octet-stream"
    metadata: Optional[Dict[str, Any]] = None


class InitiateMultipartUploadResponse(BaseModel):
    session_id: str
    upload_id: str
    chunk_size: int
    total_chunks: int
    expires_at: str


class GetUploadUrlRequest(BaseModel):
    session_id: str
    chunk_number: int = Field(..., ge=0)


class GetUploadUrlResponse(BaseModel):
    upload_url: str
    already_uploaded: bool = False


class CompleteMultipartUploadRequest(BaseModel):
    session_id: str
    short_code: Optional[str] = None
    expiration_hours: int = Field(default=24, ge=1, le=720)
    max_downloads: Optional[int] = None
    description: Optional[str] = None
    is_public: bool = False


class CompleteMultipartUploadResponse(BaseModel):
    file_id: UUID
    short_code: str
    download_url: str
    expires_at: datetime


class UploadSessionResponse(BaseModel):
    session_id: str
    filename: str
    file_size: int
    total_chunks: int
    completed_chunks: int
    created_at: str
    expires_at: str