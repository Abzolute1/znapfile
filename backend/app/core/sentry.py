import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from app.core.config import settings
import os

def init_sentry():
    """Initialize Sentry for error tracking"""
    # Only initialize in production
    if os.getenv("ENVIRONMENT", "development") == "production":
        sentry_sdk.init(
            dsn=os.getenv("SENTRY_DSN"),
            
            # Integrations
            integrations=[
                FastApiIntegration(
                    transaction_style="endpoint",
                    failed_request_status_codes={500, 502, 503, 504}
                ),
                StarletteIntegration(
                    transaction_style="endpoint"
                ),
                SqlalchemyIntegration(),
            ],
            
            # Performance monitoring
            traces_sample_rate=0.1,  # 10% of requests
            
            # Release tracking
            release=os.getenv("APP_VERSION", "unknown"),
            
            # Environment
            environment=os.getenv("ENVIRONMENT", "development"),
            
            # Don't send certain errors
            before_send=filter_events,
            
            # Attach additional data
            attach_stacktrace=True,
            send_default_pii=False,  # Don't send personally identifiable information
        )

def filter_events(event, hint):
    """Filter out certain events from being sent to Sentry"""
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]
        
        # Don't send client disconnections
        if exc_type.__name__ in ["ConnectionError", "ClientDisconnect"]:
            return None
            
        # Don't send validation errors
        if exc_type.__name__ == "RequestValidationError":
            return None
            
        # Don't send 404s
        if hasattr(exc_value, "status_code") and exc_value.status_code == 404:
            return None
    
    return event