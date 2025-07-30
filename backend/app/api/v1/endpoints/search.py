from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from datetime import datetime
from typing import List, Optional, Literal
from app.db.base import get_db
from app.models.file import File, FileShare
from app.models.folder import Folder, Tag, file_tags
from app.models.user import User
from app.schemas.search import SearchRequest, SearchResponse, SearchResult
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=SearchResponse)
async def search_files(
    search_data: SearchRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Advanced search with filters"""
    # Base query
    query = select(File).where(File.deleted == False)
    
    # Filter by user's files or public files
    if current_user:
        # User can see: their files, files shared with them, public files
        shared_subquery = (
            select(FileShare.file_id)
            .where(FileShare.shared_with_id == current_user.id)
            .where(
                or_(
                    FileShare.expires_at.is_(None),
                    FileShare.expires_at > datetime.utcnow()
                )
            )
        )
        
        query = query.where(
            or_(
                File.user_id == current_user.id,
                File.id.in_(shared_subquery),
                File.is_public == True
            )
        )
    else:
        # Anonymous users can only see public files
        query = query.where(File.is_public == True)
    
    # Text search across multiple fields
    if search_data.query:
        search_term = f"%{search_data.query}%"
        query = query.where(
            or_(
                File.original_filename.ilike(search_term),
                File.description.ilike(search_term),
                File.notes.ilike(search_term)
            )
        )
    
    # Filter by file type
    if search_data.file_types:
        mime_filters = []
        for file_type in search_data.file_types:
            if file_type == "image":
                mime_filters.append(File.mime_type.like("image/%"))
            elif file_type == "video":
                mime_filters.append(File.mime_type.like("video/%"))
            elif file_type == "audio":
                mime_filters.append(File.mime_type.like("audio/%"))
            elif file_type == "document":
                mime_filters.extend([
                    File.mime_type == "application/pdf",
                    File.mime_type.like("application/vnd.ms-%"),
                    File.mime_type.like("application/vnd.openxmlformats-%"),
                    File.mime_type == "text/plain"
                ])
            elif file_type == "archive":
                mime_filters.extend([
                    File.mime_type == "application/zip",
                    File.mime_type == "application/x-rar-compressed",
                    File.mime_type == "application/x-7z-compressed",
                    File.mime_type == "application/gzip"
                ])
        
        if mime_filters:
            query = query.where(or_(*mime_filters))
    
    # Filter by size range
    if search_data.min_size:
        query = query.where(File.file_size >= search_data.min_size)
    if search_data.max_size:
        query = query.where(File.file_size <= search_data.max_size)
    
    # Filter by date range
    if search_data.created_after:
        query = query.where(File.created_at >= search_data.created_after)
    if search_data.created_before:
        query = query.where(File.created_at <= search_data.created_before)
    
    # Filter by tags
    if search_data.tags and current_user:
        tag_subquery = (
            select(file_tags.c.file_id)
            .join(Tag, Tag.id == file_tags.c.tag_id)
            .where(Tag.name.in_(search_data.tags))
            .where(Tag.user_id == current_user.id)
        )
        query = query.where(File.id.in_(tag_subquery))
    
    # Filter by folder
    if search_data.folder_id and current_user:
        if search_data.include_subfolders:
            # Get all subfolders
            folder_ids = await get_folder_tree(db, search_data.folder_id, current_user.id)
            query = query.where(File.folder_id.in_(folder_ids))
        else:
            query = query.where(File.folder_id == search_data.folder_id)
    
    # Filter by expiry status
    if search_data.show_expired is False:
        query = query.where(File.expires_at > datetime.utcnow())
    
    # Sorting
    if search_data.sort_by == "name":
        query = query.order_by(File.original_filename.asc() if search_data.sort_order == "asc" else File.original_filename.desc())
    elif search_data.sort_by == "size":
        query = query.order_by(File.file_size.asc() if search_data.sort_order == "asc" else File.file_size.desc())
    elif search_data.sort_by == "created":
        query = query.order_by(File.created_at.asc() if search_data.sort_order == "asc" else File.created_at.desc())
    elif search_data.sort_by == "modified":
        query = query.order_by(File.updated_at.asc() if search_data.sort_order == "asc" else File.updated_at.desc())
    else:  # relevance (default)
        # Simple relevance: exact matches first
        if search_data.query:
            query = query.order_by(
                func.case(
                    (File.original_filename == search_data.query, 0),
                    (File.original_filename.ilike(f"{search_data.query}%"), 1),
                    else_=2
                )
            )
        else:
            query = query.order_by(File.created_at.desc())
    
    # Pagination
    total_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_query)
    total_count = total_result.scalar()
    
    query = query.offset(search_data.offset).limit(search_data.limit)
    
    # Execute search
    result = await db.execute(query)
    files = result.scalars().all()
    
    # Get tags for each file if user is authenticated
    results = []
    for file in files:
        tags = []
        if current_user:
            tag_result = await db.execute(
                select(Tag)
                .join(file_tags, Tag.id == file_tags.c.tag_id)
                .where(file_tags.c.file_id == file.id)
                .where(Tag.user_id == current_user.id)
            )
            tags = [tag.name for tag in tag_result.scalars().all()]
        
        results.append(SearchResult(
            id=file.id,
            original_filename=file.original_filename,
            file_size=file.file_size,
            mime_type=file.mime_type,
            short_code=file.short_code,
            description=file.description,
            created_at=file.created_at,
            updated_at=file.updated_at,
            expires_at=file.expires_at,
            download_count=file.download_count,
            folder_id=file.folder_id,
            tags=tags,
            is_public=file.is_public,
            has_password=bool(file.password_hash)
        ))
    
    return SearchResponse(
        results=results,
        total_count=total_count,
        offset=search_data.offset,
        limit=search_data.limit
    )


async def get_folder_tree(db: AsyncSession, folder_id: str, user_id: str) -> List[str]:
    """Recursively get all subfolder IDs"""
    folder_ids = [folder_id]
    
    async def get_subfolders(parent_id: str):
        result = await db.execute(
            select(Folder.id)
            .where(Folder.parent_id == parent_id)
            .where(Folder.user_id == user_id)
        )
        subfolder_ids = [row[0] for row in result.all()]
        
        for subfolder_id in subfolder_ids:
            folder_ids.append(subfolder_id)
            await get_subfolders(subfolder_id)
    
    await get_subfolders(folder_id)
    return folder_ids


@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2),
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, le=20)
):
    """Get search suggestions based on partial query"""
    search_term = f"{q}%"
    
    # Base query for accessible files
    query = select(File.original_filename).distinct()
    query = query.where(File.deleted == False)
    query = query.where(File.expires_at > datetime.utcnow())
    
    if current_user:
        shared_subquery = (
            select(FileShare.file_id)
            .where(FileShare.shared_with_id == current_user.id)
        )
        
        query = query.where(
            or_(
                File.user_id == current_user.id,
                File.id.in_(shared_subquery),
                File.is_public == True
            )
        )
    else:
        query = query.where(File.is_public == True)
    
    query = query.where(File.original_filename.ilike(search_term))
    query = query.limit(limit)
    
    result = await db.execute(query)
    suggestions = [row[0] for row in result.all()]
    
    return {"suggestions": suggestions}


@router.get("/tags")
async def get_user_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all tags for the current user"""
    result = await db.execute(
        select(Tag)
        .where(Tag.user_id == current_user.id)
        .order_by(Tag.name)
    )
    tags = result.scalars().all()
    
    return {
        "tags": [
            {
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
                "created_at": tag.created_at
            }
            for tag in tags
        ]
    }