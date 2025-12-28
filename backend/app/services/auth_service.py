"""
Authentication service for user registration, login, and token management.
Handles password hashing, JWT tokens, and session management.
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
import secrets
import logging

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.user import User, UserProfile
from app.schemas.auth import TokenResponse, TokenPayload

logger = logging.getLogger(__name__)

# Password hashing context using bcrypt
# Note: bcrypt has a 72-byte limit; we truncate in get_password_hash
# Using bcrypt_sha256 to avoid version compatibility issues with newer bcrypt
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


class AuthService:
    """
    Authentication service handling:
    - Password hashing and verification
    - JWT token creation and validation
    - User registration and authentication
    - Password reset flows
    """
    
    def __init__(self):
        self.algorithm = settings.ALGORITHM
        self.secret_key = settings.SECRET_KEY
        self.access_token_expire = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire = settings.REFRESH_TOKEN_EXPIRE_DAYS
    
    # ===========================================
    # Password Hashing
    # ===========================================
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a hashed password."""
        try:
            # Truncate to 72 bytes to match hashing
            password_bytes = plain_password.encode('utf-8')[:72]
            # Use bcrypt directly to avoid passlib version issues
            import bcrypt
            return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
        except Exception as e:
            logger.warning(f"Password verification error: {e}")
            return False
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password for storage."""
        try:
            # Ensure password is a string and truncate to 72 bytes for bcrypt
            if isinstance(password, bytes):
                password = password.decode('utf-8')
            # Truncate to 72 bytes (bcrypt limit)
            password_bytes = password.encode('utf-8')[:72]
            password = password_bytes.decode('utf-8', errors='ignore')
            logger.debug(f"Hashing password of length {len(password)}")
            # Use bcrypt directly to avoid passlib version issues
            import bcrypt
            salt = bcrypt.gensalt(rounds=12)
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed.decode('utf-8')
        except Exception as e:
            logger.error(f"Password hashing error: {e}")
            raise
    
    # ===========================================
    # Token Creation
    # ===========================================
    
    def create_access_token(
        self, 
        user_id: str, 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire)
        
        payload = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(
        self, 
        user_id: str, 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT refresh token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire)
        
        payload = {
            "sub": str(user_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_tokens(
        self, 
        user_id: str, 
        remember_me: bool = False
    ) -> TokenResponse:
        """Create both access and refresh tokens."""
        # Extended expiration for "remember me"
        access_delta = timedelta(minutes=self.access_token_expire)
        refresh_delta = timedelta(days=self.refresh_token_expire)
        
        if remember_me:
            access_delta = timedelta(hours=24)
            refresh_delta = timedelta(days=30)
        
        access_token = self.create_access_token(user_id, access_delta)
        refresh_token = self.create_refresh_token(user_id, refresh_delta)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=int(access_delta.total_seconds())
        )
    
    # ===========================================
    # Token Verification
    # ===========================================
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[TokenPayload]:
        """
        Verify a JWT token and return its payload.
        
        Args:
            token: The JWT token to verify
            token_type: Expected token type ("access" or "refresh")
        
        Returns:
            TokenPayload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token, 
                self.secret_key, 
                algorithms=[self.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                logger.warning(f"Token type mismatch: expected {token_type}, got {payload.get('type')}")
                return None
            
            return TokenPayload(
                sub=payload["sub"],
                exp=datetime.fromtimestamp(payload["exp"]),
                type=payload["type"],
                iat=datetime.fromtimestamp(payload.get("iat", 0)) if payload.get("iat") else None
            )
            
        except JWTError as e:
            logger.warning(f"Token verification failed: {e}")
            return None
    
    # ===========================================
    # User Authentication
    # ===========================================
    
    async def authenticate_user(
        self, 
        db: AsyncSession, 
        email: str, 
        password: str
    ) -> Optional[User]:
        """
        Authenticate a user by email and password.
        
        Returns:
            User if authentication successful, None otherwise
        """
        # Query user by email
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.info(f"Authentication failed: user not found - {email}")
            return None
        
        if not self.verify_password(password, user.hashed_password):
            logger.info(f"Authentication failed: invalid password - {email}")
            return None
        
        if not user.is_active:
            logger.info(f"Authentication failed: user inactive - {email}")
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        return user
    
    # ===========================================
    # User Registration
    # ===========================================
    
    async def register_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        full_name: str
    ) -> Tuple[User, Optional[str]]:
        """
        Register a new user.
        
        Returns:
            Tuple of (User, verification_token or None)
        """
        # Check if email already exists
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise ValueError("Email already registered")
        
        # Generate verification token if email verification is required
        verification_token = None
        if settings.FEATURE_EMAIL_VERIFICATION_REQUIRED:
            verification_token = secrets.token_urlsafe(32)
            verification_expires = datetime.utcnow() + timedelta(
                hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
            )
        else:
            verification_expires = None
        
        # Create user
        user = User(
            email=email.lower(),
            hashed_password=self.get_password_hash(password),
            full_name=full_name,
            is_active=True,
            is_verified=not settings.FEATURE_EMAIL_VERIFICATION_REQUIRED,
            verification_token=verification_token,
            verification_token_expires=verification_expires,
        )
        
        db.add(user)
        await db.flush()  # Get the user ID
        
        # Create empty profile
        profile = UserProfile(user_id=user.id)
        db.add(profile)
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"User registered: {email}")
        
        return user, verification_token
    
    # ===========================================
    # Email Verification
    # ===========================================
    
    async def verify_email(
        self, 
        db: AsyncSession, 
        token: str
    ) -> Optional[User]:
        """
        Verify a user's email with the verification token.
        
        Returns:
            User if verification successful, None otherwise
        """
        result = await db.execute(
            select(User).where(
                User.verification_token == token,
                User.verification_token_expires > datetime.utcnow()
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        user.is_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Email verified: {user.email}")
        
        return user
    
    # ===========================================
    # Password Reset
    # ===========================================
    
    async def create_password_reset_token(
        self, 
        db: AsyncSession, 
        email: str
    ) -> Optional[str]:
        """
        Create a password reset token for a user.
        
        Returns:
            Reset token if user found, None otherwise
        """
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if user exists
            return None
        
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(
            hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
        )
        
        await db.commit()
        
        logger.info(f"Password reset token created: {email}")
        
        return reset_token
    
    async def reset_password(
        self, 
        db: AsyncSession, 
        token: str, 
        new_password: str
    ) -> Optional[User]:
        """
        Reset a user's password with the reset token.
        
        Returns:
            User if reset successful, None otherwise
        """
        result = await db.execute(
            select(User).where(
                User.reset_token == token,
                User.reset_token_expires > datetime.utcnow()
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        user.hashed_password = self.get_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Password reset completed: {user.email}")
        
        return user
    
    # ===========================================
    # Password Change
    # ===========================================
    
    async def change_password(
        self,
        db: AsyncSession,
        user: User,
        current_password: str,
        new_password: str
    ) -> bool:
        """
        Change a user's password (requires current password).
        
        Returns:
            True if change successful, False otherwise
        """
        if not self.verify_password(current_password, user.hashed_password):
            return False
        
        user.hashed_password = self.get_password_hash(new_password)
        await db.commit()
        
        logger.info(f"Password changed: {user.email}")
        
        return True
    
    # ===========================================
    # User Lookup
    # ===========================================
    
    async def get_user_by_id(
        self, 
        db: AsyncSession, 
        user_id: str,
        include_profile: bool = False
    ) -> Optional[User]:
        """Get a user by ID."""
        query = select(User).where(User.id == user_id)
        
        if include_profile:
            query = query.options(selectinload(User.profile))
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_user_by_email(
        self, 
        db: AsyncSession, 
        email: str
    ) -> Optional[User]:
        """Get a user by email."""
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()


# Singleton instance
auth_service = AuthService()

