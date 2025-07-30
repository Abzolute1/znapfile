from datetime import datetime, timedelta, timezone
from typing import Optional, Union
import secrets
import asyncio
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    # Add unique token ID for revocation
    jti = secrets.token_urlsafe(32)
    to_encode.update({
        "exp": expire,
        "jti": jti,
        "type": "access"
    })
    
    # Use JWT_SECRET directly for now
    # TODO: Fix async key management integration
    signing_key = settings.JWT_SECRET.encode()
    
    encoded_jwt = jwt.encode(to_encode, signing_key, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRATION_DAYS)
    
    # Add unique token ID for revocation
    jti = secrets.token_urlsafe(32)
    to_encode.update({
        "exp": expire,
        "jti": jti,
        "type": "refresh"
    })
    
    # Use JWT_SECRET directly for now
    # TODO: Fix async key management integration
    signing_key = settings.JWT_SECRET.encode()
    
    encoded_jwt = jwt.encode(to_encode, signing_key, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        # Get signing key from key management or fallback
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        try:
            signing_key = loop.run_until_complete(
                master_key_manager.get_jwt_signing_key()
            )
        except Exception as e:
            print(f"Warning: Could not get key from key management: {e}")
            # Fallback to config JWT_SECRET
            signing_key = settings.JWT_SECRET.encode()
        
        payload = jwt.decode(token, signing_key, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None