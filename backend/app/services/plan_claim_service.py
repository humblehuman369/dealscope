"""
Plan claim — save a Make It Work plan for an email address, no password.

Flow (all inside the caller's transaction):

1. Find the user by email or create one the way Google sign-in does
   (placeholder password, profile, member role). New users start
   ``is_verified=False``; the magic link flips it on first use.
2. Save the property with a Deal Maker record whose levers come from the
   chosen scenario (Target Buy, rent, seller carry), with
   ``initial_assumptions`` resolved for that user. If the property is
   already saved, the existing record is updated instead of duplicated.
3. Store the wizard answers + narrative on the property snapshot under
   ``make_it_work_plan`` (existing JSON column — no migration).
4. Issue a 30-minute single-use ``MAGIC_LINK`` token and email the plan.

The router always returns the same 202 regardless of what happened here, so
the endpoint cannot be used to discover which emails have accounts.
"""

from __future__ import annotations

import base64
import json
import logging
import secrets
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote, urlencode

from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit_log import AuditAction
from app.models.saved_property import SavedProperty
from app.models.user import User
from app.models.verification_token import TokenType
from app.repositories.audit_repository import audit_repo
from app.repositories.role_repository import role_repo
from app.repositories.user_repository import user_repo
from app.schemas.deal_maker import DealMakerRecord, DealMakerRecordUpdate
from app.schemas.plans import PlanClaimRequest, PlanScenario
from app.schemas.saved_property import SavedPropertyCreate
from app.services.assumption_resolver import resolve_assumptions
from app.services.deal_maker_service import DealMakerService
from app.services.email_service import email_service
from app.services.saved_property_service import saved_property_service
from app.services.token_service import token_service

logger = logging.getLogger(__name__)

MAGIC_LINK_EXPIRES_MINUTES = 30
PLAN_KEY = "make_it_work_plan"

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def find_or_create_user(db: AsyncSession, email: str, *, ip_address: str | None = None) -> tuple[User, bool]:
    """Return ``(user, created)``. Mirrors ``get_or_create_user_from_google`` minus OAuth."""
    email = email.lower().strip()
    user = await user_repo.get_by_email(db, email, load_roles=True)
    if user:
        return user, False

    placeholder_password = _pwd_context.hash(secrets.token_urlsafe(64))
    user = await user_repo.create(
        db,
        email=email,
        full_name=email.split("@", 1)[0],
        hashed_password=placeholder_password,
        is_verified=False,
    )
    await user_repo.create_profile(db, user.id)

    member_role = await role_repo.get_role_by_name(db, "member")
    if member_role:
        await role_repo.assign_role(db, user.id, member_role.id)

    await audit_repo.log(
        db,
        action=AuditAction.REGISTER,
        user_id=user.id,
        ip_address=ip_address,
        user_agent=None,
        metadata={"email": email, "source": "make_it_work_plan"},
    )
    logger.info("User created from Make It Work plan claim: %s", email)
    return user, True


def scenario_to_record_update(scenario: PlanScenario | None) -> DealMakerRecordUpdate:
    """Translate the scenario's ``pre_loaded_record`` levers onto the Deal Maker record.

    Same mapping the workbench applies client-side in
    ``preLoadedRecordToDealMakerPatch`` (frontend/src/lib/dealStructures/loadScenario.ts),
    so a plan saved by email reopens with the numbers the user saw.
    """
    fields: dict[str, Any] = {}
    if scenario is None:
        return DealMakerRecordUpdate(**fields)

    levers = scenario.levers or {}
    extras = levers.get("pending_extras") or levers.get("pendingExtras") or {}
    if not isinstance(extras, dict):
        extras = {}

    def num(v: Any) -> float | None:
        return float(v) if isinstance(v, (int, float)) and v == v else None

    cpp = num(levers.get("custom_purchase_price") or levers.get("customPurchasePrice"))
    if cpp is not None and cpp > 0:
        fields["buy_price"] = cpp

    cre = num(levers.get("custom_rent_estimate") or levers.get("customRentEstimate"))
    if cre is not None and cre >= 0:
        fields["monthly_rent"] = cre

    for source in (levers, extras):
        amt = num(source.get("seller_carry_amount"))
        if amt is not None and amt >= 0:
            fields["seller_carry_amount"] = amt
        rate = num(source.get("seller_carry_rate"))
        if rate is not None and 0 <= rate <= 0.2:
            fields["seller_carry_rate"] = rate
        term = source.get("seller_carry_term_years")
        if isinstance(term, (int, float)) and 1 <= term <= 40:
            fields["seller_carry_term_years"] = int(term)
        balloon = source.get("seller_carry_balloon_years")
        if isinstance(balloon, (int, float)) and 1 <= balloon <= 40:
            fields["seller_carry_balloon_years"] = int(balloon)
        dp = num(source.get("down_payment_pct_override"))
        if dp is not None and 0 <= dp <= 1:
            fields["down_payment_pct"] = dp

    occ = levers.get("is_owner_occupied")
    if isinstance(occ, bool):
        fields["is_owner_occupied"] = occ

    return DealMakerRecordUpdate(**fields)


def _plan_metadata(req: PlanClaimRequest) -> dict[str, Any]:
    return {
        "saved_at": datetime.now(UTC).isoformat(),
        "wizard_answers": req.wizard_answers.model_dump(by_alias=False),
        "scenario": req.scenario.model_dump(by_alias=True) if req.scenario else None,
        "narrative": req.narrative.model_dump() if req.narrative else None,
    }


async def _save_or_update_property(db: AsyncSession, user: User, req: PlanClaimRequest) -> SavedProperty:
    parts = req.address_parts
    zip_code = parts.zip or req.property_snapshot.get("zipCode")
    resolved = await resolve_assumptions(db, user=user, zip_code=zip_code)

    existing = await saved_property_service.get_by_address_or_id(db, str(user.id), address=req.address, zpid=req.zpid)

    snapshot = dict(req.property_snapshot)
    snapshot[PLAN_KEY] = _plan_metadata(req)
    update = scenario_to_record_update(req.scenario)

    if existing is not None:
        record: DealMakerRecord | None = None
        if isinstance(existing.deal_maker_record, dict):
            try:
                record = DealMakerService.from_dict(existing.deal_maker_record)
            except Exception as exc:
                logger.warning("Could not load existing Deal Maker record for plan claim: %s", exc)
        if record is None:
            record = DealMakerService.create_from_property_data(
                property_data=req.property_snapshot, zip_code=zip_code, resolved=resolved
            )
        record = DealMakerService.update_record(record, update)
        existing.deal_maker_record = record.model_dump(mode="json")
        merged_snapshot = dict(existing.property_data_snapshot or {})
        merged_snapshot[PLAN_KEY] = snapshot[PLAN_KEY]
        existing.property_data_snapshot = merged_snapshot
        await db.flush()
        return existing

    record = DealMakerService.create_from_property_data(
        property_data=req.property_snapshot, zip_code=zip_code, resolved=resolved
    )
    record = DealMakerService.update_record(record, update)

    create = SavedPropertyCreate(
        zpid=req.zpid,
        address_street=parts.street,
        address_city=parts.city,
        address_state=parts.state,
        address_zip=parts.zip,
        full_address=req.address,
        latitude=req.latitude,
        longitude=req.longitude,
        property_data_snapshot=snapshot,
        deal_maker_record=record,
    )
    return await saved_property_service.save_property(db, str(user.id), create)


def encode_scenario(scenario: PlanScenario) -> str:
    """Base64url of the ScenarioPayloadV1 JSON — same wire format as the frontend's ``encodeScenario``."""
    payload = {
        "v": 1,
        "structureId": scenario.structure_id,
        "family": scenario.family,
        "label": scenario.label,
        "levers": scenario.levers,
    }
    raw = json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def build_plan_redirect(saved: SavedProperty, scenario: PlanScenario | None) -> str:
    """Same-origin path the magic link lands on: the workbench with the plan applied."""
    params: dict[str, str] = {"propertyId": str(saved.id), "view": "workbench"}
    if saved.full_address:
        params["address"] = saved.full_address
    if scenario is not None:
        params["scenario"] = encode_scenario(scenario)
    return "/discovery?" + urlencode(params, quote_via=quote)


async def claim_plan(
    db: AsyncSession,
    req: PlanClaimRequest,
    *,
    ip_address: str | None = None,
) -> None:
    """Do the whole claim. Raises on unexpected failure; the router still returns 202."""
    user, created = await find_or_create_user(db, req.email, ip_address=ip_address)
    saved = await _save_or_update_property(db, user, req)

    raw_token = await token_service.create_verification_token(
        db, user.id, TokenType.MAGIC_LINK, expires_minutes=MAGIC_LINK_EXPIRES_MINUTES
    )
    await db.commit()

    frontend = (settings.FRONTEND_URL or "https://dealgapiq.com").rstrip("/")
    redirect = build_plan_redirect(saved, req.scenario)
    magic_url = f"{frontend}/auth/magic?" + urlencode({"token": raw_token, "next": redirect}, quote_via=quote)

    result = await email_service.send_plan_saved_email(
        to=user.email,
        address=saved.full_address or req.address,
        plan=req,
        magic_url=magic_url,
        is_new_user=created,
        expires_minutes=MAGIC_LINK_EXPIRES_MINUTES,
    )
    if not result.get("success"):
        logger.warning("Plan-saved email failed for %s: %s", user.email, result.get("error"))
