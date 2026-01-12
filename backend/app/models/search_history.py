"""
SearchHistory model for tracking user property searches.
"""

from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, TYPE_CHECKING
import uuid
from datetime import datetime

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class SearchHistory(Base):
    """
    Tracks property searches performed by users.
    Enables search history review and quick re-searches.
    """
    __tablename__ = "search_history"
    
    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Foreign key to user (nullable for anonymous searches)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    
    # Search query details
    search_query: Mapped[str] = mapped_column(
        String(500), 
        nullable=False
    )  # The address searched
    
    # Parsed address components
    address_street: Mapped[Optional[str]] = mapped_column(String(255))
    address_city: Mapped[Optional[str]] = mapped_column(String(100))
    address_state: Mapped[Optional[str]] = mapped_column(String(10))
    address_zip: Mapped[Optional[str]] = mapped_column(String(20))
    
    # Result reference
    property_cache_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        index=True
    )  # Reference to cached property data
    zpid: Mapped[Optional[str]] = mapped_column(String(50))  # Zillow ID if available
    
    # Quick result summary (for display without full reload)
    result_summary: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        default=dict
    )  # {property_type, beds, baths, sqft, price, rent_estimate}
    
    # Search metadata
    search_source: Mapped[Optional[str]] = mapped_column(
        String(50),
        default="web"
    )  # "web", "mobile", "api", "scanner"
    
    was_successful: Mapped[bool] = mapped_column(default=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Whether user saved this property after searching
    was_saved: Mapped[bool] = mapped_column(default=False)
    
    # Timestamps
    searched_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow
    )
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", backref="search_history")
    
    # Indexes for common queries
    __table_args__ = (
        Index('ix_search_history_user_searched', 'user_id', 'searched_at'),
    )
    
    def __repr__(self) -> str:
        return f"<SearchHistory {self.search_query[:50]}...>"

