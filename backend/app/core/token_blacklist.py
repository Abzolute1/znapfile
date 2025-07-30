"""
JWT Token Blacklist Service
Implements token revocation by maintaining a blacklist in Redis
"""

import json
from datetime import datetime, timezone
from typing import Optional, Set
import redis.asyncio as redis
from app.core.config import settings


class TokenBlacklist:
    def __init__(self):
        self.redis_client = None
        self.prefix = "token_blacklist:"
        self.user_tokens_prefix = "user_tokens:"
    
    async def connect(self):
        """Initialize Redis connection"""
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
                print(f"Warning: Could not connect to Redis for token blacklist: {e}")
                self.redis_client = None
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
    
    async def add_token(self, jti: str, user_id: int, exp: datetime):
        """Add a token to the blacklist"""
        await self.connect()
        
        if not self.redis_client:
            # Redis not available, skip blacklisting
            print("Warning: Cannot add token to blacklist - Redis not available")
            return
        
        # Calculate TTL based on token expiration
        ttl = int((exp - datetime.now(timezone.utc)).total_seconds())
        
        if ttl > 0:
            # Add to blacklist with expiration
            await self.redis_client.setex(
                f"{self.prefix}{jti}",
                ttl,
                json.dumps({
                    "user_id": user_id,
                    "revoked_at": datetime.now(timezone.utc).isoformat()
                })
            )
            
            # Track token for user (for logout all functionality)
            await self.redis_client.sadd(
                f"{self.user_tokens_prefix}{user_id}",
                jti
            )
            
            # Set expiration on user token set
            await self.redis_client.expire(
                f"{self.user_tokens_prefix}{user_id}",
                ttl
            )
    
    async def is_blacklisted(self, jti: str) -> bool:
        """Check if a token is blacklisted"""
        await self.connect()
        
        if not self.redis_client:
            # Redis not available, tokens cannot be blacklisted
            return False
            
        result = await self.redis_client.exists(f"{self.prefix}{jti}")
        return bool(result)
    
    async def revoke_all_user_tokens(self, user_id: int):
        """Revoke all tokens for a specific user"""
        await self.connect()
        
        # Get all token JTIs for the user
        token_jtis = await self.redis_client.smembers(
            f"{self.user_tokens_prefix}{user_id}"
        )
        
        # Add each token to blacklist
        for jti in token_jtis:
            # Get remaining TTL
            ttl = await self.redis_client.ttl(f"{self.prefix}{jti}")
            
            if ttl > 0:
                await self.redis_client.setex(
                    f"{self.prefix}{jti}",
                    ttl,
                    json.dumps({
                        "user_id": user_id,
                        "revoked_at": datetime.now(timezone.utc).isoformat(),
                        "revoked_all": True
                    })
                )
    
    async def get_blacklist_info(self, jti: str) -> Optional[dict]:
        """Get information about a blacklisted token"""
        await self.connect()
        
        data = await self.redis_client.get(f"{self.prefix}{jti}")
        if data:
            return json.loads(data)
        return None
    
    async def cleanup_expired_entries(self):
        """Cleanup expired entries (Redis handles this automatically with TTL)"""
        # Redis automatically removes expired keys
        # This method is here for potential manual cleanup if needed
        pass


# Global instance
token_blacklist = TokenBlacklist()