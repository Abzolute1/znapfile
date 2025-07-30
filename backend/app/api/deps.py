from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.user import User
from app.core.security import decode_token
from app.core.token_blacklist import token_blacklist
import redis.asyncio as redis
from app.core.config import settings

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        return None
    
    # Check if token is blacklisted
    jti = payload.get("jti")
    if jti:
        try:
            if await token_blacklist.is_blacklisted(jti):
                return None
        except Exception as e:
            print(f"Warning: Error checking token blacklist: {e}")
            # Continue without blacklist check if Redis is down
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    return user


async def require_user(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


async def get_redis() -> redis.Redis:
    """Get Redis connection for dependency injection"""
    return await redis.from_url(settings.REDIS_URL, decode_responses=True)