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
    APP_NAME: str = "RealVestIQ"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # ===========================================
    # Database
    # ===========================================
    # Can be provided as postgres://, postgresql://, or postgresql+asyncpg://
    # Railway provides postgres:// - we convert to asyncpg format automatically
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/realvestiq"
    
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
    # Production: 10 pool + 20 overflow = 30 concurrent connections
    # Development: 5 pool + 10 overflow = 15 concurrent connections
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    
    # ===========================================
    # Redis
    # ===========================================
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # ===========================================
    # Observability (Sentry)
    # ===========================================
    SENTRY_DSN: str = ""  # Set via environment variable
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1  # 10% of transactions
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1  # 10% of profiled transactions
    
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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 5   # Short-lived JWT; session is the authority
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ===========================================
    # Cookie Settings (for httpOnly auth cookies)
    # ===========================================
    COOKIE_SECURE: bool = True  # Set to False for local dev without HTTPS
    # SameSite=none is required when frontend and backend are on different
    # domains (e.g. realvestiq.com + dealscope-production.up.railway.app).
    # CSRF middleware provides equivalent protection.
    COOKIE_SAMESITE: str = "none"  # lax, strict, or none
    COOKIE_DOMAIN: Optional[str] = None  # Set for cross-subdomain cookies
    
    # ===========================================
    # Session settings
    # ===========================================
    SESSION_DEFAULT_DAYS: int = 7
    SESSION_REMEMBER_ME_DAYS: int = 30
    
    # ===========================================
    # Account lockout
    # ===========================================
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    
    # ===========================================
    # MFA
    # ===========================================
    MFA_ISSUER_NAME: str = "RealVestIQ"
    MFA_ENCRYPTION_KEY: str = ""  # Optional Fernet key override for MFA secret encryption
    
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
    S3_BUCKET_NAME: str = "realvestiq-documents"
    S3_ENDPOINT_URL: Optional[str] = None  # For R2: https://{account_id}.r2.cloudflarestorage.com
    
    # Cloudflare R2 (S3-compatible)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "realvestiq-documents"
    R2_PUBLIC_URL: str = ""  # Public URL for accessing files
    
    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: str = "pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,webp"
    
    # ===========================================
    # Push Notifications (Expo)
    # ===========================================
    EXPO_ACCESS_TOKEN: str = ""  # Optional — improves throughput; get from https://expo.dev/accounts/[account]/settings/access-tokens
    
    # ===========================================
    # Email (Resend)
    # ===========================================
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@realvestiq.com"
    EMAIL_FROM_NAME: str = "RealVestIQ"
    
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
    # Data Retention
    # ===========================================
    AUDIT_LOG_RETENTION_DAYS: int = 90  # Delete audit logs older than this

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
    CORS_ORIGINS_STR: str = "https://realvestiq.com,https://www.realvestiq.com,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006,http://localhost:19000,http://127.0.0.1:19000"
    
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
    
    # SECRET_KEY is required in ALL environments — no empty defaults
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        if settings.is_production:
            errors.append(
                "SECRET_KEY must be set and at least 32 characters. "
                "Generate with: openssl rand -hex 32"
            )
        else:
            warnings.warn(
                "SECRET_KEY is not set or too short. "
                "Set SECRET_KEY environment variable (openssl rand -hex 32). "
                "A random key will be used for this session.",
                UserWarning,
            )
            # In dev mode, use a per-process random key so tests still work
            if not settings.SECRET_KEY:
                import secrets as _s
                object.__setattr__(settings, "SECRET_KEY", _s.token_hex(32))
    
    # Production-specific validations
    if settings.is_production:
        if not settings.DATABASE_URL or "localhost" in settings.DATABASE_URL:
            errors.append("DATABASE_URL must be set to a production database in production mode")

        # Redis is mandatory in production — in-memory rate limiting doesn't
        # survive multi-worker deployments, allowing unlimited requests.
        if not settings.REDIS_URL or settings.REDIS_URL == "redis://localhost:6379/0":
            errors.append(
                "REDIS_URL must be set to a production Redis instance. "
                "In-memory rate limiting is not safe with multiple workers."
            )

        # Warn about missing API keys — app starts without them but
        # related features (property data, billing, email) will be unavailable.
        _prod_keys = [
            ("RENTCAST_API_KEY", settings.RENTCAST_API_KEY, "property data"),
            ("AXESSO_API_KEY", settings.AXESSO_API_KEY, "Zillow data"),
            ("STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY, "billing"),
            ("RESEND_API_KEY", settings.RESEND_API_KEY, "email delivery"),
        ]
        for key_name, key_value, feature in _prod_keys:
            if not key_value:
                warnings.warn(f"{key_name} not set — {feature} will be unavailable")

        if not settings.STRIPE_WEBHOOK_SECRET:
            # Warning only - Stripe webhooks will fail but app will start
            warnings.warn("STRIPE_WEBHOOK_SECRET not set - Stripe webhooks will not work")
    else:
        # Non-production: warn about missing keys without blocking startup
        _optional_keys = [
            ("RENTCAST_API_KEY", settings.RENTCAST_API_KEY),
            ("AXESSO_API_KEY", settings.AXESSO_API_KEY),
            ("STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY),
        ]
        for key_name, key_value in _optional_keys:
            if not key_value:
                warnings.warn(f"{key_name} not set — related features will be unavailable")

    # COOKIE_SECURE must be False for local dev (HTTP) — browsers refuse to
    # send Secure cookies over plain HTTP, silently breaking auth.
    if not settings.is_production and settings.COOKIE_SECURE:
        warnings.warn(
            "COOKIE_SECURE forced to False for non-production environment (no HTTPS). "
            "Set ENVIRONMENT=production to enable Secure cookies.",
            UserWarning,
        )
        object.__setattr__(settings, "COOKIE_SECURE", False)

        # SameSite=none requires Secure=True. Downgrade to lax in dev.
        if settings.COOKIE_SAMESITE.lower() == "none":
            warnings.warn(
                "COOKIE_SAMESITE forced from 'none' to 'lax' in non-production "
                "(SameSite=None requires Secure cookies).",
                UserWarning,
            )
            object.__setattr__(settings, "COOKIE_SAMESITE", "lax")

    if errors:
        error_msg = "Configuration errors:\n" + "\n".join(f"  - {e}" for e in errors)
        raise RuntimeError(error_msg)


# Export settings instance
settings = get_settings()

# Validate settings at import time (will warn in dev, error in prod)
validate_settings(settings)
