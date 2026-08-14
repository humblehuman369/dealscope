from pydantic import BaseModel, EmailStr, Field


class IntelligenceSubscribeRequest(BaseModel):
    email: EmailStr
    investor_type: str | None = Field(default=None, max_length=50)
    source: str | None = Field(default="investor-intelligence", max_length=100)
    placement: str | None = Field(default=None, max_length=120)


class IntelligenceSubscribeResponse(BaseModel):
    ok: bool = True
