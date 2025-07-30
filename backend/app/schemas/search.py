from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID


class SearchRequest(BaseModel):
    query: Optional[str] = None
    file_types: Optional[List[Literal["image", "video", "audio", "document", "archive"]]] = None
    min_size: Optional[int] = Field(None, ge=0)
    max_size: Optional[int] = Field(None, ge=0)
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    tags: Optional[List[str]] = None
    folder_id: Optional[UUID] = None
    include_subfolders: bool = True
    show_expired: bool = False
    sort_by: Literal["relevance", "name", "size", "created", "modified"] = "relevance"
    sort_order: Literal["asc", "desc"] = "desc"
    offset: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)


class SearchResult(BaseModel):
    id: UUID
    original_filename: str
    file_size: int
    mime_type: Optional[str]
    short_code: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    download_count: int
    folder_id: Optional[UUID]
    tags: List[str]
    is_public: bool
    has_password: bool


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_count: int
    offset: int
    limit: int