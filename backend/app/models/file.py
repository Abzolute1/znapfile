from sqlalchemy import Column, String, BigInteger, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base
from app.models.user import UUID  # Import the custom UUID type


class File(Base):
    __tablename__ = "files"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    # folder_id = Column(UUID(), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=True)
    upload_ip = Column(String(45), nullable=True)
    short_code = Column(String(10), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    max_password_attempts = Column(Integer, default=10, nullable=True)  # Max password attempts (null = unlimited)
    failed_password_attempts = Column(Integer, default=0, nullable=False)  # Track failed attempts
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    download_count = Column(Integer, default=0, nullable=False)
    max_downloads = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted = Column(Boolean, default=False, nullable=False)
    
    # New metadata fields
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    allow_comments = Column(Boolean, default=True, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    parent_file_id = Column(UUID(), ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    folder_id = Column(UUID(), nullable=True)  # No FK for now since folders table might not exist
    
    # Preview redaction settings
    preview_redaction_enabled = Column(Boolean, default=False, nullable=False)
    preview_line_start = Column(Integer, nullable=True)  # Show from line X
    preview_line_end = Column(Integer, nullable=True)    # Show until line Y
    preview_redaction_patterns = Column(Text, nullable=True)  # JSON array of regex patterns to redact
    preview_blur_images = Column(Boolean, default=False, nullable=False)  # Blur images in preview
    
    # Watermark settings
    watermark_enabled = Column(Boolean, default=False, nullable=False)
    watermark_text = Column(String(100), nullable=True)  # Custom watermark text
    
    # Abuse prevention fields
    last_download_at = Column(DateTime(timezone=True), nullable=True)
    unique_downloaders = Column(Integer, default=0, nullable=False)  # Track unique IPs
    bandwidth_used = Column(BigInteger, default=0, nullable=False)  # Total bandwidth consumed
    
    # Zero-knowledge encryption fields
    client_encrypted = Column(Boolean, default=False, nullable=False)
    encryption_algorithm = Column(String(50), nullable=True)  # e.g., "AES-256-GCM"
    encrypted_metadata = Column(Text, nullable=True)  # Encrypted filename, etc.
    
    # Relationships
    user = relationship("User", backref="files")
    share_links = relationship("ShareLink", back_populates="file", cascade="all, delete-orphan")
    download_logs = relationship("DownloadLog", back_populates="file", cascade="all, delete-orphan")
    # parent_file = relationship("File", remote_side=[id], backref="versions")
    # comments = relationship("FileComment", back_populates="file", cascade="all, delete-orphan")


class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    custom_slug = Column(String(50), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    file = relationship("File", back_populates="share_links")


class DownloadLog(Base):
    __tablename__ = "download_logs"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    download_ip = Column(String(45), nullable=True)
    user_agent = Column(String, nullable=True)
    downloaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    file = relationship("File", back_populates="download_logs")


class FileComment(Base):
    __tablename__ = "file_comments"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # file = relationship("File", back_populates="comments")
    user = relationship("User", backref="file_comments")


class FileShare(Base):
    __tablename__ = "file_shares"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(), ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    shared_by_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shared_with_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String(50), default="view", nullable=False)  # view, edit, admin
    shared_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    file = relationship("File", backref="shares")
    shared_by = relationship("User", foreign_keys=[shared_by_id], backref="files_shared")
    shared_with = relationship("User", foreign_keys=[shared_with_id], backref="files_received")