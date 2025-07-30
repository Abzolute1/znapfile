from typing import Dict, Any
from app.models.user import UserTier

# Plan limits in bytes and other constraints
PLAN_LIMITS: Dict[UserTier, Dict[str, Any]] = {
    UserTier.FREE: {
        "monthly_transfer_bytes": 2 * 1024 * 1024 * 1024,  # 2GB
        "max_file_size_bytes": 1 * 1024 * 1024 * 1024,     # 1GB
        "active_storage_bytes": 0,                          # No persistent storage
        "file_expiration_hours": 24,                        # 24 hours
        "max_expiration_hours": 24,                         # Can't extend beyond 24h
        "daily_transfer_limit": 5,                          # 5 transfers per day
        "requires_email_verification": True,
        "download_tracking": False,
        "password_protection": True,
        "api_access": False,
    },
    UserTier.PRO: {
        "monthly_transfer_bytes": 300 * 1024 * 1024 * 1024,  # 300GB
        "max_file_size_bytes": 300 * 1024 * 1024 * 1024,     # 300GB
        "active_storage_bytes": 300 * 1024 * 1024 * 1024,    # 300GB
        "file_expiration_hours": 24,                          # Default 24 hours
        "max_expiration_hours": 7 * 24,                       # Up to 7 days
        "daily_transfer_limit": None,                         # Unlimited
        "requires_email_verification": True,
        "download_tracking": True,
        "password_protection": True,
        "api_access": False,
    },
    UserTier.MAX: {
        "monthly_transfer_bytes": 1024 * 1024 * 1024 * 1024,  # 1TB
        "max_file_size_bytes": 1024 * 1024 * 1024 * 1024,     # 1TB
        "active_storage_bytes": 1024 * 1024 * 1024 * 1024,    # 1TB
        "file_expiration_hours": 24,                          # Default 24 hours
        "max_expiration_hours": 20 * 24,                      # Up to 20 days
        "daily_transfer_limit": None,                         # Unlimited
        "requires_email_verification": True,
        "download_tracking": True,
        "password_protection": True,
        "api_access": True,
    },
}

def get_plan_limits(tier: UserTier) -> Dict[str, Any]:
    """Get the limits for a specific plan tier"""
    return PLAN_LIMITS.get(tier, PLAN_LIMITS[UserTier.FREE])

def format_bytes(bytes_value: int) -> str:
    """Format bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f}{unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f}PB"