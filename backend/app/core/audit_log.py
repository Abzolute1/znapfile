"""Security audit logging system"""
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from sqlalchemy import Column, String, DateTime, JSON, Integer
from sqlalchemy.sql import func
from app.db.base import Base

class AuditEventType(str, Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    FILE_DELETE = "file_delete"
    PASSWORD_ATTEMPT_FAILED = "password_attempt_failed"
    FILE_LOCKED = "file_locked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    CSRF_VIOLATION = "csrf_violation"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    CAPTCHA_FAILED = "captcha_failed"
    TOKEN_REUSE = "token_reuse"

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(500), nullable=True)
    resource_id = Column(String(100), nullable=True)  # file_id, etc
    details = Column(JSON, nullable=True)
    severity = Column(String(20), default="info")  # info, warning, critical
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class SecurityAuditor:
    def __init__(self):
        self.logger = logging.getLogger("security_audit")
        handler = logging.FileHandler("security_audit.log")
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    async def log_event(
        self,
        db,
        event_type: AuditEventType,
        ip_address: str,
        user_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "info"
    ):
        """Log security event to database and file"""
        # Create audit log entry
        audit_log = AuditLog(
            event_type=event_type.value,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_id=resource_id,
            details=details or {},
            severity=severity
        )
        
        db.add(audit_log)
        await db.commit()
        
        # Also log to file
        log_message = f"[{severity.upper()}] {event_type.value} - IP: {ip_address}"
        if user_id:
            log_message += f" - User: {user_id}"
        if resource_id:
            log_message += f" - Resource: {resource_id}"
        if details:
            log_message += f" - Details: {json.dumps(details)}"
        
        if severity == "critical":
            self.logger.critical(log_message)
        elif severity == "warning":
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    async def detect_suspicious_patterns(self, db, ip_address: str) -> bool:
        """Detect suspicious activity patterns"""
        # Check for multiple failed attempts from same IP
        from sqlalchemy import select, and_
        from datetime import datetime, timedelta
        
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        result = await db.execute(
            select(AuditLog).where(
                and_(
                    AuditLog.ip_address == ip_address,
                    AuditLog.event_type.in_([
                        AuditEventType.LOGIN_FAILED.value,
                        AuditEventType.PASSWORD_ATTEMPT_FAILED.value,
                        AuditEventType.UNAUTHORIZED_ACCESS.value
                    ]),
                    AuditLog.created_at > one_hour_ago
                )
            )
        )
        
        failed_attempts = len(result.scalars().all())
        
        # If more than 10 failed attempts in an hour, it's suspicious
        if failed_attempts > 10:
            await self.log_event(
                db,
                AuditEventType.SUSPICIOUS_ACTIVITY,
                ip_address,
                details={"reason": f"Multiple failed attempts: {failed_attempts} in last hour"},
                severity="critical"
            )
            return True
        
        return False

# Global auditor instance
security_auditor = SecurityAuditor()