"""
Tests for the authentication service.
"""
import pytest
from unittest.mock import patch, AsyncMock

from app.services.auth_service import AuthService, auth_service
from app.models.user import User


class TestPasswordHashing:
    """Tests for password hashing and verification."""
    
    def test_password_hash_is_different_from_original(self, auth_service: AuthService):
        """Password hash should not equal the original password."""
        password = "SecurePassword123"
        hashed = auth_service.get_password_hash(password)
        
        assert hashed != password
        assert len(hashed) > 0
    
    def test_password_verification_succeeds_for_correct_password(self, auth_service: AuthService):
        """Correct password should verify successfully."""
        password = "SecurePassword123"
        hashed = auth_service.get_password_hash(password)
        
        assert auth_service.verify_password(password, hashed) is True
    
    def test_password_verification_fails_for_incorrect_password(self, auth_service: AuthService):
        """Incorrect password should fail verification."""
        password = "SecurePassword123"
        wrong_password = "WrongPassword456"
        hashed = auth_service.get_password_hash(password)
        
        assert auth_service.verify_password(wrong_password, hashed) is False
    
    def test_same_password_produces_different_hashes(self, auth_service: AuthService):
        """Same password should produce different hashes (due to salt)."""
        password = "SecurePassword123"
        hash1 = auth_service.get_password_hash(password)
        hash2 = auth_service.get_password_hash(password)
        
        assert hash1 != hash2
        # But both should verify correctly
        assert auth_service.verify_password(password, hash1) is True
        assert auth_service.verify_password(password, hash2) is True


class TestTokenCreation:
    """Tests for JWT token creation and verification."""
    
    def test_create_tokens_returns_access_and_refresh(self, auth_service: AuthService):
        """Token creation should return both access and refresh tokens."""
        user_id = "test-user-id-123"
        tokens = auth_service.create_tokens(user_id)
        
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert "expires_in" in tokens
        assert tokens["token_type"] == "bearer"
    
    def test_access_token_is_verifiable(self, auth_service: AuthService):
        """Access token should be verifiable."""
        user_id = "test-user-id-123"
        tokens = auth_service.create_tokens(user_id)
        
        payload = auth_service.verify_token(tokens["access_token"], token_type="access")
        
        assert payload is not None
        assert payload.sub == user_id
    
    def test_refresh_token_is_verifiable(self, auth_service: AuthService):
        """Refresh token should be verifiable."""
        user_id = "test-user-id-123"
        tokens = auth_service.create_tokens(user_id)
        
        payload = auth_service.verify_token(tokens["refresh_token"], token_type="refresh")
        
        assert payload is not None
        assert payload.sub == user_id
    
    def test_invalid_token_returns_none(self, auth_service: AuthService):
        """Invalid token should return None."""
        payload = auth_service.verify_token("invalid-token", token_type="access")
        
        assert payload is None
    
    def test_access_token_rejected_as_refresh(self, auth_service: AuthService):
        """Access token should be rejected when verified as refresh token."""
        user_id = "test-user-id-123"
        tokens = auth_service.create_tokens(user_id)
        
        payload = auth_service.verify_token(tokens["access_token"], token_type="refresh")
        
        assert payload is None
    
    def test_remember_me_extends_expiration(self, auth_service: AuthService):
        """Remember me flag should create longer-lived tokens."""
        user_id = "test-user-id-123"
        
        normal_tokens = auth_service.create_tokens(user_id, remember_me=False)
        remember_tokens = auth_service.create_tokens(user_id, remember_me=True)
        
        # Remember me tokens should have longer expiration
        assert remember_tokens["expires_in"] > normal_tokens["expires_in"]


class TestUserRegistration:
    """Tests for user registration."""
    
    @pytest.mark.asyncio
    async def test_register_user_creates_user(self, db_session, auth_service: AuthService, sample_user_data):
        """Registration should create a new user."""
        user, verification_token = await auth_service.register_user(
            db=db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
            full_name=sample_user_data["full_name"]
        )
        
        assert user is not None
        assert user.email == sample_user_data["email"]
        assert user.full_name == sample_user_data["full_name"]
        assert user.is_active is True
    
    @pytest.mark.asyncio
    async def test_register_user_hashes_password(self, db_session, auth_service: AuthService, sample_user_data):
        """Registration should hash the password."""
        user, _ = await auth_service.register_user(
            db=db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
            full_name=sample_user_data["full_name"]
        )
        
        assert user.hashed_password != sample_user_data["password"]
        assert auth_service.verify_password(sample_user_data["password"], user.hashed_password)
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email_raises_error(self, db_session, auth_service: AuthService, sample_user_data):
        """Registering with duplicate email should raise error."""
        # First registration
        await auth_service.register_user(
            db=db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
            full_name=sample_user_data["full_name"]
        )
        await db_session.commit()
        
        # Second registration with same email should fail
        with pytest.raises(ValueError, match="already registered"):
            await auth_service.register_user(
                db=db_session,
                email=sample_user_data["email"],
                password="DifferentPassword123",
                full_name="Different User"
            )


class TestUserAuthentication:
    """Tests for user authentication."""
    
    @pytest.mark.asyncio
    async def test_authenticate_valid_credentials(self, db_session, auth_service: AuthService, sample_user_data):
        """Valid credentials should authenticate successfully."""
        # Create user first
        await auth_service.register_user(
            db=db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
            full_name=sample_user_data["full_name"]
        )
        await db_session.commit()
        
        # Authenticate
        user = await auth_service.authenticate_user(
            db=db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"]
        )
        
        assert user is not None
        assert user.email == sample_user_data["email"]
    
    @pytest.mark.asyncio
    async def test_authenticate_invalid_password(self, db_session, auth_service: AuthService, sample_user_data):
        """Invalid password should fail authentication."""
        # Create user first
        await auth_service.register_user(
            db=db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
            full_name=sample_user_data["full_name"]
        )
        await db_session.commit()
        
        # Authenticate with wrong password
        user = await auth_service.authenticate_user(
            db=db_session,
            email=sample_user_data["email"],
            password="WrongPassword123"
        )
        
        assert user is None
    
    @pytest.mark.asyncio
    async def test_authenticate_nonexistent_user(self, db_session, auth_service: AuthService):
        """Nonexistent user should fail authentication."""
        user = await auth_service.authenticate_user(
            db=db_session,
            email="nonexistent@example.com",
            password="AnyPassword123"
        )
        
        assert user is None


class TestPasswordReset:
    """Tests for password reset functionality."""
    
    @pytest.mark.asyncio
    async def test_create_password_reset_token(self, db_session, auth_service: AuthService, sample_user_data):
        """Password reset token should be created for existing user."""
        # Create user first
        await auth_service.register_user(
            db=db_session,
            email=sample_user_data["email"],
            password=sample_user_data["password"],
            full_name=sample_user_data["full_name"]
        )
        await db_session.commit()
        
        # Create reset token
        result = await auth_service.create_password_reset_token(
            db=db_session,
            email=sample_user_data["email"]
        )
        
        assert result is not None
        token, user = result
        assert token is not None
        assert len(token) > 0
        assert user.email == sample_user_data["email"]
    
    @pytest.mark.asyncio
    async def test_password_reset_token_for_nonexistent_user(self, db_session, auth_service: AuthService):
        """Password reset for nonexistent user should return None (prevent enumeration)."""
        result = await auth_service.create_password_reset_token(
            db=db_session,
            email="nonexistent@example.com"
        )
        
        assert result is None
