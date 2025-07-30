from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    R2_ACCESS_KEY: str
    R2_SECRET_KEY: str
    R2_BUCKET: str
    R2_ENDPOINT: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    SECRET_KEY: str = ""  # General purpose secret key
    JWT_EXPIRATION_HOURS: int = 1
    JWT_REFRESH_EXPIRATION_DAYS: int = 30
    SENDGRID_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PRO_PRICE_ID: str = ""
    STRIPE_MAX_PRICE_ID: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    SENTRY_DSN: str = ""
    ENCRYPTION_MASTER_KEY: str = ""
    VIRUS_SCAN_ENABLED: bool = False
    VIRUS_SCAN_SERVICE: str = "disabled"  # "clamav", "virustotal", or "disabled"
    VIRUS_SCAN_API_URL: str = ""  # e.g., "http://localhost:8080" for ClamAV
    VIRUS_SCAN_API_KEY: str = ""  # For VirusTotal
    VIRUS_SCAN_TIMEOUT: int = 30  # seconds
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    
    FREE_FILE_SIZE_LIMIT: int = 100 * 1024 * 1024  # 100MB
    FREE_STORAGE_LIMIT: int = 500 * 1024 * 1024  # 500MB
    FREE_CONCURRENT_FILES: int = 3
    FREE_DAILY_UPLOAD_LIMIT: int = 10
    
    ACCOUNT_FILE_SIZE_LIMIT: int = 500 * 1024 * 1024  # 500MB
    ACCOUNT_STORAGE_LIMIT: int = 1024 * 1024 * 1024  # 1GB
    ACCOUNT_CONCURRENT_FILES: int = 5
    ACCOUNT_DAILY_UPLOAD_LIMIT: int = 20
    
    PREMIUM_FILE_SIZE_LIMIT: int = 5 * 1024 * 1024 * 1024  # 5GB
    PREMIUM_STORAGE_LIMIT: int = 100 * 1024 * 1024 * 1024  # 100GB
    PREMIUM_PRICE: float = 4.99

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
    
    @property
    def get_secret_key(self) -> str:
        """Get SECRET_KEY or fallback to JWT_SECRET"""
        return self.SECRET_KEY or self.JWT_SECRET


settings = Settings()