"""
Document model for file uploads and management.
Supports property-specific documents like inspections, appraisals, contracts, etc.
"""

import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.saved_property import SavedProperty
    from app.models.user import User


class DocumentType(enum.StrEnum):
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
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("saved_properties.id", ondelete="SET NULL"), index=True
    )  # Optional - can be standalone document

    # File Information
    filename: Mapped[str] = mapped_column(String(255), nullable=False)  # Stored filename (sanitized, unique)
    original_filename: Mapped[str | None] = mapped_column(String(255))  # User's original filename
    file_type: Mapped[str | None] = mapped_column(String(100))  # MIME type: application/pdf, image/jpeg, etc.
    file_extension: Mapped[str | None] = mapped_column(String(20))  # pdf, jpg, png, docx, etc.
    file_size: Mapped[int | None] = mapped_column(Integer)  # Size in bytes

    # Storage
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)  # S3 key or local path
    storage_bucket: Mapped[str | None] = mapped_column(String(100))  # S3 bucket name

    # Thumbnails (for images and PDFs)
    thumbnail_key: Mapped[str | None] = mapped_column(String(500))  # S3 key for thumbnail
    has_thumbnail: Mapped[bool] = mapped_column(Boolean, default=False)

    # Document Metadata
    document_type: Mapped[DocumentType] = mapped_column(SQLEnum(DocumentType), default=DocumentType.OTHER)
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), default=list)

    # Document Date (e.g., date of inspection, not upload date)
    document_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Access Control
    is_private: Mapped[bool] = mapped_column(Boolean, default=True)

    # Processing Status
    processing_status: Mapped[str | None] = mapped_column(String(50))  # pending, processing, completed, failed
    processing_error: Mapped[str | None] = mapped_column(Text)

    # OCR/Text Extraction (future feature)
    extracted_text: Mapped[str | None] = mapped_column(Text)

    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="documents")
    saved_property: Mapped[Optional["SavedProperty"]] = relationship("SavedProperty", back_populates="documents")

    def get_display_name(self) -> str:
        """Return title if set, otherwise original filename."""
        return self.title or self.original_filename or self.filename

    def get_file_size_formatted(self) -> str:
        """Return human-readable file size."""
        if not self.file_size:
            return "Unknown"

        size = self.file_size
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
