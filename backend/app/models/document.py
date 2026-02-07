"""
Document model for file uploads and management.
Supports property-specific documents like inspections, appraisals, contracts, etc.
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, List, TYPE_CHECKING
import uuid
from datetime import datetime, timezone
import enum

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.saved_property import SavedProperty


class DocumentType(str, enum.Enum):
    """Types of documents that can be uploaded."""
    # Property Analysis
    INSPECTION_REPORT = "inspection_report"
    APPRAISAL = "appraisal"
    TITLE_REPORT = "title_report"
    SURVEY = "survey"
    
    # Financial
    TAX_RECORDS = "tax_records"
    INSURANCE = "insurance"
    MORTGAGE_DOCS = "mortgage_docs"
    FINANCIAL_STATEMENT = "financial_statement"
    
    # Legal
    CONTRACT = "contract"
    LEASE = "lease"
    DISCLOSURE = "disclosure"
    
    # Visual
    PHOTOS = "photos"
    FLOOR_PLAN = "floor_plan"
    
    # Renovation
    RENOVATION_ESTIMATE = "renovation_estimate"
    CONTRACTOR_BID = "contractor_bid"
    PERMITS = "permits"
    
    # Reports
    MARKET_ANALYSIS = "market_analysis"
    COMPARABLE_SALES = "comparable_sales"
    RENT_ANALYSIS = "rent_analysis"
    
    # Other
    NOTES = "notes"
    OTHER = "other"


class Document(Base):
    """
    Document/file uploaded by a user.
    Can be linked to a specific saved property or be standalone.
    """
    __tablename__ = "documents"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    property_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("saved_properties.id", ondelete="SET NULL"),
        index=True
    )  # Optional - can be standalone document
    
    # File Information
    filename: Mapped[str] = mapped_column(
        String(255), 
        nullable=False
    )  # Stored filename (sanitized, unique)
    original_filename: Mapped[Optional[str]] = mapped_column(
        String(255)
    )  # User's original filename
    file_type: Mapped[Optional[str]] = mapped_column(
        String(100)
    )  # MIME type: application/pdf, image/jpeg, etc.
    file_extension: Mapped[Optional[str]] = mapped_column(
        String(20)
    )  # pdf, jpg, png, docx, etc.
    file_size: Mapped[Optional[int]] = mapped_column(
        Integer
    )  # Size in bytes
    
    # Storage
    storage_key: Mapped[str] = mapped_column(
        String(500), 
        nullable=False
    )  # S3 key or local path
    storage_bucket: Mapped[Optional[str]] = mapped_column(
        String(100)
    )  # S3 bucket name
    
    # Thumbnails (for images and PDFs)
    thumbnail_key: Mapped[Optional[str]] = mapped_column(
        String(500)
    )  # S3 key for thumbnail
    has_thumbnail: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Document Metadata
    document_type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType), 
        default=DocumentType.OTHER
    )
    title: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), 
        default=list
    )
    
    # Document Date (e.g., date of inspection, not upload date)
    document_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Access Control
    is_private: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Processing Status
    processing_status: Mapped[Optional[str]] = mapped_column(
        String(50)
    )  # pending, processing, completed, failed
    processing_error: Mapped[Optional[str]] = mapped_column(Text)
    
    # OCR/Text Extraction (future feature)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="documents")
    saved_property: Mapped[Optional["SavedProperty"]] = relationship(
        "SavedProperty", 
        back_populates="documents"
    )
    
    def get_display_name(self) -> str:
        """Return title if set, otherwise original filename."""
        return self.title or self.original_filename or self.filename
    
    def get_file_size_formatted(self) -> str:
        """Return human-readable file size."""
        if not self.file_size:
            return "Unknown"
        
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

