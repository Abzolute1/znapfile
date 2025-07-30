from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.base import engine, Base
from app.core.rate_limiting import limiter, _rate_limit_exceeded_handler
# CSP nonce temporarily disabled until frontend supports it
# from app.core.csp_nonce import CSPNonce, add_csp_nonce_to_request
from app.core.token_blacklist import token_blacklist
from app.core.sentry import init_sentry
from slowapi.errors import RateLimitExceeded


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize token blacklist
    await token_blacklist.connect()
    
    yield
    
    # Cleanup
    await token_blacklist.close()


# Initialize Sentry for error tracking
init_sentry()

app = FastAPI(
    title="FileShare API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    try:
        response = await call_next(request)
    except Exception as e:
        print(f"MIDDLEWARE ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Skip X-Frame-Options for preview endpoints to allow iframe embedding
    is_preview = "preview" in request.url.path
    if not is_preview:
        response.headers["X-Frame-Options"] = "DENY"
    else:
        # For preview endpoints, use SAMEORIGIN to allow our own iframes
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
    
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # CSP that works with current frontend
    # TODO: Implement nonce-based CSP once frontend supports it
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # Allow inline scripts for now
        "style-src 'self' 'unsafe-inline'",  # Allow inline styles for now
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://*.cloudflarestorage.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests"
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
    
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    # Allow large uploads
    if request.url.path.startswith("/api/v1/upload"):
        response.headers["X-Accel-Buffering"] = "no"
        
    return response

# CORS - Configure specifically
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PATCH", "PUT", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Trusted host validation
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["*.fileshare.com", "fileshare.com", "localhost"]
    )

# GZip compression middleware for responses
# This compresses responses over 1KB in size
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "FileShare API", "version": "1.0.0"}


@app.get("/test-direct")
async def test_direct():
    """Test endpoint added directly to main app"""
    return {"status": "Direct endpoint working", "message": "If you see this, the main app is running"}


@app.get("/test-sentry")
async def test_sentry():
    """Test endpoint to verify Sentry is working"""
    # This will only trigger Sentry in production
    import os
    if os.getenv("ENVIRONMENT") == "production":
        raise Exception("Test Sentry error tracking")
    return {"message": "Sentry test triggered (only works in production)"}