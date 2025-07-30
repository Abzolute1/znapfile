"""
CORS utilities for secure cross-origin handling
"""

from typing import Optional
from fastapi import Request
from app.core.config import settings


def get_allowed_origin(request: Request) -> Optional[str]:
    """
    Get the allowed origin for CORS based on request origin
    Returns None if origin is not allowed
    """
    origin = request.headers.get("origin")
    
    if not origin:
        # No origin header, likely same-origin request
        return None
    
    # Check if origin is in allowed list
    if origin in settings.CORS_ORIGINS:
        return origin
    
    # In production, also allow the frontend URL
    if hasattr(settings, 'FRONTEND_URL') and origin == settings.FRONTEND_URL:
        return origin
    
    # Check for subdomain patterns if needed
    # For example, allow any subdomain of your main domain
    allowed_domains = [
        "znapfile.com",
        "www.znapfile.com",
        "app.znapfile.com"
    ]
    
    for domain in allowed_domains:
        if origin.endswith(f"://{domain}") or origin.endswith(f"://{domain}/"):
            return origin
    
    # Origin not allowed
    return None


def get_cors_headers(request: Request) -> dict:
    """
    Get appropriate CORS headers based on request
    """
    allowed_origin = get_allowed_origin(request)
    
    if allowed_origin:
        return {
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin"  # Important for caching
        }
    else:
        # No CORS headers if origin not allowed
        return {}


def is_preview_allowed_origin(origin: Optional[str]) -> bool:
    """
    Check if origin is allowed for preview endpoints
    Preview endpoints might have different CORS rules
    """
    if not origin:
        return True  # Same-origin is always allowed
    
    # Check standard allowed origins
    if origin in settings.CORS_ORIGINS:
        return True
    
    # Preview might be embedded in other trusted sites
    preview_allowed_domains = [
        "localhost",  # Development
        "127.0.0.1",  # Development
        "znapfile.com",
        "app.znapfile.com"
    ]
    
    for domain in preview_allowed_domains:
        if domain in origin:
            return True
    
    return False