"""Schemas for PropertyContact CRUD."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field


class ContactRole(StrEnum):
    """Mirrors models.contact.ContactRole."""

    SELLER = "seller"
    LISTING_AGENT = "listing_agent"
    BUYER_AGENT = "buyer_agent"
    LENDER = "lender"
    CONTRACTOR = "contractor"
    INSPECTOR = "inspector"
    ATTORNEY = "attorney"
    TITLE_COMPANY = "title_company"
    INSURANCE = "insurance"
    PROPERTY_MANAGER = "property_manager"
    OTHER = "other"


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    role: ContactRole = ContactRole.OTHER
    company: str | None = Field(None, max_length=255)
    # Phone stored as free-form string — formatting varies wildly by region
    # and we'd rather render whatever the user typed than reject "+44 20…".
    phone: str | None = Field(None, max_length=64)
    email: EmailStr | None = None
    notes: str | None = None


class ContactUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    role: ContactRole | None = None
    company: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=64)
    email: EmailStr | None = None
    notes: str | None = None


class ContactOut(BaseModel):
    id: str
    saved_property_id: str
    name: str
    role: ContactRole
    company: str | None
    phone: str | None
    email: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
