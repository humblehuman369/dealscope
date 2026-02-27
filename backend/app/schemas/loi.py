"""
Letter of Intent (LOI) Schemas for Wholesale Deals

Defines the data structures for generating professional LOIs
with intelligent defaults from property analysis.
"""

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field, model_validator


class ContingencyType(StrEnum):
    """Standard contingencies for wholesale LOIs."""

    INSPECTION = "inspection"
    FINANCING = "financing"
    TITLE = "title"
    APPRAISAL = "appraisal"
    PARTNER_APPROVAL = "partner_approval"
    ATTORNEY_REVIEW = "attorney_review"


class LOIFormat(StrEnum):
    """Output format for LOI generation."""

    PDF = "pdf"
    TEXT = "text"
    HTML = "html"
    DOCX = "docx"


# ============================================
# REQUEST MODELS
# ============================================


class BuyerInfo(BaseModel):
    """Buyer/Investor information for LOI."""

    name: str = Field(..., description="Buyer's legal name or entity name")
    company: str | None = Field(None, description="Company/LLC name if applicable")
    address: str | None = Field(None, description="Buyer's address")
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    phone: str | None = None
    email: str | None = None

    @property
    def full_address(self) -> str:
        """Formatted full address."""
        parts = [self.address]
        if self.city and self.state:
            parts.append(f"{self.city}, {self.state} {self.zip_code or ''}")
        return ", ".join(filter(None, parts))

    @property
    def display_name(self) -> str:
        """Display name with company if applicable."""
        if self.company:
            return f"{self.name} / {self.company}"
        return self.name


class SellerInfo(BaseModel):
    """Seller information for LOI."""

    name: str | None = Field(None, description="Seller's name if known")
    address: str | None = Field(None, description="Seller's mailing address")
    is_entity: bool = Field(False, description="Is seller an entity vs individual")


class PropertyInfo(BaseModel):
    """Property details for LOI."""

    address: str = Field(..., description="Full property street address")
    city: str
    state: str = Field(default="FL")
    zip_code: str
    county: str | None = None
    parcel_id: str | None = Field(None, description="County parcel/folio number")
    legal_description: str | None = Field(None, description="Legal description from deed")
    property_type: str | None = Field(None, description="SFR, Multi-family, etc.")
    bedrooms: int | None = None
    bathrooms: float | None = None
    square_footage: int | None = None
    year_built: int | None = None
    lot_size: int | None = None

    @property
    def full_address(self) -> str:
        """Formatted full address."""
        return f"{self.address}, {self.city}, {self.state} {self.zip_code}"


class LOITerms(BaseModel):
    """Terms and conditions for the LOI."""

    # Financial Terms
    offer_price: float = Field(..., description="Proposed purchase price")
    earnest_money: float = Field(default=1000, description="Earnest money deposit")
    earnest_money_holder: str = Field(default="Title Company", description="Who holds earnest money")

    # Timeline
    inspection_period_days: int = Field(default=14, description="Due diligence period")
    closing_period_days: int = Field(default=30, description="Days to close after inspection")
    offer_expiration_days: int = Field(default=3, description="Days until offer expires")

    # Assignment
    allow_assignment: bool = Field(default=True, description="Include 'and/or assigns' clause")
    assignment_fee_disclosed: bool = Field(default=False, description="Disclose assignment fee")

    # Contingencies
    contingencies: list[ContingencyType] = Field(
        default=[ContingencyType.INSPECTION, ContingencyType.TITLE], description="Active contingencies"
    )

    # Additional Terms
    include_personal_property: bool = Field(default=False, description="Include appliances, etc.")
    seller_concessions: float = Field(default=0, description="Requested seller credits")
    additional_terms: str | None = Field(None, description="Custom additional terms")

    # Financing (for reference/transparency)
    is_cash_offer: bool = Field(default=True, description="Cash or financed")
    proof_of_funds_included: bool = Field(default=False, description="POF attached")

    @model_validator(mode="after")
    def validate_financial_terms(self):
        """Validate financial terms are sensible."""
        # Earnest money should not exceed offer price
        if self.earnest_money > self.offer_price:
            raise ValueError(
                f"earnest_money ({self.earnest_money:,.0f}) cannot exceed offer_price ({self.offer_price:,.0f})"
            )

        # Earnest money should typically be a reasonable percentage (0.5% - 10%)
        if self.offer_price > 0:
            earnest_pct = self.earnest_money / self.offer_price
            if earnest_pct > 0.15:
                raise ValueError(
                    f"earnest_money ({self.earnest_money:,.0f}) is over 15% of "
                    f"offer_price ({self.offer_price:,.0f}). This seems unusually high."
                )

        # Seller concessions shouldn't exceed offer price
        if self.seller_concessions > self.offer_price:
            raise ValueError(
                f"seller_concessions ({self.seller_concessions:,.0f}) cannot exceed "
                f"offer_price ({self.offer_price:,.0f})"
            )

        return self


class LOIAnalysisData(BaseModel):
    """Analysis data to include for transparency (optional)."""

    arv: float | None = Field(None, description="After Repair Value")
    estimated_rehab: float | None = Field(None, description="Estimated rehab cost")
    max_allowable_offer: float | None = Field(None, description="70% rule MAO")
    deal_viability: str | None = Field(None, description="Strong/Moderate/Tight")
    include_in_loi: bool = Field(default=False, description="Show analysis in LOI")


class GenerateLOIRequest(BaseModel):
    """Complete request to generate an LOI."""

    buyer: BuyerInfo
    seller: SellerInfo | None = None
    property_info: PropertyInfo
    terms: LOITerms
    analysis: LOIAnalysisData | None = None
    format: LOIFormat = Field(default=LOIFormat.PDF)

    # Presentation
    include_cover_letter: bool = Field(default=True)
    professional_letterhead: bool = Field(default=True)
    include_signature_lines: bool = Field(default=True)


# ============================================
# RESPONSE MODELS
# ============================================


class LOIDocument(BaseModel):
    """Generated LOI document response."""

    id: str = Field(..., description="Unique LOI identifier")
    created_at: datetime

    # Document content
    content_text: str = Field(..., description="Plain text version of LOI")
    content_html: str | None = Field(None, description="HTML formatted version")
    pdf_base64: str | None = Field(None, description="Base64 encoded PDF")

    # Summary
    property_address: str
    offer_price: float
    earnest_money: float
    inspection_days: int
    closing_days: int
    expiration_date: date

    # Metadata
    buyer_name: str
    seller_name: str | None
    format_generated: LOIFormat


class LOITemplateInfo(BaseModel):
    """Information about available LOI templates."""

    id: str
    name: str
    description: str
    is_default: bool = False
    state_specific: str | None = None  # e.g., "FL", "TX"


class LOIHistoryItem(BaseModel):
    """Historical LOI record."""

    id: str
    created_at: datetime
    property_address: str
    offer_price: float
    status: str  # "draft", "sent", "accepted", "countered", "rejected", "expired"
    seller_name: str | None
    notes: str | None


# ============================================
# USER PREFERENCES
# ============================================


class LOIUserPreferences(BaseModel):
    """Saved user preferences for LOI generation."""

    # Default buyer info (saved from profile)
    default_buyer: BuyerInfo | None = None

    # Default terms
    default_earnest_money: float = 1000
    default_inspection_days: int = 14
    default_closing_days: int = 30
    default_contingencies: list[ContingencyType] = [ContingencyType.INSPECTION, ContingencyType.TITLE]

    # Always include assignment clause
    always_assign: bool = True

    # Preferred format
    preferred_format: LOIFormat = LOIFormat.PDF

    # Custom clauses
    custom_inspection_clause: str | None = None
    custom_assignment_clause: str | None = None
    custom_closing_clause: str | None = None
