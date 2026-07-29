"""Schemas for /api/lenders hard-money lender directory endpoints."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.directory import DirectoryListResponse


class LenderDisplay(BaseModel):
    """Pre-formatted display strings generated with the dataset."""

    loan_range: str | None = None
    max_ltv: str | None = None
    max_arv: str | None = None
    interest_rate: str | None = None
    points: str | None = None
    term: str | None = None


class LenderOut(BaseModel):
    # Validated straight off the ``Lender`` ORM row.
    model_config = ConfigDict(from_attributes=True)

    id: int
    domain: str
    company_name: str
    website: str
    phone: str | None = None
    email: str | None = None
    contact_type: str
    city: str | None = None
    state: str | None = None
    states_served: list[str] = []
    nationwide: bool = False
    loan_products: list[str] = []
    description: str | None = None
    min_loan_amount: int | None = None
    max_loan_amount: int | None = None
    max_ltv: float | None = None
    max_arv: float | None = None
    min_interest_rate: float | None = None
    max_interest_rate: float | None = None
    min_points: float | None = None
    max_points: float | None = None
    min_term_months: int | None = None
    max_term_months: int | None = None
    interest_only: bool | None = None
    display: LenderDisplay | None = None
    nmls_id: str | None = None
    aapl_member: bool | None = None
    year_founded: int | None = None
    credit_check_policy: str | None = None
    min_credit_score: int | None = None
    no_credit_check: bool | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def states_served_count(self) -> int:
        """Derived rather than stored — a persisted copy only drifts."""
        return len(self.states_served)


class LenderListResponse(DirectoryListResponse):
    lenders: list[LenderOut]


class LenderStatsResponse(BaseModel):
    total: int
    byState: dict[str, int] = Field(default_factory=dict, serialization_alias="byState")
    byProduct: dict[str, int] = Field(default_factory=dict, serialization_alias="byProduct")
    byCreditPolicy: dict[str, int] = Field(
        default_factory=dict, serialization_alias="byCreditPolicy"
    )
    noCreditCheckCount: int = Field(0, serialization_alias="noCreditCheckCount")
    nationwideCount: int = Field(0, serialization_alias="nationwideCount")

    model_config = {"populate_by_name": True}
