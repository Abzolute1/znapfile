from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base
from app.models.user import UUID


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # Null = global notification
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, warning, success, error
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(UUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    created_by = relationship("User", foreign_keys=[created_by_id])