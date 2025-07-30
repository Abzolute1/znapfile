from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID


class FileUploadResponse(BaseModel):
    id: UUID
    short_code: str
    download_url: str
    expires_at: datetime
    file_size: int
    original_filename: str
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.strftime('%Y-%m-%dT%H:%M:%S.%fZ') if v else None
        }


class FileInfo(BaseModel):
    id: UUID
    original_filename: str
    file_size: int
    mime_type: Optional[str]
    short_code: str
    expires_at: datetime
    download_count: int
    max_downloads: Optional[int]
    created_at: datetime
    has_password: bool
    description: Optional[str] = None
    notes: Optional[str] = None
    is_public: bool = False
    allow_comments: bool = True
    version: int = 1
    folder_id: Optional[UUID] = None
    parent_file_id: Optional[UUID] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.strftime('%Y-%m-%dT%H:%M:%S.%fZ') if v else None
        }


class PublicFileInfo(BaseModel):
    """Limited file info exposed to public/unauthenticated users"""
    original_filename: str
    file_size: int
    mime_type: Optional[str]
    expires_at: datetime
    has_password: bool
    download_count: int
    max_downloads: Optional[int]
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.strftime('%Y-%m-%dT%H:%M:%S.%fZ') if v else None
        }


class FileListResponse(BaseModel):
    files: List[FileInfo]
    total_storage_used: int
    storage_limit: int


class DownloadRequest(BaseModel):
    password: Optional[str] = None