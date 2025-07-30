from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
import redis
from app.core.config import settings

# Create Redis connection for rate limiting (optional)
try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping()
    storage_uri = settings.REDIS_URL
except:
    redis_client = None
    storage_uri = None  # Will use in-memory storage

# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour"],
    storage_uri=storage_uri
)

# Custom key function for authenticated users
async def get_user_id_or_ip(request: Request) -> str:
    # Try to extract user ID from JWT token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            from app.core.security import decode_token
            payload = decode_token(token)
            if payload and "sub" in payload:
                return f"user:{payload['sub']}"
        except:
            pass
    
    # Fall back to IP address
    return get_remote_address(request)

# Rate limit configurations
RATE_LIMITS = {
    "auth_login": "5 per minute",
    "auth_register": "3 per hour", 
    "upload_anonymous": "10 per hour",
    "upload_authenticated": "100 per hour",
    "download": "100 per minute",
    "download_password_protected": "10 per minute",  # Much stricter for password files
    "password_attempt": "5 per minute",  # Limit password attempts
    "forgot_password": "3 per hour",
    "file_list": "60 per minute",
    "comment": "30 per minute",
    "captcha_generate": "10 per minute",
    "captcha_verify": "20 per minute"
}

# Create specific limiters
auth_limiter = Limiter(key_func=get_remote_address, storage_uri=storage_uri)
user_limiter = Limiter(key_func=get_user_id_or_ip, storage_uri=storage_uri)