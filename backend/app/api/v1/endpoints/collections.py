from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from uuid import UUID
import re
from datetime import datetime, timedelta, timezone
import zipfile
import tempfile
from fastapi.responses import FileResponse
import os
from app.db.base import get_db
from app.models.folder import Collection, CollectionItem
from app.models.file import File
from app.models.user import User
from app.schemas.collection import (
    CollectionCreate, CollectionUpdate, CollectionResponse, 
    CollectionDetailResponse, AddFilesToCollection, ReorderFiles,
    FileInCollection, CreateFolder
)
from app.api.deps import get_current_user
from app.core.security import get_password_hash, verify_password
from app.core.rate_limiting import limiter

router = APIRouter()


def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from collection name"""
    slug = re.sub(r'[^\w\s-]', '', name.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug[:50]


def build_file_tree(files: List[FileInCollection], folders: List[str] = None) -> dict:
    """Build hierarchical file tree from flat list"""
    tree = {"folders": {}, "files": []}
    
    # First, create all empty folders
    if folders:
        for folder_path in folders:
            if folder_path:
                parts = folder_path.split('/')
                current = tree
                
                for part in parts:
                    if part and part.strip():
                        if part not in current["folders"]:
                            current["folders"][part] = {"folders": {}, "files": []}
                        current = current["folders"][part]
    
    # Then add files
    for file in files:
        # If file has a path, it means it's in a folder
        if file.path:
            parts = file.path.split('/')
            current = tree
            
            # Navigate/create folders for the path
            for i, part in enumerate(parts):
                if part and part.strip():  # Skip empty parts
                    if part not in current["folders"]:
                        current["folders"][part] = {"folders": {}, "files": []}
                    current = current["folders"][part]
            
            # Add file to the deepest folder
            current["files"].append({
                "id": str(file.id),
                "name": file.original_filename,
                "size": file.file_size,
                "type": file.mime_type,
                "short_code": file.short_code if hasattr(file, 'short_code') else None,
                "description": file.description,
                "downloads": file.download_count
            })
        else:
            # File is at root level
            tree["files"].append({
                "id": str(file.id),
                "name": file.original_filename,
                "size": file.file_size,
                "type": file.mime_type,
                "short_code": file.short_code if hasattr(file, 'short_code') else None,
                "description": file.description,
                "downloads": file.download_count
            })
    
    return tree


@router.post("/", response_model=CollectionResponse)
@limiter.limit("10/hour")
async def create_collection(
    request: Request,
    collection_data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new collection/project"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Generate unique slug
    base_slug = generate_slug(collection_data.name)
    slug = base_slug
    counter = 1
    
    while True:
        existing = await db.execute(
            select(Collection).where(Collection.slug == slug)
        )
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Create collection
    collection = Collection(
        user_id=current_user.id,
        name=collection_data.name,
        slug=slug,
        description=collection_data.description,
        readme_content=collection_data.readme_content,
        icon=collection_data.icon,
        color=collection_data.color,
        is_public=collection_data.is_public,
        password_hash=get_password_hash(collection_data.password) if collection_data.password else None,
        allow_delete=collection_data.allow_delete,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=collection_data.expires_in_hours) if collection_data.expires_in_hours else None
    )
    
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        slug=collection.slug,
        description=collection.description,
        readme_content=collection.readme_content,
        icon=collection.icon,
        color=collection.color,
        is_public=collection.is_public,
        has_password=bool(collection.password_hash),
        allow_delete=collection.allow_delete,
        view_count=collection.view_count,
        download_count=collection.download_count,
        file_count=0,
        total_size=0,
        expires_at=collection.expires_at,
        last_accessed_at=collection.last_accessed_at,
        created_at=collection.created_at,
        updated_at=collection.updated_at
    )


@router.get("/", response_model=List[CollectionResponse])
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    """List user's collections"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    collections = result.scalars().all()
    
    # Get file counts and sizes
    collection_responses = []
    for collection in collections:
        file_count_result = await db.execute(
            select(func.count(CollectionItem.file_id))
            .where(CollectionItem.collection_id == collection.id)
        )
        file_count = file_count_result.scalar() or 0
        
        total_size_result = await db.execute(
            select(func.sum(File.file_size))
            .join(CollectionItem, CollectionItem.file_id == File.id)
            .where(CollectionItem.collection_id == collection.id)
        )
        total_size = total_size_result.scalar() or 0
        
        collection_responses.append(CollectionResponse(
            id=collection.id,
            name=collection.name,
            slug=collection.slug,
            description=collection.description,
            readme_content=collection.readme_content,
            icon=collection.icon,
            color=collection.color,
            is_public=collection.is_public,
            has_password=bool(collection.password_hash),
            allow_delete=collection.allow_delete,
            view_count=collection.view_count,
            download_count=collection.download_count,
            file_count=file_count,
            total_size=total_size,
            expires_at=collection.expires_at,
            last_accessed_at=collection.last_accessed_at,
            created_at=collection.created_at,
            updated_at=collection.updated_at
        ))
    
    return collection_responses


@router.get("/{slug}", response_model=CollectionDetailResponse)
async def get_collection(
    slug: str,
    password: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get collection details with file tree"""
    result = await db.execute(
        select(Collection).where(Collection.slug == slug)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check access permissions
    if not collection.is_public and collection.user_id != (current_user.id if current_user else None):
        if not password or not collection.password_hash:
            raise HTTPException(status_code=403, detail="Access denied")
        if not verify_password(password, collection.password_hash):
            raise HTTPException(status_code=403, detail="Invalid password")
    
    # Check if collection is expired (after permission check to avoid info leak)
    if collection.expires_at and collection.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Collection has expired")
    
    # Increment view count and update last accessed
    collection.view_count += 1
    collection.last_accessed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(collection)
    
    # Get files in collection
    files_result = await db.execute(
        select(
            File.id,
            File.original_filename,
            File.file_size,
            File.mime_type,
            File.description,
            File.download_count,
            File.short_code,
            CollectionItem.path,
            CollectionItem.order,
            CollectionItem.added_at
        )
        .join(CollectionItem, CollectionItem.file_id == File.id)
        .where(CollectionItem.collection_id == collection.id)
        .order_by(CollectionItem.order, CollectionItem.path)
    )
    
    files = [
        FileInCollection(
            id=row[0],
            original_filename=row[1],
            file_size=row[2],
            mime_type=row[3],
            description=row[4],
            download_count=row[5],
            short_code=row[6],
            path=row[7] or "",
            order=row[8],
            added_at=row[9]
        )
        for row in files_result
    ]
    
    file_tree = build_file_tree(files, collection.folders if collection.folders is not None else [])
    
    return CollectionDetailResponse(
        id=collection.id,
        name=collection.name,
        slug=collection.slug,
        description=collection.description,
        readme_content=collection.readme_content,
        icon=collection.icon,
        color=collection.color,
        is_public=collection.is_public,
        has_password=bool(collection.password_hash),
        allow_delete=collection.allow_delete,
        view_count=collection.view_count,
        download_count=collection.download_count,
        file_count=len(files),
        total_size=sum(f.file_size for f in files),
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        files=files,
        file_tree=file_tree
    )


@router.post("/{collection_id}/files")
async def add_files_to_collection(
    collection_id: UUID,
    files_data: AddFilesToCollection,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add files to a collection"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify collection ownership
    result = await db.execute(
        select(Collection).where(
            and_(
                Collection.id == collection_id,
                Collection.user_id == current_user.id
            )
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Verify file ownership
    files_result = await db.execute(
        select(File).where(
            and_(
                File.id.in_(files_data.file_ids),
                File.user_id == current_user.id
            )
        )
    )
    files = files_result.scalars().all()
    
    if len(files) != len(files_data.file_ids):
        raise HTTPException(status_code=404, detail="Some files not found")
    
    # Add files to collection
    for i, file in enumerate(files):
        path = files_data.paths.get(str(file.id), "") if files_data.paths else ""
        
        # Check if already in collection
        existing = await db.execute(
            select(CollectionItem).where(
                and_(
                    CollectionItem.collection_id == collection_id,
                    CollectionItem.file_id == file.id
                )
            )
        )
        
        if not existing.scalar():
            new_item = CollectionItem(
                collection_id=collection_id,
                file_id=file.id,
                path=path,
                order=i
            )
            db.add(new_item)
    
    await db.commit()
    
    return {"message": f"Added {len(files)} files to collection"}


@router.delete("/{collection_id}/files/{file_id}")
async def remove_file_from_collection(
    collection_id: UUID,
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = None
):
    """Remove a file from a collection (owner or viewer with allow_delete)"""
    # Get collection
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check if user is owner
    is_owner = current_user and collection.user_id == current_user.id
    
    # If not owner, check if deletion is allowed and password is correct
    if not is_owner:
        if not collection.allow_delete:
            raise HTTPException(status_code=403, detail="Deletion not allowed for this collection")
        
        if not collection.password_hash or not password:
            raise HTTPException(status_code=401, detail="Password required")
        
        if not verify_password(password, collection.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
    
    # Remove file from collection
    result = await db.execute(
        select(CollectionItem).where(
            and_(
                CollectionItem.collection_id == collection_id,
                CollectionItem.file_id == file_id
            )
        )
    )
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
        return {"message": "File removed from collection"}
    else:
        raise HTTPException(status_code=404, detail="File not found in collection")


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: UUID,
    update_data: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update collection details"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await db.execute(
        select(Collection).where(
            and_(
                Collection.id == collection_id,
                Collection.user_id == current_user.id
            )
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    
    if "password" in update_dict:
        password = update_dict.pop("password")
        collection.password_hash = get_password_hash(password) if password else None
    
    if "expires_in_hours" in update_dict:
        expires_in_hours = update_dict.pop("expires_in_hours")
        if expires_in_hours:
            collection.expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        else:
            collection.expires_at = None
    
    for field, value in update_dict.items():
        setattr(collection, field, value)
    
    await db.commit()
    await db.refresh(collection)
    
    # Get file count and size
    file_count_result = await db.execute(
        select(func.count(CollectionItem.file_id))
        .where(CollectionItem.collection_id == collection.id)
    )
    file_count = file_count_result.scalar() or 0
    
    total_size_result = await db.execute(
        select(func.sum(File.file_size))
        .join(CollectionItem, CollectionItem.file_id == File.id)
        .where(CollectionItem.collection_id == collection.id)
    )
    total_size = total_size_result.scalar() or 0
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        slug=collection.slug,
        description=collection.description,
        readme_content=collection.readme_content,
        icon=collection.icon,
        color=collection.color,
        is_public=collection.is_public,
        has_password=bool(collection.password_hash),
        allow_delete=collection.allow_delete,
        view_count=collection.view_count,
        download_count=collection.download_count,
        file_count=file_count,
        total_size=total_size,
        created_at=collection.created_at,
        updated_at=collection.updated_at
    )


@router.post("/{collection_id}/folders")
async def create_folder(
    collection_id: UUID,
    folder_data: CreateFolder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a folder within a collection"""
    print(f"Creating folder - Collection ID: {collection_id}, Path: {folder_data.path}, Name: {folder_data.name}")
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify collection ownership
    result = await db.execute(
        select(Collection).where(
            and_(
                Collection.id == collection_id,
                Collection.user_id == current_user.id
            )
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Clean the path and name
    # The path from frontend is either empty for root or contains parent folder path
    base_path = folder_data.path.strip('/ \t')
    folder_name = folder_data.name.strip()
    
    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty")
    
    # Construct the full path
    if base_path and base_path != ".":  # Check for empty or root path
        full_path = f"{base_path}/{folder_name}"
    else:
        full_path = folder_name
    
    # Initialize folders if None (for newly created collections)
    if collection.folders is None:
        collection.folders = []
    
    # Get existing folders
    existing_folders = list(collection.folders)  # Make a copy
    
    # Check if folder already exists
    if full_path in existing_folders:
        return {"message": "Folder already exists", "path": full_path}
    
    # Create a set to avoid duplicates
    folders_set = set(existing_folders)
    
    # Add the new folder path
    folders_set.add(full_path)
    
    # Also add parent folders if they don't exist
    if base_path and base_path != ".":
        parts = base_path.split('/')
        for i in range(len(parts)):
            parent_path = '/'.join(parts[:i+1])
            if parent_path:  # Skip empty strings
                folders_set.add(parent_path)
    
    # Update collection folders
    collection.folders = sorted(list(folders_set))
    
    try:
        await db.commit()
        await db.refresh(collection)
        print(f"Folder created successfully: {full_path}, all folders: {collection.folders}")
        return {
            "message": "Folder created successfully",
            "path": full_path
        }
    except Exception as e:
        print(f"Error creating folder: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create folder: {str(e)}")


@router.get("/{collection_id}/download-all")
async def download_collection_zip(
    collection_id: UUID,
    password: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download all files in a collection as a zip"""
    from io import BytesIO
    import zipfile
    from fastapi.responses import StreamingResponse
    
    # Get collection
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check access permissions
    if not collection.is_public and collection.user_id != (current_user.id if current_user else None):
        if not password or not collection.password_hash:
            raise HTTPException(status_code=403, detail="Access denied")
        if not verify_password(password, collection.password_hash):
            raise HTTPException(status_code=403, detail="Invalid password")
    
    # Get all files in collection
    files_result = await db.execute(
        select(File, CollectionItem.path)
        .join(CollectionItem, CollectionItem.file_id == File.id)
        .where(CollectionItem.collection_id == collection.id)
        .order_by(CollectionItem.path)
    )
    
    files_data = [(file, path) for file, path in files_result]
    
    if not files_data:
        raise HTTPException(status_code=404, detail="No files in collection")
    
    
    # Create zip file in memory
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        from app.services.storage import storage_service
        
        for file, path in files_data:
            try:
                # Get file data from storage
                file_data = await storage_service.download_file(
                    file.stored_filename
                )
                
                if not file_data:
                    continue
                
                # Determine file path in zip
                if path:
                    zip_path = f"{path}/{file.original_filename}"
                else:
                    zip_path = file.original_filename
                
                # Add file to zip
                zip_file.writestr(zip_path, file_data)
                
            except Exception as e:
                # Log error but continue with other files
                continue
    
    # Prepare zip for download
    zip_buffer.seek(0)
    
    # Increment download count
    collection.download_count += 1
    await db.commit()
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{collection.slug}.zip"'
        }
    )


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a collection (files remain intact)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await db.execute(
        select(Collection).where(
            and_(
                Collection.id == collection_id,
                Collection.user_id == current_user.id
            )
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    await db.delete(collection)
    await db.commit()
    
    return {"message": "Collection deleted successfully"}


@router.get("/{collection_id}/download-all")
async def download_collection_as_zip(
    collection_id: UUID,
    password: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download all files in a collection as a ZIP archive"""
    # Get collection
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check if collection is expired
    if collection.expires_at and collection.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Collection has expired")
    
    # Check access permissions
    if not collection.is_public and collection.user_id != (current_user.id if current_user else None):
        if not password or not collection.password_hash:
            raise HTTPException(status_code=403, detail="Access denied")
        if not verify_password(password, collection.password_hash):
            raise HTTPException(status_code=403, detail="Invalid password")
    
    # Get all files in collection
    files_result = await db.execute(
        select(File, CollectionItem.path)
        .join(CollectionItem, CollectionItem.file_id == File.id)
        .where(CollectionItem.collection_id == collection.id)
        .order_by(CollectionItem.order)
    )
    files_with_paths = files_result.all()
    
    if not files_with_paths:
        raise HTTPException(status_code=404, detail="No files in collection")
    
    # Update download count
    collection.download_count += 1
    await db.commit()
    
    # Create temporary ZIP file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_zip:
        zip_path = tmp_zip.name
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file, virtual_path in files_with_paths:
                # Get actual file path
                file_path = file.file_path
                
                # Determine archive name
                if virtual_path:
                    # Use virtual path structure
                    archive_name = f"{virtual_path}/{file.original_filename}"
                else:
                    # File at root level
                    archive_name = file.original_filename
                
                # Add file to ZIP
                if os.path.exists(file_path):
                    zipf.write(file_path, arcname=archive_name)
                    
                    # Update individual file download count
                    file.download_count += 1
            
            # Add README if exists
            if collection.readme_content:
                zipf.writestr("README.md", collection.readme_content)
        
        await db.commit()
        
        # Return ZIP file
        zip_filename = f"{collection.slug}.zip"
        return FileResponse(
            zip_path,
            media_type='application/zip',
            filename=zip_filename,
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"'
            }
        )


