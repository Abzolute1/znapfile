from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID


class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None


class FolderResponse(BaseModel):
    id: UUID
    parent_id: Optional[UUID]
    name: str
    description: Optional[str]
    path: str
    color: Optional[str]
    icon: Optional[str]
    created_at: datetime
    file_count: int
    total_size: int


class FolderTree(BaseModel):
    tree: Dict[str, Any]
    folder_count: int


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")


class TagResponse(BaseModel):
    id: UUID
    name: str
    color: Optional[str]
    created_at: datetime
    file_count: int


class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = False
    password_hash: Optional[str] = None


class CollectionResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    is_public: bool
    has_password: bool
    created_at: datetime
    updated_at: datetime
    item_count: int