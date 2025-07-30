from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from uuid import UUID


class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    readme_content: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_public: bool = False
    password: Optional[str] = None
    allow_delete: bool = False
    expires_in_hours: Optional[int] = Field(None, ge=1, le=720)  # Max 30 days


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    readme_content: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_public: Optional[bool] = None
    password: Optional[str] = None
    allow_delete: Optional[bool] = None
    expires_in_hours: Optional[int] = Field(None, ge=1, le=720)  # Max 30 days


class FileInCollection(BaseModel):
    id: UUID
    original_filename: str
    file_size: int
    mime_type: str
    short_code: str
    path: str
    order: int
    added_at: datetime
    description: Optional[str]
    download_count: int


class CollectionResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    readme_content: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    is_public: bool
    has_password: bool
    allow_delete: bool
    view_count: int
    download_count: int
    file_count: int
    total_size: int
    expires_at: Optional[datetime]
    last_accessed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    
class CollectionDetailResponse(CollectionResponse):
    files: List[FileInCollection]
    file_tree: Dict  # Hierarchical structure of files


class AddFilesToCollection(BaseModel):
    file_ids: List[UUID]
    paths: Optional[Dict[str, str]] = None  # Map file_id to virtual path


class ReorderFiles(BaseModel):
    file_orders: Dict[str, int]  # Map file_id to order


class CreateFolder(BaseModel):
    path: str = Field("", max_length=500)  # Empty string for root, path for nested folders
    name: str = Field(..., min_length=1, max_length=255)