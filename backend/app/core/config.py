"""
Application configuration and settings.
All settings are loaded from environment variables with sensible defaults.
"""
from pydantic_settings import BaseSettings
from pydantic import computed_field
from functools import lru_cache
from typing import Optional, List
import os
import warnings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # ===========================================
    # Application
    # ===========================================
    APP_NAME: str = "InvestIQ"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # ===========================================
    # Database
    # ===========================================
    # Can be provided as postgres://, postgresql://, or postgresql+asyncpg://
    # Railway provides postgres:// - we convert to asyncpg format automatically
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/investiq"
    
    @property
    def async_database_url(self) -> str:
        """
        Convert DATABASE_URL to psycopg3 format for SQLAlchemy async.
        Railway provides: postgres://user:pass@host:port/db
        We need: postgresql+psycopg://user:pass@host:port/db
        
        Note: Using psycopg3 instead of asyncpg for better SSL handling.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://") and "+psycopg" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        elif "+asyncpg" in url:
            url = url.replace("+asyncpg", "+psycopg")
        return url
    
    # Database pool settings
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    
    # ===========================================
    # Redis
    # ===========================================
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # ===========================================
    # API Keys (External Services)
    # ===========================================
    RENTCAST_API_KEY: str = ""
    RENTCAST_URL: str = "https://api.rentcast.io/v1"
    
    AXESSO_API_KEY: str = ""
    AXESSO_URL: str = "https://api.axesso.de/zil"
    
    # ===========================================
    # JWT Authentication
    # ===========================================
    # SECURITY: SECRET_KEY must be set via environment variable.
    # Generate with: openssl rand -hex 32
    # Empty default ensures this is explicitly configured.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Password Reset
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1  # 1 hour for security
    
    # Email Verification
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 48
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 48  # Alias for consistency
    
    # ===========================================
    # File Storage (S3/R2)
    # ===========================================
    STORAGE_BACKEND: str = "local"  # local, s3, r2
    
    # Local storage path (for development)
    LOCAL_STORAGE_PATH: str = "./uploads"
    
    # S3/R2 Settings
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "investiq-documents"
    S3_ENDPOINT_URL: Optional[str] = None  # For R2: https://{account_id}.r2.cloudflarestorage.com
    
    # Cloudflare R2 (S3-compatible)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "investiq-documents"
    R2_PUBLIC_URL: str = ""  # Public URL for accessing files
    
    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: str = "pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,webp"
    
    # ===========================================
    # Email (Resend)
    # ===========================================
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@investiq.app"
    EMAIL_FROM_NAME: str = "InvestIQ"
    
    # Email templates base URL (for links in emails)
    FRONTEND_URL: str = "http://localhost:3000"
    
    # ===========================================
    # Stripe (Billing)
    # ===========================================
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    
    # Price IDs (set these in Stripe Dashboard)
    STRIPE_PRICE_STARTER_MONTHLY: str = ""
    STRIPE_PRICE_STARTER_YEARLY: str = ""
    STRIPE_PRICE_PRO_MONTHLY: str = ""
    STRIPE_PRICE_PRO_YEARLY: str = ""
    STRIPE_PRICE_ENTERPRISE_MONTHLY: str = ""
    STRIPE_PRICE_ENTERPRISE_YEARLY: str = ""
    
    # ===========================================
    # Rate Limiting
    # ===========================================
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    # Auth rate limits (more restrictive)
    AUTH_RATE_LIMIT_REQUESTS: int = 5
    AUTH_RATE_LIMIT_PERIOD: int = 60  # seconds
    
    # ===========================================
    # CORS
    # ===========================================
    CORS_ORIGINS_STR: str = "https://investiq.guru,https://www.investiq.guru,http://localhost:3000,http://127.0.0.1:3000"
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS_ORIGINS_STR into a list of origins."""
        return [origin.strip() for origin in self.CORS_ORIGINS_STR.split(',') if origin.strip()]
    
    # ===========================================
    # Feature Flags
    # ===========================================
    FEATURE_AUTH_REQUIRED: bool = False  # If True, all routes require auth
    FEATURE_DASHBOARD_ENABLED: bool = True
    FEATURE_DOCUMENT_UPLOAD_ENABLED: bool = True
    FEATURE_SHARING_ENABLED: bool = True
    FEATURE_EMAIL_VERIFICATION_REQUIRED: bool = False  # Require email verification
    
    # ===========================================
    # Computed Properties
    # ===========================================
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"
    
    @property
    def allowed_file_types_list(self) -> List[str]:
        """Parse allowed file types into a list."""
        return [ft.strip().lower() for ft in self.ALLOWED_FILE_TYPES.split(',')]
    
    @property
    def max_upload_size_bytes(self) -> int:
        """Max upload size in bytes."""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


def validate_settings(settings: Settings) -> None:
    """
    Validate critical settings at startup.
    Raises RuntimeError if required settings are missing in production.
    """
    errors = []
    
    # SECRET_KEY is required in all environments for JWT security
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        if settings.is_production:
            errors.append(
                "SECRET_KEY must be set and at least 32 characters. "
                "Generate with: openssl rand -hex 32"
            )
        else:
            warnings.warn(
                "SECRET_KEY is not set or too short. Using insecure default for development. "
                "Set SECRET_KEY environment variable before deploying to production.",
                UserWarning
            )
    
    # Production-specific validations
    if settings.is_production:
        if not settings.DATABASE_URL or "localhost" in settings.DATABASE_URL:
            errors.append("DATABASE_URL must be set to a production database in production mode")
        
        if not settings.STRIPE_WEBHOOK_SECRET:
            # Warning only - Stripe webhooks will fail but app will start
            warnings.warn("STRIPE_WEBHOOK_SECRET not set - Stripe webhooks will not work")
    
    if errors:
        error_msg = "Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors)
        raise RuntimeError(error_msg)


# Export settings instance
settings = get_settings()

# Validate settings at import time (will warn in dev, error in prod)
validate_settings(settings)
