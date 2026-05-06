"""
Receipt-image parser — extracts vendor / amount / date / suggested budget
line from a photo or PDF using Claude vision. Returns ``None`` for fields
the model can't read with reasonable confidence; the frontend treats every
field as editable so a confident model is a nice-to-have, not a hard
dependency.

Lazy-loads the Anthropic client the same way appraisal_narrative_service
does — keeps cold start fast and degrades to "manual entry" when the API
key isn't configured.
"""

from __future__ import annotations

import base64
import json
import logging
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


_anthropic_client = None
_anthropic_checked = False


def _ensure_anthropic():
    global _anthropic_client, _anthropic_checked
    if _anthropic_checked:
        return _anthropic_client
    _anthropic_checked = True
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        logger.info("ANTHROPIC_API_KEY not set — receipt parsing disabled")
        return None
    try:
        import anthropic

        _anthropic_client = anthropic.Anthropic(api_key=api_key, timeout=20.0, max_retries=1)
        return _anthropic_client
    except Exception as exc:
        logger.error("Anthropic client init failed in receipt parser: %s", exc)
        return None


# Mime types the vision model accepts as image content. PDFs go through the
# document content type instead (Claude supports both since the .pdf source
# variant). We surface the format mismatch as a 400 in the router.
_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_PDF_MIME_TYPE = "application/pdf"


_PROMPT = (
    "You are extracting structured data from a single receipt or invoice image.\n"
    "Return ONLY a JSON object with these keys (use null when unsure):\n"
    "  vendor: string — merchant name as printed on the receipt\n"
    "  amount: string — total paid, just the number (e.g. \"127.45\"). Prefer the "
    "grand total over subtotals. No currency symbols, no thousands separators.\n"
    "  spent_on: string in YYYY-MM-DD format — transaction date\n"
    "  suggested_line_id: string — best match from the AVAILABLE LINES list "
    "below, or null if nothing fits well\n"
    "  description: string — short summary of what was purchased (e.g. "
    "\"Drywall and joint compound\"). Keep under 80 chars.\n"
    "Do not include commentary or markdown — JSON only."
)


class ReceiptParserService:
    async def parse(
        self,
        *,
        image_bytes: bytes,
        mime_type: str,
        available_lines: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any] | None:
        """Run the vision call. Returns a dict matching ``ParsedReceipt`` or
        ``None`` when the model is unavailable / errored / returned garbage.
        """
        client = _ensure_anthropic()
        if not client:
            return None

        # Build the line-context block. The model picks ``suggested_line_id``
        # from this list; an empty list means we just don't suggest a line.
        lines_block = "\n".join(
            f"- {line['id']}: {line['label']} (category {line.get('category_id', '?')})"
            for line in (available_lines or [])
        ) or "(none)"

        # Choose content shape based on mime type.
        if mime_type in _IMAGE_MIME_TYPES:
            attachment = {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": base64.standard_b64encode(image_bytes).decode("ascii"),
                },
            }
        elif mime_type == _PDF_MIME_TYPE:
            attachment = {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": base64.standard_b64encode(image_bytes).decode("ascii"),
                },
            }
        else:
            return None

        prompt = f"{_PROMPT}\n\nAVAILABLE LINES:\n{lines_block}"

        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            attachment,
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
            )
        except Exception as exc:
            logger.error("Claude receipt parse failed: %s", exc)
            return None

        try:
            text = message.content[0].text.strip()
        except (AttributeError, IndexError) as exc:
            logger.warning("Unexpected Claude response shape: %s", exc)
            return None

        return _parse_model_output(text, available_lines or [])


def _parse_model_output(
    raw: str, available_lines: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """Parse Claude's response into the ParsedReceipt-shaped dict.

    Defensive against models that wrap JSON in code fences or trailing prose.
    Returns ``None`` only if we can't even find a JSON object.
    """
    # Strip optional ```json fences.
    cleaned = raw
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    # Find the first {...} block — ignores any trailing text.
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None

    vendor = _safe_str(data.get("vendor"))
    description = _safe_str(data.get("description"))
    amount = _safe_amount(data.get("amount"))
    spent_on = _safe_date(data.get("spent_on"))
    suggested_line_id = _validate_line_id(data.get("suggested_line_id"), available_lines)

    return {
        "vendor": vendor,
        "amount": str(amount) if amount is not None else None,
        "spent_on": spent_on.isoformat() if spent_on else None,
        "suggested_line_id": suggested_line_id,
        "description": description,
    }


def _safe_str(value: Any, *, max_len: int = 255) -> str | None:
    if not isinstance(value, str):
        return None
    s = value.strip()
    if not s:
        return None
    return s[:max_len]


def _safe_amount(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        s = str(value).replace("$", "").replace(",", "").strip()
        d = Decimal(s)
        if d < 0:
            return None
        # Round-trip to avoid weird precision bleed from the model.
        return d.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None


def _safe_date(value: Any) -> date | None:
    if not isinstance(value, str):
        return None
    s = value.strip()[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def _validate_line_id(
    value: Any, available_lines: list[dict[str, Any]]
) -> str | None:
    """Only return the suggested id if it actually appears in the supplied
    list — guard against the model hallucinating IDs."""
    if not isinstance(value, str) or not available_lines:
        return None
    candidate = value.strip()
    valid = {str(line["id"]) for line in available_lines}
    return candidate if candidate in valid else None


receipt_parser_service = ReceiptParserService()
