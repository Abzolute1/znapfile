from sqlalchemy import Column, String, ForeignKey, DateTime, Table, Text, Boolean, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base
from app.models.user import UUID

# Many-to-many association table for file tags
file_tags = Table(
    'file_tags',
    Base.metadata,
    Column('file_id', UUID(), ForeignKey('files.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', UUID(), ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

# Many-to-many association table for shared folders
shared_folders = Table(
    'shared_folders',
    Base.metadata,
    Column('folder_id', UUID(), ForeignKey('folders.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', UUID(), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('permission', String(50), default='view'),  # view, edit, admin
    Column('shared_at', DateTime(timezone=True), server_default=func.now())
)


class Folder(Base):
    __tablename__ = "folders"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(UUID(), ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    path = Column(String(1000), nullable=False)  # Full path for easier queries
    color = Column(String(7), nullable=True)  # Hex color for UI
    icon = Column(String(50), nullable=True)  # Icon identifier
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", backref="owned_folders", foreign_keys=[user_id])
    parent = relationship("Folder", remote_side=[id], backref="children")
    # files = relationship("File", backref="folder", cascade="all, delete-orphan")
    shared_with = relationship("User", secondary=shared_folders, backref="shared_folders")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    color = Column(String(7), nullable=True)  # Hex color
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="tags")
    files = relationship("File", secondary=file_tags, backref="tags")


class Collection(Base):
    __tablename__ = "collections"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    readme_content = Column(Text, nullable=True)  # Markdown README
    icon = Column(String(50), nullable=True)  # Icon identifier
    color = Column(String(7), nullable=True)  # Hex color
    is_public = Column(Boolean, default=False)
    password_hash = Column(String(255), nullable=True)
    allow_delete = Column(Boolean, default=False)  # Allow viewers to delete files
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    folders = Column(JSON, default=lambda: [])  # List of created folder paths
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Collection expiry
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)  # Track last access
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", backref="collections")
    items = relationship("CollectionItem", backref="collection", cascade="all, delete-orphan")


class CollectionItem(Base):
    __tablename__ = "collection_items"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    collection_id = Column(UUID(), ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    file_id = Column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    path = Column(String(500), nullable=True)  # Virtual path within collection
    order = Column(Integer, default=0)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    file = relationship("File", backref="collection_items")