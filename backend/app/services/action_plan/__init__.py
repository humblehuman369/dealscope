"""Action Plan — case sorting, template plans, and apply.

Phase 0 has no AI. Research and writing land in later phases.
"""

from app.services.action_plan.apply import apply_action_plan
from app.services.action_plan.cases import sort_case
from app.services.action_plan.templates import build_template_plan

__all__ = ["apply_action_plan", "build_template_plan", "sort_case"]
