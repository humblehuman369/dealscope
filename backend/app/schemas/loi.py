"""
Letter of Intent (LOI) Schemas for Wholesale Deals

Defines the data structures for generating professional LOIs
with intelligent defaults from property analysis.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class ContingencyType(str, Enum):
    """Standard contingencies for wholesale LOIs."""
    INSPECTION = "inspection"
    FINANCING = "financing"
    TITLE = "title"
    APPRAISAL = "appraisal"
    PARTNER_APPROVAL = "partner_approval"
    ATTORNEY_REVIEW = "attorney_review"


class LOIFormat(str, Enum):
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
    company: Optional[str] = Field(None, description="Company/LLC name if applicable")
    address: Optional[str] = Field(None, description="Buyer's address")
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    
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
    name: Optional[str] = Field(None, description="Seller's name if known")
    address: Optional[str] = Field(None, description="Seller's mailing address")
    is_entity: bool = Field(False, description="Is seller an entity vs individual")


class PropertyInfo(BaseModel):
    """Property details for LOI."""
    address: str = Field(..., description="Full property street address")
    city: str
    state: str = Field(default="FL")
    zip_code: str
    county: Optional[str] = None
    parcel_id: Optional[str] = Field(None, description="County parcel/folio number")
    legal_description: Optional[str] = Field(None, description="Legal description from deed")
    property_type: Optional[str] = Field(None, description="SFR, Multi-family, etc.")
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_footage: Optional[int] = None
    year_built: Optional[int] = None
    lot_size: Optional[int] = None
    
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
    contingencies: List[ContingencyType] = Field(
        default=[ContingencyType.INSPECTION, ContingencyType.TITLE],
        description="Active contingencies"
    )
    
    # Additional Terms
    include_personal_property: bool = Field(default=False, description="Include appliances, etc.")
    seller_concessions: float = Field(default=0, description="Requested seller credits")
    additional_terms: Optional[str] = Field(None, description="Custom additional terms")
    
    # Financing (for reference/transparency)
    is_cash_offer: bool = Field(default=True, description="Cash or financed")
    proof_of_funds_included: bool = Field(default=False, description="POF attached")


class LOIAnalysisData(BaseModel):
    """Analysis data to include for transparency (optional)."""
    arv: Optional[float] = Field(None, description="After Repair Value")
    estimated_rehab: Optional[float] = Field(None, description="Estimated rehab cost")
    max_allowable_offer: Optional[float] = Field(None, description="70% rule MAO")
    deal_viability: Optional[str] = Field(None, description="Strong/Moderate/Tight")
    include_in_loi: bool = Field(default=False, description="Show analysis in LOI")


class GenerateLOIRequest(BaseModel):
    """Complete request to generate an LOI."""
    buyer: BuyerInfo
    seller: Optional[SellerInfo] = None
    property_info: PropertyInfo
    terms: LOITerms
    analysis: Optional[LOIAnalysisData] = None
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
    content_html: Optional[str] = Field(None, description="HTML formatted version")
    pdf_base64: Optional[str] = Field(None, description="Base64 encoded PDF")
    
    # Summary
    property_address: str
    offer_price: float
    earnest_money: float
    inspection_days: int
    closing_days: int
    expiration_date: date
    
    # Metadata
    buyer_name: str
    seller_name: Optional[str]
    format_generated: LOIFormat


class LOITemplateInfo(BaseModel):
    """Information about available LOI templates."""
    id: str
    name: str
    description: str
    is_default: bool = False
    state_specific: Optional[str] = None  # e.g., "FL", "TX"


class LOIHistoryItem(BaseModel):
    """Historical LOI record."""
    id: str
    created_at: datetime
    property_address: str
    offer_price: float
    status: str  # "draft", "sent", "accepted", "countered", "rejected", "expired"
    seller_name: Optional[str]
    notes: Optional[str]


# ============================================
# USER PREFERENCES
# ============================================

class LOIUserPreferences(BaseModel):
    """Saved user preferences for LOI generation."""
    # Default buyer info (saved from profile)
    default_buyer: Optional[BuyerInfo] = None
    
    # Default terms
    default_earnest_money: float = 1000
    default_inspection_days: int = 14
    default_closing_days: int = 30
    default_contingencies: List[ContingencyType] = [
        ContingencyType.INSPECTION, 
        ContingencyType.TITLE
    ]
    
    # Always include assignment clause
    always_assign: bool = True
    
    # Preferred format
    preferred_format: LOIFormat = LOIFormat.PDF
    
    # Custom clauses
    custom_inspection_clause: Optional[str] = None
    custom_assignment_clause: Optional[str] = None
    custom_closing_clause: Optional[str] = None

