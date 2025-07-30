"""Secure download token system"""
import secrets
import time
import hashlib
from typing import Optional, Dict
from datetime import datetime, timedelta

class DownloadTokenManager:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.tokens = {}  # In production, use Redis with TTL
        self.token_expiry = 60  # 1 minute expiry for download tokens
        
    def create_download_token(self, file_id: str, user_ip: str, password_verified: bool = False) -> str:
        """Create a single-use download token"""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        self.tokens[token_hash] = {
            'file_id': file_id,
            'user_ip': user_ip,
            'password_verified': password_verified,
            'created_at': time.time(),
            'used': False
        }
        
        # Cleanup old tokens
        self._cleanup_expired()
        
        return token
    
    def verify_download_token(self, token: str, file_id: str, user_ip: str) -> bool:
        """Verify and consume a download token"""
        if not token:
            return False
            
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        token_data = self.tokens.get(token_hash)
        
        if not token_data:
            return False
        
        # Check if already used
        if token_data['used']:
            return False
        
        # Check expiry
        if time.time() - token_data['created_at'] > self.token_expiry:
            del self.tokens[token_hash]
            return False
        
        # Verify file_id matches
        if token_data['file_id'] != file_id:
            return False
        
        # Verify IP matches (optional, can be disabled for VPN users)
        if token_data['user_ip'] != user_ip:
            # Log this as potential token sharing
            return False
        
        # Mark as used (single-use token)
        token_data['used'] = True
        
        return True
    
    def get_token_data(self, token: str) -> Optional[Dict]:
        """Get token data without consuming it"""
        if not token:
            return None
            
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        return self.tokens.get(token_hash)
    
    def _cleanup_expired(self):
        """Remove expired or used tokens"""
        current_time = time.time()
        expired_keys = []
        
        for token_hash, data in self.tokens.items():
            if data['used'] or (current_time - data['created_at'] > self.token_expiry):
                expired_keys.append(token_hash)
        
        for key in expired_keys:
            del self.tokens[key]

# Global instance
download_token_manager = None

def get_download_token_manager(secret_key: str) -> DownloadTokenManager:
    """Get or create download token manager"""
    global download_token_manager
    if download_token_manager is None:
        download_token_manager = DownloadTokenManager(secret_key)
    return download_token_manager