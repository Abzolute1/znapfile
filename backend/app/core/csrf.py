"""CSRF Protection for FastAPI"""
import secrets
import time
from typing import Optional
from fastapi import HTTPException, Request, Response
from fastapi.security import HTTPBearer
import hashlib
import hmac

class CSRFProtect:
    def __init__(self, secret_key: str, token_expiry: int = 3600):
        self.secret_key = secret_key.encode()
        self.token_expiry = token_expiry
        self.bearer = HTTPBearer(auto_error=False)
    
    def generate_csrf_token(self, session_id: str) -> str:
        """Generate a CSRF token for a session"""
        timestamp = str(int(time.time()))
        message = f"{session_id}:{timestamp}".encode()
        signature = hmac.new(self.secret_key, message, hashlib.sha256).hexdigest()
        return f"{session_id}:{timestamp}:{signature}"
    
    def verify_csrf_token(self, token: str, session_id: str) -> bool:
        """Verify a CSRF token"""
        try:
            parts = token.split(":")
            if len(parts) != 3:
                return False
            
            token_session, timestamp, signature = parts
            
            # Check session matches
            if token_session != session_id:
                return False
            
            # Check token expiry
            token_time = int(timestamp)
            current_time = int(time.time())
            if current_time - token_time > self.token_expiry:
                return False
            
            # Verify signature
            message = f"{token_session}:{timestamp}".encode()
            expected_signature = hmac.new(self.secret_key, message, hashlib.sha256).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except:
            return False
    
    def get_csrf_cookie(self, request: Request) -> Optional[str]:
        """Get CSRF token from cookie"""
        return request.cookies.get("csrf_token")
    
    def get_csrf_header(self, request: Request) -> Optional[str]:
        """Get CSRF token from header"""
        return request.headers.get("X-CSRF-Token")
    
    async def validate_csrf(self, request: Request):
        """Validate CSRF token for state-changing requests"""
        # Skip CSRF for safe methods
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return
        
        # Skip for API endpoints that use Bearer auth
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return
        
        # Get session ID from cookie
        session_id = request.cookies.get("session_id")
        if not session_id:
            raise HTTPException(status_code=403, detail="No session found")
        
        # Get CSRF token from header
        csrf_token = self.get_csrf_header(request)
        if not csrf_token:
            raise HTTPException(status_code=403, detail="CSRF token missing")
        
        # Verify token
        if not self.verify_csrf_token(csrf_token, session_id):
            raise HTTPException(status_code=403, detail="Invalid CSRF token")
    
    def set_csrf_cookie(self, response: Response, session_id: str):
        """Set CSRF token in cookie"""
        token = self.generate_csrf_token(session_id)
        response.set_cookie(
            key="csrf_token",
            value=token,
            httponly=False,  # JavaScript needs to read this
            secure=True,
            samesite="strict",
            max_age=self.token_expiry
        )
        return token