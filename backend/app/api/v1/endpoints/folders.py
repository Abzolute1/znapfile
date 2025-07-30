from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from app.db.base import get_db
from app.models.folder import Folder, Tag, Collection, CollectionItem
from app.models.file import File
from app.models.user import User
from app.schemas.folder import (
    FolderCreate, FolderUpdate, FolderResponse, FolderTree,
    TagCreate, TagResponse, CollectionCreate, CollectionResponse
)
from app.api.deps import require_user

router = APIRouter()


@router.post("/folders", response_model=FolderResponse)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new folder"""
    # Validate parent folder if provided
    parent_path = ""
    if folder_data.parent_id:
        parent_result = await db.execute(
            select(Folder)
            .where(Folder.id == folder_data.parent_id)
            .where(Folder.user_id == current_user.id)
        )
        parent = parent_result.scalar_one_or_none()
        
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
        parent_path = parent.path
    
    # Create folder
    folder = Folder(
        user_id=current_user.id,
        parent_id=folder_data.parent_id,
        name=folder_data.name,
        description=folder_data.description,
        path=f"{parent_path}/{folder_data.name}",
        color=folder_data.color,
        icon=folder_data.icon
    )
    
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    
    return FolderResponse(
        id=folder.id,
        parent_id=folder.parent_id,
        name=folder.name,
        description=folder.description,
        path=folder.path,
        color=folder.color,
        icon=folder.icon,
        created_at=folder.created_at,
        file_count=0,
        total_size=0
    )


@router.get("/folders", response_model=List[FolderResponse])
async def list_folders(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    parent_id: Optional[UUID] = Query(None)
):
    """List user's folders"""
    query = select(Folder).where(Folder.user_id == current_user.id)
    
    if parent_id is None:
        query = query.where(Folder.parent_id.is_(None))
    else:
        query = query.where(Folder.parent_id == parent_id)
    
    result = await db.execute(query.order_by(Folder.name))
    folders = result.scalars().all()
    
    # Get file counts and sizes for each folder
    folder_responses = []
    for folder in folders:
        # Count files and calculate size
        file_result = await db.execute(
            select(func.count(File.id), func.sum(File.file_size))
            .where(File.folder_id == folder.id)
            .where(File.deleted == False)
        )
        file_count, total_size = file_result.one()
        
        folder_responses.append(FolderResponse(
            id=folder.id,
            parent_id=folder.parent_id,
            name=folder.name,
            description=folder.description,
            path=folder.path,
            color=folder.color,
            icon=folder.icon,
            created_at=folder.created_at,
            file_count=file_count or 0,
            total_size=total_size or 0
        ))
    
    return folder_responses


@router.get("/folders/tree", response_model=FolderTree)
async def get_folder_tree(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get complete folder tree for user"""
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.path)
    )
    folders = result.scalars().all()
    
    # Build tree structure
    tree = {"root": {"folders": {}, "files": []}}
    folder_map = {}
    
    for folder in folders:
        folder_map[folder.id] = {
            "id": folder.id,
            "name": folder.name,
            "path": folder.path,
            "folders": {},
            "files": []
        }
    
    # Build hierarchy
    for folder in folders:
        if folder.parent_id:
            if folder.parent_id in folder_map:
                folder_map[folder.parent_id]["folders"][folder.id] = folder_map[folder.id]
        else:
            tree["root"]["folders"][folder.id] = folder_map[folder.id]
    
    return FolderTree(tree=tree, folder_count=len(folders))


@router.patch("/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: UUID,
    folder_data: FolderUpdate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Update folder details"""
    result = await db.execute(
        select(Folder)
        .where(Folder.id == folder_id)
        .where(Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    if folder_data.name is not None:
        folder.name = folder_data.name
        # Update path
        parent_path = ""
        if folder.parent_id:
            parent_result = await db.execute(
                select(Folder.path)
                .where(Folder.id == folder.parent_id)
            )
            parent_path = parent_result.scalar()
        folder.path = f"{parent_path}/{folder_data.name}"
    
    if folder_data.description is not None:
        folder.description = folder_data.description
    
    if folder_data.color is not None:
        folder.color = folder_data.color
    
    if folder_data.icon is not None:
        folder.icon = folder_data.icon
    
    await db.commit()
    await db.refresh(folder)
    
    # Get file stats
    file_result = await db.execute(
        select(func.count(File.id), func.sum(File.file_size))
        .where(File.folder_id == folder.id)
        .where(File.deleted == False)
    )
    file_count, total_size = file_result.one()
    
    return FolderResponse(
        id=folder.id,
        parent_id=folder.parent_id,
        name=folder.name,
        description=folder.description,
        path=folder.path,
        color=folder.color,
        icon=folder.icon,
        created_at=folder.created_at,
        file_count=file_count or 0,
        total_size=total_size or 0
    )


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: UUID,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    force: bool = Query(False)
):
    """Delete a folder"""
    result = await db.execute(
        select(Folder)
        .where(Folder.id == folder_id)
        .where(Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Check if folder has files or subfolders
    has_files = await db.execute(
        select(func.count(File.id))
        .where(File.folder_id == folder_id)
        .where(File.deleted == False)
    )
    file_count = has_files.scalar()
    
    has_subfolders = await db.execute(
        select(func.count(Folder.id))
        .where(Folder.parent_id == folder_id)
    )
    subfolder_count = has_subfolders.scalar()
    
    if (file_count > 0 or subfolder_count > 0) and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Folder contains {file_count} files and {subfolder_count} subfolders. Use force=true to delete."
        )
    
    await db.delete(folder)
    await db.commit()
    
    return {"message": "Folder deleted successfully"}


# Tag endpoints
@router.post("/tags", response_model=TagResponse)
async def create_tag(
    tag_data: TagCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new tag"""
    # Check if tag already exists
    existing = await db.execute(
        select(Tag)
        .where(Tag.user_id == current_user.id)
        .where(Tag.name == tag_data.name)
    )
    if existing.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag already exists"
        )
    
    tag = Tag(
        user_id=current_user.id,
        name=tag_data.name,
        color=tag_data.color
    )
    
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    
    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        created_at=tag.created_at,
        file_count=0
    )


@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's tags"""
    result = await db.execute(
        select(Tag)
        .where(Tag.user_id == current_user.id)
        .order_by(Tag.name)
    )
    tags = result.scalars().all()
    
    responses = []
    for tag in tags:
        # Count files with this tag
        file_count = len(tag.files)
        responses.append(TagResponse(
            id=tag.id,
            name=tag.name,
            color=tag.color,
            created_at=tag.created_at,
            file_count=file_count
        ))
    
    return responses


# Collection endpoints
@router.post("/collections", response_model=CollectionResponse)
async def create_collection(
    collection_data: CollectionCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new collection"""
    collection = Collection(
        user_id=current_user.id,
        name=collection_data.name,
        description=collection_data.description,
        is_public=collection_data.is_public,
        password_hash=collection_data.password_hash if collection_data.is_public else None
    )
    
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        is_public=collection.is_public,
        has_password=bool(collection.password_hash),
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        item_count=0
    )


@router.get("/collections", response_model=List[CollectionResponse])
async def list_collections(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's collections"""
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.updated_at.desc())
    )
    collections = result.scalars().all()
    
    responses = []
    for collection in collections:
        responses.append(CollectionResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            is_public=collection.is_public,
            has_password=bool(collection.password_hash),
            created_at=collection.created_at,
            updated_at=collection.updated_at,
            item_count=len(collection.items)
        ))
    
    return responses


@router.post("/collections/{collection_id}/files/{file_id}")
async def add_file_to_collection(
    collection_id: UUID,
    file_id: UUID,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a file to a collection"""
    # Verify collection ownership
    collection_result = await db.execute(
        select(Collection)
        .where(Collection.id == collection_id)
        .where(Collection.user_id == current_user.id)
    )
    collection = collection_result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )
    
    # Verify file ownership
    file_result = await db.execute(
        select(File)
        .where(File.id == file_id)
        .where(File.user_id == current_user.id)
    )
    file = file_result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if already in collection
    existing = await db.execute(
        select(CollectionItem)
        .where(CollectionItem.collection_id == collection_id)
        .where(CollectionItem.file_id == file_id)
    )
    if existing.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File already in collection"
        )
    
    # Get max order
    max_order_result = await db.execute(
        select(func.max(CollectionItem.order))
        .where(CollectionItem.collection_id == collection_id)
    )
    max_order = max_order_result.scalar() or 0
    
    # Add to collection
    item = CollectionItem(
        collection_id=collection_id,
        file_id=file_id,
        order=max_order + 1
    )
    
    db.add(item)
    await db.commit()
    
    return {"message": "File added to collection"}