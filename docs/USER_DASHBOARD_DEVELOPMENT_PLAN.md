# DealScope User Dashboard - Comprehensive Development Plan

## Executive Summary

This document outlines the complete development blueprint for implementing user registration, authentication, user investment profiles, and an intelligent dashboard with saved properties, document management, and sharing capabilities for the DealScope/DealGapIQ platform.

**Primary Objective**: Implement all new features while **preserving 100% of existing functionality**.

---

## 📋 Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Database & Core Infrastructure](#phase-1-database--core-infrastructure)
4. [Phase 2: User Authentication System](#phase-2-user-authentication-system)
5. [Phase 3: User Investment Profile](#phase-3-user-investment-profile)
6. [Phase 4: Saved Properties System](#phase-4-saved-properties-system)
7. [Phase 5: Document Management](#phase-5-document-management)
8. [Phase 6: Property Reports & Export](#phase-6-property-reports--export)
9. [Phase 7: Share & Send Features](#phase-7-share--send-features)
10. [Phase 8: Intelligent Dashboard](#phase-8-intelligent-dashboard)
11. [Phase 9: Mobile App Integration](#phase-9-mobile-app-integration)
12. [Phase 10: Testing & Deployment](#phase-10-testing--deployment)
13. [Risk Mitigation Strategy](#risk-mitigation-strategy)
14. [Timeline Estimates](#timeline-estimates)

---

## Current State Assessment

### Existing Backend Stack
```
FastAPI 0.109.0
├── PostgreSQL 15 (configured, not actively used for user data)
├── Redis (configured for caching)
├── RentCast & AXESSO API integrations
├── JWT settings already in config.py (SECRET_KEY, ALGORITHM)
├── In-memory property cache (_property_cache)
└── No current authentication
```

### Existing Frontend Stack
```
Next.js 14
├── TanStack Query (React Query)
├── Zustand (state management with persistence)
├── Tailwind CSS + custom design system
├── React Hook Form + Zod validation
├── Theme context (light/dark mode)
└── Local storage for assumptions/recent searches
```

### Current Features to Preserve
- ✅ Property search by address
- ✅ GPS/camera property scanning
- ✅ 6 investment strategy calculators
- ✅ Assumptions management
- ✅ Sensitivity analysis
- ✅ Strategy comparison
- ✅ Dark/light theme toggle
- ✅ Mobile-responsive design
- ✅ Demo/sample property data

---

## Architecture Overview

### New Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                     │
├─────────────────────────────────────────────────────────────────┤
│  Auth Context │ User Profile │ Dashboard │ Document Viewer      │
│  Protected Routes │ Share Modal │ Report Generator              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                       │
├─────────────────────────────────────────────────────────────────┤
│  Auth Router │ Users Router │ Properties Router │ Documents     │
│  Reports Router │ Share Router │ Existing Property Endpoints    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICES LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  AuthService │ UserService │ SavedPropertyService               │
│  DocumentService │ ReportService │ ShareService                 │
│  EmailService │ Existing PropertyService                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL │ Redis Cache │ S3/MinIO (Documents) │ SendGrid     │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Overview

```sql
-- Core User Tables
users
user_profiles (investment_profile)
user_sessions

-- Property Management
saved_properties
property_adjustments
property_notes

-- Documents
documents
document_shares

-- Sharing & Reports
shared_links
generated_reports
```

---

## Phase 1: Database & Core Infrastructure

### Step 1.1: Database Migration Setup

**Backend Changes:**
```
backend/
├── alembic/                    # NEW: Database migrations
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
├── app/
│   ├── models/                 # NEW: SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── saved_property.py
│   │   ├── document.py
│   │   └── share.py
│   ├── db/                     # NEW: Database connection
│   │   ├── __init__.py
│   │   ├── session.py
│   │   └── base.py
│   └── ...existing files...
└── requirements.txt            # UPDATE: Add SQLAlchemy, alembic
```

**New Dependencies (requirements.txt):**
```
# Add to existing requirements.txt
sqlalchemy==2.0.25
alembic==1.13.1
asyncpg==0.29.0           # Async PostgreSQL driver
passlib[bcrypt]==1.7.4    # Password hashing
python-jose[cryptography]==3.3.0  # JWT tokens
emails==0.6               # Email sending
boto3==1.34.0            # S3 document storage
python-multipart==0.0.6   # File uploads (already exists)
```

### Step 1.2: Core Database Models

**File: `backend/app/models/user.py`**
```python
from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.models.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    saved_properties = relationship("SavedProperty", back_populates="user")
    documents = relationship("Document", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    
    # Investment Profile
    investment_experience = Column(String(50))  # beginner, intermediate, advanced
    preferred_strategies = Column(JSON, default=list)  # ['ltr', 'str', 'brrrr', etc.]
    target_markets = Column(JSON, default=list)  # ['FL', 'TX', 'CA', etc.]
    investment_budget_min = Column(Float)
    investment_budget_max = Column(Float)
    target_cash_on_cash = Column(Float)  # Minimum acceptable CoC return
    target_cap_rate = Column(Float)
    risk_tolerance = Column(String(20))  # conservative, moderate, aggressive
    
    # Default Assumptions (overrides global defaults)
    default_assumptions = Column(JSON, default=dict)
    
    # Preferences
    notification_preferences = Column(JSON, default=dict)
    dashboard_layout = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")
```

### Step 1.3: File Storage Configuration

**File: `backend/app/core/storage.py`**
```python
# Support for both S3 (production) and local storage (development)
from abc import ABC, abstractmethod
import os
from pathlib import Path

class StorageBackend(ABC):
    @abstractmethod
    async def upload(self, file, key: str) -> str: pass
    
    @abstractmethod
    async def download(self, key: str) -> bytes: pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool: pass
    
    @abstractmethod
    def get_url(self, key: str, expires_in: int = 3600) -> str: pass

class LocalStorage(StorageBackend):
    """Development: Store files locally"""
    pass

class S3Storage(StorageBackend):
    """Production: Store files in S3/MinIO"""
    pass
```

### Step 1.4: Migration to Enable PostgreSQL

**Create initial migration for user tables:**
```bash
cd backend
alembic revision --autogenerate -m "Initial user tables"
alembic upgrade head
```

---

## Phase 2: User Authentication System

### Step 2.1: Authentication Schemas

**File: `backend/app/schemas/auth.py`**
```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    
    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain a digit')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class UserPublic(BaseModel):
    id: str
    email: str
    full_name: str
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
```

### Step 2.2: Authentication Service

**File: `backend/app/services/auth_service.py`**
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.algorithm = settings.ALGORITHM
        self.secret_key = settings.SECRET_KEY
        self.access_token_expire = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire = settings.REFRESH_TOKEN_EXPIRE_DAYS
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def create_access_token(self, user_id: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire)
        payload = {"sub": user_id, "exp": expire, "type": "access"}
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: str) -> str:
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire)
        payload = {"sub": user_id, "exp": expire, "type": "refresh"}
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    async def authenticate_user(
        self, db: AsyncSession, email: str, password: str
    ) -> Optional[User]:
        # Query user, verify password
        pass
    
    async def register_user(
        self, db: AsyncSession, email: str, password: str, full_name: str
    ) -> User:
        # Create user, send verification email
        pass
```

### Step 2.3: Authentication Router

**File: `backend/app/routers/auth.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import *
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", response_model=UserPublic)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    pass

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return tokens."""
    pass

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """Get new access token using refresh token."""
    pass

@router.post("/logout")
async def logout(current_user = Depends(get_current_user)):
    """Invalidate current session."""
    pass

@router.post("/forgot-password")
async def forgot_password(data: PasswordReset, db: AsyncSession = Depends(get_db)):
    """Send password reset email."""
    pass

@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """Reset password using token from email."""
    pass

@router.get("/me", response_model=UserPublic)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current authenticated user info."""
    pass
```

### Step 2.4: Frontend Authentication Context

**File: `frontend/src/context/AuthContext.tsx`**
```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  fullName: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Implementation with token storage, auto-refresh, etc.
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Step 2.5: Protected Route Wrapper

**File: `frontend/src/components/auth/ProtectedRoute.tsx`**
```typescript
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return null;
  
  return <>{children}</>;
}
```

### Step 2.6: Login/Register Pages

**File: `frontend/src/app/(auth)/login/page.tsx`**
```typescript
// Beautiful login page with:
// - Email/password form
// - Social login buttons (Google, Apple - optional)
// - "Remember me" checkbox
// - "Forgot password" link
// - Registration link
// - Form validation with react-hook-form + zod
```

**File: `frontend/src/app/(auth)/register/page.tsx`**
```typescript
// Registration page with:
// - Full name, email, password fields
// - Password strength indicator
// - Terms acceptance checkbox
// - Login link
```

---

## Phase 3: User Investment Profile

### Step 3.1: Profile Schema Extensions

**File: `backend/app/schemas/profile.py`**
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class ExperienceLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class RiskTolerance(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"

class InvestmentProfileCreate(BaseModel):
    investment_experience: ExperienceLevel
    preferred_strategies: List[str]  # ['ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale']
    target_markets: List[str]  # State codes or cities
    investment_budget_min: float = Field(ge=0)
    investment_budget_max: float = Field(ge=0)
    target_cash_on_cash: float = Field(ge=0, le=1)  # 0.08 = 8%
    target_cap_rate: float = Field(ge=0, le=1)
    risk_tolerance: RiskTolerance
    
class InvestmentProfileUpdate(BaseModel):
    # All fields optional for partial updates
    investment_experience: Optional[ExperienceLevel] = None
    preferred_strategies: Optional[List[str]] = None
    # ...

class InvestmentProfileResponse(InvestmentProfileCreate):
    id: str
    user_id: str
    default_assumptions: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### Step 3.2: Profile Onboarding Flow

**Frontend Pages:**
```
frontend/src/app/(auth)/onboarding/
├── page.tsx              # Multi-step onboarding wrapper
├── steps/
│   ├── ExperienceStep.tsx
│   ├── StrategiesStep.tsx
│   ├── BudgetStep.tsx
│   ├── GoalsStep.tsx
│   └── CompleteStep.tsx
```

**Onboarding Features:**
1. **Step 1 - Experience Level**: Visual cards for beginner to expert
2. **Step 2 - Preferred Strategies**: Interactive strategy selector with explanations
3. **Step 3 - Budget Range**: Dual-handle slider for min/max investment
4. **Step 4 - Goals**: Target returns, risk tolerance
5. **Step 5 - Welcome**: Dashboard preview, quick actions

---

## Phase 4: Saved Properties System

### Step 4.1: Saved Property Models

**File: `backend/app/models/saved_property.py`**
```python
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Float, Text, Enum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum

from app.models.base import Base

class PropertyStatus(str, enum.Enum):
    WATCHING = "watching"
    ANALYZING = "analyzing"
    UNDER_CONTRACT = "under_contract"
    OWNED = "owned"
    ARCHIVED = "archived"

class SavedProperty(Base):
    __tablename__ = "saved_properties"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Property Reference (from API search)
    external_property_id = Column(String(100))  # ID from property service
    zpid = Column(String(50))  # Zillow property ID
    
    # Cached Property Data (snapshot at save time)
    address_street = Column(String(255), nullable=False)
    address_city = Column(String(100))
    address_state = Column(String(10))
    address_zip = Column(String(20))
    full_address = Column(String(500))
    
    property_data_snapshot = Column(JSON)  # Full property response cached
    
    # User Customizations
    status = Column(Enum(PropertyStatus), default=PropertyStatus.WATCHING)
    nickname = Column(String(100))  # "Beach House", "First Flip", etc.
    tags = Column(ARRAY(String), default=[])  # ["priority", "needs-repair", "good-deal"]
    color_label = Column(String(20))  # "red", "green", "blue", etc.
    
    # Custom Adjustments (user overrides)
    custom_assumptions = Column(JSON, default=dict)  # Strategy-specific overrides
    custom_purchase_price = Column(Float)
    custom_rent_estimate = Column(Float)
    custom_arv = Column(Float)
    custom_rehab_budget = Column(Float)
    
    # Notes
    notes = Column(Text)
    
    # Analytics Cache
    last_analytics_result = Column(JSON)  # Cached analytics for quick display
    analytics_calculated_at = Column(DateTime)
    
    # Dates
    saved_at = Column(DateTime, default=datetime.utcnow)
    last_viewed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="saved_properties")
    documents = relationship("Document", back_populates="property")
    adjustments_history = relationship("PropertyAdjustment", back_populates="property")

class PropertyAdjustment(Base):
    """Tracks history of adjustments made to saved properties"""
    __tablename__ = "property_adjustments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("saved_properties.id"))
    
    adjustment_type = Column(String(50))  # "purchase_price", "rent", "assumptions"
    previous_value = Column(JSON)
    new_value = Column(JSON)
    reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    property = relationship("SavedProperty", back_populates="adjustments_history")
```

### Step 4.2: Saved Properties Router

**File: `backend/app/routers/saved_properties.py`**
```python
router = APIRouter(prefix="/api/v1/saved-properties", tags=["Saved Properties"])

@router.get("/", response_model=List[SavedPropertySummary])
async def list_saved_properties(
    status: Optional[PropertyStatus] = None,
    tag: Optional[str] = None,
    sort_by: str = "saved_at",
    order: str = "desc",
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all saved properties for current user with filtering."""
    pass

@router.post("/", response_model=SavedPropertyResponse)
async def save_property(
    data: SavedPropertyCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save a property to user's portfolio."""
    pass

@router.get("/{property_id}", response_model=SavedPropertyDetail)
async def get_saved_property(
    property_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get saved property with full details."""
    pass

@router.patch("/{property_id}", response_model=SavedPropertyResponse)
async def update_saved_property(
    property_id: UUID,
    data: SavedPropertyUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update saved property (status, notes, adjustments, etc.)."""
    pass

@router.delete("/{property_id}")
async def delete_saved_property(
    property_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove property from saved list."""
    pass

@router.post("/{property_id}/adjustments", response_model=AdjustmentResponse)
async def add_adjustment(
    property_id: UUID,
    data: AdjustmentCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add adjustment to saved property with history tracking."""
    pass

@router.post("/{property_id}/refresh")
async def refresh_property_data(
    property_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetch fresh data from APIs and update snapshot."""
    pass

@router.post("/{property_id}/calculate")
async def calculate_analytics(
    property_id: UUID,
    strategies: Optional[List[str]] = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Calculate analytics using custom adjustments."""
    pass
```

### Step 4.3: Frontend Saved Properties Components

**File Structure:**
```
frontend/src/components/saved-properties/
├── PropertyCard.tsx           # Card view for dashboard grid
├── PropertyListItem.tsx       # Row view for list mode
├── SavePropertyButton.tsx     # "Save" button with animation
├── PropertyStatusBadge.tsx    # Status indicator
├── TagManager.tsx             # Add/remove tags
├── AdjustmentsPanel.tsx       # Edit custom values
├── AdjustmentHistory.tsx      # View change history
├── PropertyNotes.tsx          # Rich text notes editor
└── QuickActions.tsx           # Edit, delete, share, etc.
```

---

## Phase 5: Document Management

### Step 5.1: Document Models

**File: `backend/app/models/document.py`**
```python
class DocumentType(str, enum.Enum):
    INSPECTION_REPORT = "inspection_report"
    APPRAISAL = "appraisal"
    TITLE_REPORT = "title_report"
    CONTRACT = "contract"
    INSURANCE = "insurance"
    TAX_RECORDS = "tax_records"
    PHOTOS = "photos"
    FLOOR_PLAN = "floor_plan"
    RENOVATION_ESTIMATE = "renovation_estimate"
    OTHER = "other"

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    property_id = Column(UUID(as_uuid=True), ForeignKey("saved_properties.id"))
    
    # File Info
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255))
    file_type = Column(String(50))  # MIME type
    file_size = Column(Integer)  # bytes
    storage_key = Column(String(500))  # S3 key or local path
    
    # Metadata
    document_type = Column(Enum(DocumentType))
    title = Column(String(255))
    description = Column(Text)
    tags = Column(ARRAY(String), default=[])
    
    # Thumbnails (for images/PDFs)
    thumbnail_key = Column(String(500))
    
    # Access Control
    is_private = Column(Boolean, default=True)
    
    # Dates
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    property = relationship("SavedProperty", back_populates="documents")
```

### Step 5.2: Document Upload Router

**File: `backend/app/routers/documents.py`**
```python
router = APIRouter(prefix="/api/v1/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile,
    property_id: Optional[UUID] = None,
    document_type: DocumentType = DocumentType.OTHER,
    title: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a document, optionally linked to a property."""
    # Validate file type and size
    # Generate storage key
    # Upload to S3/local storage
    # Create thumbnail if applicable
    # Create database record
    pass

@router.get("/", response_model=List[DocumentSummary])
async def list_documents(
    property_id: Optional[UUID] = None,
    document_type: Optional[DocumentType] = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's documents with optional filtering."""
    pass

@router.get("/{document_id}")
async def get_document(
    document_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get document details and download URL."""
    pass

@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate signed download URL."""
    pass

@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete document from storage and database."""
    pass
```

### Step 5.3: Frontend Document Components

**File Structure:**
```
frontend/src/components/documents/
├── DocumentUploader.tsx       # Drag-n-drop upload with progress
├── DocumentViewer.tsx         # Preview modal for images/PDFs
├── DocumentList.tsx           # List of documents for a property
├── DocumentCard.tsx           # Thumbnail card view
├── DocumentTypeIcon.tsx       # Icon by document type
└── BulkUploader.tsx          # Upload multiple files
```

---

## Phase 6: Property Reports & Export

### Step 6.1: Report Generation Service

**File: `backend/app/services/report_service.py`**
```python
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, Paragraph, Spacer
import pandas as pd
from openpyxl import Workbook

class ReportService:
    async def generate_pdf_report(
        self,
        property_data: SavedProperty,
        analytics: AnalyticsResponse,
        include_sections: List[str]
    ) -> bytes:
        """Generate comprehensive PDF property report."""
        # Cover page with property photo and summary
        # Property details section
        # Strategy analysis sections
        # Charts and graphs
        # Assumptions used
        # Disclaimers
        pass
    
    async def generate_excel_report(
        self,
        property_data: SavedProperty,
        analytics: AnalyticsResponse
    ) -> bytes:
        """Generate Excel workbook with all analysis tabs."""
        # Property Summary sheet
        # Each strategy on separate sheet
        # Sensitivity analysis
        # Assumptions reference
        pass
    
    async def generate_comparison_report(
        self,
        properties: List[SavedProperty],
        strategies: List[str]
    ) -> bytes:
        """Generate side-by-side comparison of multiple properties."""
        pass
```

### Step 6.2: Reports Router

**File: `backend/app/routers/reports.py`**
```python
router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])

@router.post("/generate/{property_id}")
async def generate_report(
    property_id: UUID,
    format: Literal["pdf", "xlsx", "csv"] = "pdf",
    strategies: Optional[List[str]] = None,
    include_sensitivity: bool = False,
    include_documents: bool = False,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate downloadable property report."""
    pass

@router.get("/download/{report_id}")
async def download_report(
    report_id: UUID,
    current_user = Depends(get_current_user)
):
    """Download generated report file."""
    pass

@router.post("/comparison")
async def generate_comparison_report(
    property_ids: List[UUID],
    format: Literal["pdf", "xlsx"] = "pdf",
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate comparison report for multiple properties."""
    pass
```

### Step 6.3: Frontend Report Components

**File Structure:**
```
frontend/src/components/reports/
├── ReportGenerator.tsx        # Report options modal
├── ReportPreview.tsx          # Preview before download
├── DownloadButton.tsx         # Download with format selector
├── ComparisonBuilder.tsx      # Select properties to compare
└── ReportHistory.tsx          # Previously generated reports
```

---

## Phase 7: Share & Send Features

### Step 7.1: Share Models

**File: `backend/app/models/share.py`**
```python
class ShareType(str, enum.Enum):
    PUBLIC_LINK = "public_link"      # Anyone with link can view
    PASSWORD_LINK = "password_link"  # Requires password
    EMAIL_INVITE = "email_invite"    # Specific email recipients
    TEAM_SHARE = "team_share"        # Future: team/organization

class SharedLink(Base):
    __tablename__ = "shared_links"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    property_id = Column(UUID(as_uuid=True), ForeignKey("saved_properties.id"))
    
    # Share Configuration
    share_type = Column(Enum(ShareType), default=ShareType.PUBLIC_LINK)
    share_token = Column(String(64), unique=True, index=True)
    password_hash = Column(String(255))  # For password-protected links
    
    # Access Control
    allowed_emails = Column(ARRAY(String))  # For email invites
    view_count = Column(Integer, default=0)
    max_views = Column(Integer)  # Optional limit
    
    # What to share
    include_analytics = Column(Boolean, default=True)
    include_documents = Column(Boolean, default=False)
    include_adjustments = Column(Boolean, default=True)
    visible_strategies = Column(ARRAY(String))  # Which strategies to show
    
    # Expiration
    expires_at = Column(DateTime)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User")
    property = relationship("SavedProperty")
```

### Step 7.2: Share Router

**File: `backend/app/routers/share.py`**
```python
router = APIRouter(prefix="/api/v1/share", tags=["Sharing"])

@router.post("/link/{property_id}", response_model=ShareLinkResponse)
async def create_share_link(
    property_id: UUID,
    options: ShareLinkCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create shareable link for a property."""
    pass

@router.get("/view/{share_token}")
async def view_shared_property(
    share_token: str,
    password: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """View shared property (no auth required)."""
    pass

@router.post("/email/{property_id}")
async def send_property_email(
    property_id: UUID,
    recipients: List[EmailStr],
    message: Optional[str] = None,
    include_report: bool = False,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send property details via email."""
    pass

@router.get("/links", response_model=List[ShareLinkSummary])
async def list_share_links(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all active share links for current user."""
    pass

@router.delete("/link/{link_id}")
async def revoke_share_link(
    link_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke/delete a share link."""
    pass
```

### Step 7.3: Share Page (Public View)

**File: `frontend/src/app/share/[token]/page.tsx`**
```typescript
// Public page for viewing shared properties
// - No auth required
// - Password prompt if protected
// - Limited view based on share settings
// - "Get your own DealGapIQ account" CTA
```

### Step 7.4: Frontend Share Components

**File Structure:**
```
frontend/src/components/share/
├── ShareModal.tsx             # Share options dialog
├── ShareLinkGenerator.tsx     # Generate and copy link
├── EmailShareForm.tsx         # Send via email form
├── ShareSettings.tsx          # Configure what to include
├── ShareLinkManager.tsx       # View/revoke active links
└── CopyLinkButton.tsx         # Copy to clipboard
```

---

## Phase 8: Intelligent Dashboard

### Step 8.1: Dashboard Layout

**File: `frontend/src/app/dashboard/page.tsx`**
```typescript
// Main dashboard with:
// - Quick stats header (total properties, avg ROI, etc.)
// - Portfolio value chart
// - Saved properties grid/list
// - Recent activity feed
// - Quick actions panel
```

**Dashboard Sections:**
```
frontend/src/app/dashboard/
├── page.tsx                   # Main dashboard
├── properties/
│   └── page.tsx              # Full properties list view
├── analytics/
│   └── page.tsx              # Portfolio-wide analytics
├── documents/
│   └── page.tsx              # Document library
├── reports/
│   └── page.tsx              # Generated reports
└── settings/
    └── page.tsx              # Profile & preferences
```

### Step 8.2: Dashboard Components

**File Structure:**
```
frontend/src/components/dashboard/
├── DashboardHeader.tsx        # User greeting, notifications
├── QuickStats.tsx            # Key metrics cards
├── PortfolioChart.tsx        # Value over time chart
├── PropertyGrid.tsx          # Saved properties grid
├── RecentActivity.tsx        # Activity feed
├── QuickActions.tsx          # Common actions buttons
├── MarketInsights.tsx        # Optional: market updates
├── GoalsProgress.tsx         # Progress toward investment goals
└── WelcomeCard.tsx          # For new users
```

### Step 8.3: Dashboard API Endpoints

**File: `backend/app/routers/dashboard.py`**
```python
router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

@router.get("/summary")
async def get_dashboard_summary(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard summary stats."""
    return {
        "total_properties": count,
        "total_portfolio_value": sum,
        "avg_cash_on_cash": avg,
        "best_performer": property,
        "recent_changes": changes,
        "action_items": items
    }

@router.get("/activity")
async def get_recent_activity(
    limit: int = 10,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get recent activity feed."""
    pass

@router.get("/insights")
async def get_insights(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized insights based on profile and properties."""
    pass
```

### Step 8.4: Dashboard Store

**File: `frontend/src/stores/dashboardStore.ts`**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardStore {
  viewMode: 'grid' | 'list';
  sortBy: 'saved_at' | 'name' | 'value' | 'roi';
  sortOrder: 'asc' | 'desc';
  filters: {
    status: string[];
    tags: string[];
    strategies: string[];
  };
  
  // Actions
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (field: string) => void;
  toggleSortOrder: () => void;
  setFilters: (filters: Partial<DashboardStore['filters']>) => void;
  resetFilters: () => void;
}
```

---

## Phase 9: Mobile App Integration

### Step 9.1: Authentication in Mobile App

**File: `mobile/context/AuthContext.tsx`**
```typescript
// Similar to web but using SecureStore for tokens
import * as SecureStore from 'expo-secure-store';

export function AuthProvider({ children }) {
  // Store tokens securely on device
  // Handle biometric auth (optional)
  // Offline token refresh
}
```

### Step 9.2: Mobile Dashboard Tab

**File: `mobile/app/(tabs)/dashboard.tsx`**
```typescript
// Mobile-optimized dashboard with:
// - Swipeable property cards
// - Pull-to-refresh
// - Bottom sheet for actions
// - Offline support for saved properties
```

### Step 9.3: Sync Service

**File: `mobile/services/syncService.ts`**
```typescript
// Handle offline/online sync for:
// - Saved properties
// - Custom adjustments
// - Documents (download for offline)
// - Notes
```

---

## Phase 10: Testing & Deployment

### Step 10.1: Backend Testing

**Test Structure:**
```
backend/tests/
├── conftest.py               # Fixtures, test DB setup
├── test_auth.py              # Authentication tests
├── test_users.py             # User management tests
├── test_saved_properties.py  # Saved properties tests
├── test_documents.py         # Document upload tests
├── test_reports.py           # Report generation tests
├── test_share.py            # Sharing feature tests
├── test_dashboard.py        # Dashboard endpoint tests
└── test_integration.py      # Full flow integration tests
```

### Step 10.2: Frontend Testing

**Test Structure:**
```
frontend/__tests__/
├── components/
│   ├── auth/
│   ├── dashboard/
│   └── saved-properties/
├── hooks/
├── utils/
└── integration/
```

### Step 10.3: Deployment Updates

**Backend `requirements.txt` Final:**
```
# Core (existing)
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
httpx==0.26.0
python-multipart==0.0.6
python-dotenv==1.0.0

# NEW: Database
sqlalchemy==2.0.25
alembic==1.13.1
asyncpg==0.29.0

# NEW: Authentication
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0

# NEW: Storage & Reports
boto3==1.34.0
reportlab==4.0.9
openpyxl==3.1.2
Pillow==10.2.0

# NEW: Email
emails==0.6
aiosmtplib==3.0.1
```

**Environment Variables (New):**
```
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dealgapiq

# Auth
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=dealgapiq-documents
AWS_REGION=us-east-1

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@dealgapiq.app
```

---

## Risk Mitigation Strategy

### Preserving Existing Functionality

1. **Feature Flag System**
   ```python
   # backend/app/core/features.py
   class FeatureFlags:
       AUTH_REQUIRED = os.getenv("FEATURE_AUTH_REQUIRED", "false") == "true"
       DASHBOARD_ENABLED = os.getenv("FEATURE_DASHBOARD", "false") == "true"
   ```

2. **Backward-Compatible Routes**
   - All existing `/api/v1/*` endpoints remain unchanged
   - New endpoints require authentication: `/api/v1/user/*`, `/api/v1/dashboard/*`
   - Demo/sample endpoints remain public

3. **Gradual Migration**
   - Phase 1-3: New users get dashboard, existing flows unchanged
   - Phase 4+: Add "Save Property" buttons to existing pages
   - Final: Enable auth requirement via feature flag

4. **Database Safety**
   - All migrations are additive (no drops)
   - Existing in-memory cache continues to work
   - PostgreSQL connection is optional during transition

### Testing Checkpoints

Each phase includes:
- [ ] Unit tests for new features
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical user flows
- [ ] Regression tests for existing functionality
- [ ] Performance benchmarks

---

## Timeline Estimates

| Phase | Description | Estimated Duration |
|-------|-------------|-------------------|
| **Phase 1** | Database & Core Infrastructure | 3-4 days |
| **Phase 2** | User Authentication | 4-5 days |
| **Phase 3** | User Investment Profile | 2-3 days |
| **Phase 4** | Saved Properties System | 5-6 days |
| **Phase 5** | Document Management | 4-5 days |
| **Phase 6** | Property Reports & Export | 3-4 days |
| **Phase 7** | Share & Send Features | 3-4 days |
| **Phase 8** | Intelligent Dashboard | 5-6 days |
| **Phase 9** | Mobile App Integration | 4-5 days |
| **Phase 10** | Testing & Deployment | 3-4 days |
| **Total** | | **36-46 days** |

---

## Summary

This development plan provides a comprehensive blueprint for adding user authentication, investment profiles, and an intelligent dashboard to DealScope while ensuring zero disruption to existing functionality.

**Key Principles:**
1. ✅ Additive changes only - never modify existing working code unnecessarily
2. ✅ Feature flags for gradual rollout
3. ✅ Backward-compatible API design
4. ✅ Comprehensive testing at each phase
5. ✅ Mobile-first responsive design

**Priority Order:**
1. 🔴 Phase 1-2: Core infrastructure & auth (foundation)
2. 🟠 Phase 4: Saved properties (highest user value)
3. 🟡 Phase 8: Dashboard (brings it all together)
4. 🟢 Phases 3, 5, 6, 7: Supporting features
5. 🔵 Phases 9-10: Mobile & polish

---

*Document Version: 1.0*
*Created: December 2024*
*Last Updated: December 2024*

