"""Make payloads safe for Starlette JSONResponse (allow_nan=False).

Starlette serializes with ``json.dumps(..., allow_nan=False)``. A single
NaN or Inf in a nested float 500s the whole page with
"Out of range float values are not JSON compliant". Walk the dumped
payload and replace non-finite floats with None, logging the field path
so a new producer cannot hide.
"""

from __future__ import annotations

import logging
import math
from typing import Any, TypeVar

from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def sanitize_non_finite(obj: Any, *, _path: str = "", log: bool = True) -> Any:
    """Recursively replace non-finite floats (NaN, Inf, -Inf) with None."""
    if isinstance(obj, dict):
        return {
            key: sanitize_non_finite(
                value,
                _path=f"{_path}.{key}" if _path else str(key),
                log=log,
            )
            for key, value in obj.items()
        }
    if isinstance(obj, list):
        return [
            sanitize_non_finite(value, _path=f"{_path}[{index}]", log=log)
            for index, value in enumerate(obj)
        ]
    if isinstance(obj, float) and not math.isfinite(obj):
        if log:
            logger.warning(
                "Non-finite float at %s (%s) replaced with None",
                _path or "<root>",
                obj,
            )
        return None
    return obj


def dump_json_safe(model: BaseModel, *, by_alias: bool = True) -> Any:
    """``model_dump(mode='json')`` then strip non-finite floats."""
    return sanitize_non_finite(model.model_dump(mode="json", by_alias=by_alias))


def finite_model(model: T) -> T:
    """Re-validate a model after replacing non-finite floats with None."""
    return type(model).model_validate(sanitize_non_finite(model.model_dump()))
