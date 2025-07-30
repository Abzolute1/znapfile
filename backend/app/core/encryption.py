from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
import asyncio
from typing import Tuple, Optional
from app.core.config import settings
from app.core.key_management import master_key_manager, KeyValidation

class FileEncryption:
    """
    Handles file encryption/decryption using Fernet (AES-128 in CBC mode).
    Each file gets a unique encryption key derived from a master key and file ID.
    Uses secure key management system with key rotation support.
    """
    
    def __init__(self):
        # Verify master key is configured
        if not hasattr(settings, 'ENCRYPTION_MASTER_KEY') or not settings.ENCRYPTION_MASTER_KEY:
            raise ValueError("ENCRYPTION_MASTER_KEY not configured")
        # Key management is handled by master_key_manager
        self._key_cache = {}
    
    def generate_file_key(self, file_id: str) -> bytes:
        """Generate a unique encryption key for each file using secure key management"""
        # Check cache first
        if file_id in self._key_cache:
            return self._key_cache[file_id]
        
        # Get key from secure key management
        # Handle async in sync context
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        key = loop.run_until_complete(
            master_key_manager.get_file_encryption_key(file_id)
        )
        
        # Validate key strength
        is_valid, error = KeyValidation.validate_key_strength(key)
        if not is_valid:
            raise ValueError(f"Generated key validation failed: {error}")
        
        # Convert to Fernet-compatible format
        fernet_key = base64.urlsafe_b64encode(key[:32])  # Fernet needs exactly 32 bytes
        
        # Cache for performance
        self._key_cache[file_id] = fernet_key
        
        return fernet_key
    
    def encrypt_file(self, file_data: bytes, file_id: str) -> bytes:
        """Encrypt file data"""
        key = self.generate_file_key(file_id)
        f = Fernet(key)
        encrypted_data = f.encrypt(file_data)
        return encrypted_data
    
    def decrypt_file(self, encrypted_data: bytes, file_id: str) -> bytes:
        """Decrypt file data"""
        key = self.generate_file_key(file_id)
        f = Fernet(key)
        decrypted_data = f.decrypt(encrypted_data)
        return decrypted_data
    
    def encrypt_filename(self, filename: str, file_id: str) -> str:
        """Encrypt filename for additional privacy"""
        key = self.generate_file_key(file_id)
        f = Fernet(key)
        encrypted = f.encrypt(filename.encode())
        # Return base64 encoded string safe for filenames
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_filename(self, encrypted_filename: str, file_id: str) -> str:
        """Decrypt filename"""
        key = self.generate_file_key(file_id)
        f = Fernet(key)
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_filename.encode())
        decrypted = f.decrypt(encrypted_bytes)
        return decrypted.decode()

# Singleton instance
try:
    file_encryption = FileEncryption() if hasattr(settings, 'ENCRYPTION_MASTER_KEY') and settings.ENCRYPTION_MASTER_KEY else None
except Exception as e:
    print(f"Warning: File encryption disabled: {e}")
    file_encryption = None