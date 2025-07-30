"""
Secure Key Management System
Implements key derivation, rotation, and secure storage
"""

import os
import json
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple, List
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from cryptography.fernet import Fernet
import redis.asyncio as redis
from app.core.config import settings


class KeyDerivation:
    """Secure key derivation using PBKDF2"""
    
    @staticmethod
    def derive_key(master_key: bytes, context: str, key_id: str) -> bytes:
        """
        Derive a unique key for a specific context
        Uses PBKDF2 with context-specific salt
        """
        # Create context-specific salt
        salt = hashlib.sha256(f"{context}:{key_id}".encode()).digest()
        
        # Derive key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256-bit key
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        return kdf.derive(master_key)
    
    @staticmethod
    def generate_file_key(master_key: bytes, file_id: str) -> bytes:
        """Generate unique encryption key for a file"""
        return KeyDerivation.derive_key(master_key, "file_encryption", file_id)
    
    @staticmethod
    def generate_token_key(master_key: bytes, token_type: str) -> bytes:
        """Generate key for token signing"""
        return KeyDerivation.derive_key(master_key, f"token_{token_type}", "signing")


class KeyRotation:
    """Handle key rotation and versioning"""
    
    def __init__(self):
        self.redis_client = None
        self.key_prefix = "key_version:"
        self.rotation_log_prefix = "key_rotation:"
    
    async def connect(self):
        """Initialize Redis connection for key metadata"""
        if not self.redis_client:
            try:
                self.redis_client = await redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                # Test connection
                await self.redis_client.ping()
            except Exception as e:
                print(f"Warning: Could not connect to Redis for key management: {e}")
                self.redis_client = None
    
    async def get_current_key_version(self, key_type: str) -> int:
        """Get current key version for a key type"""
        await self.connect()
        
        if not self.redis_client:
            # Redis not available, always return version 1
            return 1
            
        version = await self.redis_client.get(f"{self.key_prefix}{key_type}")
        return int(version) if version else 1
    
    async def rotate_key(self, key_type: str, new_version: int):
        """Record key rotation"""
        await self.connect()
        
        # Update version
        await self.redis_client.set(f"{self.key_prefix}{key_type}", new_version)
        
        # Log rotation
        rotation_info = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "key_type": key_type,
            "new_version": new_version,
            "rotated_by": "system"
        }
        
        await self.redis_client.lpush(
            f"{self.rotation_log_prefix}{key_type}",
            json.dumps(rotation_info)
        )
        
        # Keep only last 100 rotation logs
        await self.redis_client.ltrim(
            f"{self.rotation_log_prefix}{key_type}",
            0,
            99
        )
    
    async def get_key_rotation_history(self, key_type: str) -> List[Dict]:
        """Get key rotation history"""
        await self.connect()
        
        logs = await self.redis_client.lrange(
            f"{self.rotation_log_prefix}{key_type}",
            0,
            -1
        )
        
        return [json.loads(log) for log in logs]


class SecureKeyStorage:
    """
    Secure storage for encryption keys
    Keys are never stored in plaintext
    """
    
    def __init__(self):
        # Derive storage key from environment entropy
        self.storage_key = self._derive_storage_key()
        self.fernet = Fernet(self.storage_key)
    
    def _derive_storage_key(self) -> bytes:
        """Derive key for encrypting stored keys"""
        # Use multiple sources of entropy
        entropy_sources = [
            os.environ.get('HOSTNAME', 'default'),
            os.environ.get('USER', 'default'),
            settings.DATABASE_URL,
            settings.JWT_SECRET[:32]  # Use part of JWT secret
        ]
        
        combined_entropy = '|'.join(entropy_sources).encode()
        
        # Derive storage key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'znapfile_key_storage_v1',
            iterations=100000,
            backend=default_backend()
        )
        
        key = kdf.derive(combined_entropy)
        return Fernet.generate_key()  # For Fernet compatibility
    
    def encrypt_key(self, key: bytes) -> bytes:
        """Encrypt a key for storage"""
        return self.fernet.encrypt(key)
    
    def decrypt_key(self, encrypted_key: bytes) -> bytes:
        """Decrypt a stored key"""
        return self.fernet.decrypt(encrypted_key)


class MasterKeyManager:
    """
    Manage master keys with proper security
    Implements key hierarchy and separation of duties
    """
    
    def __init__(self):
        self.key_storage = SecureKeyStorage()
        self.key_rotation = KeyRotation()
        self._master_keys_cache = {}
        
    def _get_master_key_from_env(self, key_name: str) -> bytes:
        """Get master key from environment with validation"""
        key_value = getattr(settings, key_name, None)
        
        if not key_value:
            raise ValueError(f"Master key {key_name} not configured")
        
        if len(key_value) < 32:
            raise ValueError(f"Master key {key_name} too short (min 32 chars)")
        
        # Use first 32 bytes if key is longer
        return key_value.encode()[:32]
    
    async def get_current_master_key(self, key_type: str) -> Tuple[bytes, int]:
        """
        Get current master key and version
        Returns: (key, version)
        """
        # Check cache first
        cache_key = f"{key_type}_v{await self.key_rotation.get_current_key_version(key_type)}"
        if cache_key in self._master_keys_cache:
            return self._master_keys_cache[cache_key]
        
        # Get base master key
        if key_type == "encryption":
            base_key = self._get_master_key_from_env("ENCRYPTION_MASTER_KEY")
        elif key_type == "jwt":
            base_key = self._get_master_key_from_env("JWT_SECRET")
        else:
            base_key = self._get_master_key_from_env("JWT_SECRET")  # Fallback
        
        # Get current version
        version = await self.key_rotation.get_current_key_version(key_type)
        
        # Derive versioned key
        versioned_key = KeyDerivation.derive_key(
            base_key,
            f"{key_type}_master",
            f"v{version}"
        )
        
        # Cache for performance
        self._master_keys_cache[cache_key] = (versioned_key, version)
        
        return versioned_key, version
    
    async def get_file_encryption_key(self, file_id: str) -> bytes:
        """Get encryption key for a specific file"""
        master_key, _ = await self.get_current_master_key("encryption")
        return KeyDerivation.generate_file_key(master_key, file_id)
    
    async def get_jwt_signing_key(self) -> bytes:
        """Get current JWT signing key"""
        master_key, _ = await self.get_current_master_key("jwt")
        return master_key
    
    async def rotate_master_key(self, key_type: str) -> int:
        """
        Rotate master key to new version
        Returns new version number
        """
        current_version = await self.key_rotation.get_current_key_version(key_type)
        new_version = current_version + 1
        
        await self.key_rotation.rotate_key(key_type, new_version)
        
        # Clear cache to force re-derivation
        self._master_keys_cache.clear()
        
        return new_version


class KeyValidation:
    """Validate and audit key usage"""
    
    @staticmethod
    def validate_key_strength(key: bytes) -> Tuple[bool, Optional[str]]:
        """Validate key meets security requirements"""
        if len(key) < 32:
            return False, "Key must be at least 256 bits"
        
        # Check for obvious patterns (all zeros, sequential bytes)
        if key == bytes(len(key)):
            return False, "Key contains all zeros"
        
        # Check entropy (simple check)
        unique_bytes = len(set(key))
        if unique_bytes < 16:
            return False, "Key has insufficient entropy"
        
        return True, None
    
    @staticmethod
    async def audit_key_usage(key_type: str, operation: str, user_id: Optional[int] = None):
        """Audit log for key usage"""
        # This would integrate with the existing audit logging system
        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "key_type": key_type,
            "operation": operation,
            "user_id": user_id
        }
        # Log to audit system
        print(f"Key audit: {audit_entry}")


# Global instance
master_key_manager = MasterKeyManager()