import secrets
import hashlib
import time
import os
from typing import Tuple
import magic
import mimetypes


def generate_short_code() -> str:
    """Generate cryptographically secure short code"""
    return secrets.token_urlsafe(8)[:10]


def generate_stored_filename(original_filename: str) -> str:
    """Generate unguessable filename"""
    timestamp = int(time.time())
    random_str = secrets.token_urlsafe(16)
    extension = os.path.splitext(original_filename)[1]
    
    # Hash to prevent enumeration
    filename_hash = hashlib.sha256(
        f"{timestamp}{random_str}{original_filename}".encode()
    ).hexdigest()[:16]
    
    return f"{timestamp}_{filename_hash}{extension}"


def validate_file_type(file_content: bytes, filename: str) -> Tuple[bool, str]:
    mime = magic.Magic(mime=True)
    detected_mime = mime.from_buffer(file_content)
    
    guessed_mime = mimetypes.guess_type(filename)[0]