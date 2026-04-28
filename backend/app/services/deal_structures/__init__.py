"""Deal Structures — generates "Three Paths" alternatives for negative Deal Gap properties.

Public entry point: ``compute_deal_structures``.
All structure math stays in this module; callers pass in already-resolved inputs.
"""

from app.services.deal_structures.engine import compute_deal_structures

__all__ = ["compute_deal_structures"]
