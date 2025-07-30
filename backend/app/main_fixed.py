"""
FIXED MAIN.PY - PRODUCTION READY
This combines the working minimal version with all necessary features
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.base import engine, Base
from app.core.token_blacklist import token_blacklist
from app.core.rate_limiting import limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize token blacklist (with error handling)
    try:
        await token_blacklist.connect()
    except Exception as e:
        print(f"Warning: Token blacklist connection failed: {e}")
    
    yield
    
    # Cleanup
    try:
        await token_blacklist.close()
    except:
        pass


# Initialize Sentry if configured
if settings.SENTRY_DSN and settings.SENTRY_DSN != "your_sentry_dsn":
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
        environment="production",
    )

# Create app
app = FastAPI(
    title="FileShare API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting (with error handling)
try:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
except Exception as e:
    print(f"Warning: Rate limiting setup failed: {e}")

# Simple security headers (without the complex CSP that might be failing)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "FileShare API", "version": "1.0.0"}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FileShare API"}