from pydantic import BaseModel
from typing import List, Optional, Dict
from uuid import UUID
from app.schemas.file import FileUploadResponse


class BatchUploadResponse(BaseModel):
    uploaded_files: List[FileUploadResponse]
    failed_files: List[Dict[str, str]]
    total_uploaded: int
    total_failed: int
    root_folder_id: Optional[UUID] = None


class BatchUploadProgress(BaseModel):
    total_files: int
    processed_files: int
    current_file: Optional[str] = None
    percent_complete: float