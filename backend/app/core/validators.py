import os
import re
import magic
from typing import Tuple, Optional
import zipfile
import tarfile
from pydantic import BaseModel, field_validator, constr, conint
import bleach


class FileValidator:
    BLOCKED_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', 
        '.js', '.jar', '.app', '.dmg', '.pkg', '.deb', '.rpm',
        '.sh', '.bash', '.ps1', '.psm1', '.psd1', '.ps1xml', '.psc1',
        '.msi', '.dll', '.ocx', '.sys', '.drv'
    }
    
    ALLOWED_MIME_TYPES = {
        # Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        # Documents  
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        # Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        'application/x-tar', 'application/gzip',
        # Video
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
        'video/x-matroska',
        # Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a',
        # Text
        'text/plain', 'text/csv', 'text/html', 'text/css', 'text/markdown',
        # Other
        'application/json', 'application/xml'
    }
    
    FILE_SIGNATURES = {
        b'\xFF\xD8\xFF': 'image/jpeg',
        b'\x89\x50\x4E\x47': 'image/png',
        b'\x47\x49\x46\x38': 'image/gif',
        b'\x25\x50\x44\x46': 'application/pdf',
        b'\x50\x4B\x03\x04': 'application/zip',
        b'\x52\x61\x72\x21': 'application/x-rar-compressed',
        b'\x37\x7A\xBC\xAF': 'application/x-7z-compressed',
        b'\x1F\x8B': 'application/gzip',
        b'\x42\x4D': 'image/bmp',
        b'\x4D\x5A': 'application/x-msdownload',  # Executable - should be blocked
    }
    
    MAX_DECOMPRESSED_SIZE = 1024 * 1024 * 1024  # 1GB max when decompressed
    
    @classmethod
    def validate_file(cls, file_content: bytes, filename: str, claimed_mime_type: str) -> Tuple[bool, Optional[str]]:
        # Allow ALL file types - no restrictions
        # This is required to compete with WeTransfer and support any file type
        # as requested by the user
        
        # Only check for zip bombs in compressed files for safety
        try:
            mime = magic.Magic(mime=True)
            detected_mime = mime.from_buffer(file_content)
            
            if detected_mime in ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip']:
                is_safe, msg = cls._check_archive_safety(file_content, detected_mime)
                if not is_safe:
                    return False, msg
        except:
            # If magic fails, still allow the file
            pass
        
        return True, None
    
    @classmethod
    def _check_archive_safety(cls, file_content: bytes, mime_type: str) -> Tuple[bool, Optional[str]]:
        try:
            import io
            
            if mime_type == 'application/zip':
                with zipfile.ZipFile(io.BytesIO(file_content)) as zf:
                    total_size = sum(info.file_size for info in zf.infolist())
                    if total_size > cls.MAX_DECOMPRESSED_SIZE:
                        return False, "Archive decompresses to excessive size (possible zip bomb)"
                    
                    # Check for path traversal
                    for info in zf.infolist():
                        if '..' in info.filename or info.filename.startswith('/'):
                            return False, "Archive contains path traversal attempts"
                        
                        # No file extension checks - allow all file types
            
            return True, None
            
        except Exception as e:
            return False, f"Failed to analyze archive: {str(e)}"
    
    @classmethod
    def _sanitize_content(cls, content: str) -> str:
        return bleach.clean(
            content,
            tags=['b', 'i', 'u', 'em', 'strong', 'a', 'p', 'br', 'span', 'div'],
            attributes={'a': ['href', 'title']},
            strip=True
        )


class FilenameValidator:
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        # Remove path components
        filename = os.path.basename(filename)
        
        # Remove null bytes
        filename = filename.replace('\x00', '')
        
        # Replace path separators
        filename = filename.replace('/', '_').replace('\\', '_')
        
        # Allow only safe characters
        filename = re.sub(r'[^a-zA-Z0-9._\- ]', '', filename)
        
        # Prevent hidden files
        if filename.startswith('.'):
            filename = 'file_' + filename[1:]
        
        # Ensure has extension
        if '.' not in filename:
            filename += '.bin'
        
        # Limit length
        name, ext = os.path.splitext(filename)
        if len(name) > 200:
            name = name[:200]
        filename = name + ext
        
        return filename or 'unnamed_file.bin'


class PasswordValidator:
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL = True
    
    @classmethod
    def validate_password(cls, password: str, is_file_password: bool = False) -> Tuple[bool, Optional[str]]:
        # For file passwords, only check minimum length
        if is_file_password:
            if len(password) < 6:  # Minimum 6 chars for file passwords
                return False, "Password must be at least 6 characters long"
            return True, None
        
        # For user account passwords, apply full validation
        if len(password) < cls.MIN_LENGTH:
            return False, f"Password must be at least {cls.MIN_LENGTH} characters long"
        
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        
        if cls.REQUIRE_NUMBERS and not re.search(r'\d', password):
            return False, "Password must contain at least one number"
        
        if cls.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False, "Password must contain at least one special character"
        
        return True, None


# Pydantic models with validation
class FileUploadRequest(BaseModel):
    filename: constr(min_length=1, max_length=255)
    expires_in_minutes: conint(ge=30, le=10080)  # 30 min to 7 days
    password: Optional[constr(min_length=6, max_length=128)]
    
    @field_validator('filename', mode='after')
    @classmethod
    def sanitize_filename(cls, v):
        return FilenameValidator.sanitize_filename(v)
    
    @field_validator('password', mode='after')
    @classmethod
    def validate_password(cls, v):
        if v:
            # Use file password validation (less strict)
            is_valid, msg = PasswordValidator.validate_password(v, is_file_password=True)
            if not is_valid:
                raise ValueError(msg)
        return v


class UserRegisterRequest(BaseModel):
    email: constr(pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    password: constr(min_length=8, max_length=128)
    
    @field_validator('password', mode='after')
    @classmethod
    def validate_password(cls, v):
        is_valid, msg = PasswordValidator.validate_password(v)
        if not is_valid:
            raise ValueError(msg)
        return v