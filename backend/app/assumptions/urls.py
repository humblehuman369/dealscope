"""URL configuration for assumptions app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"categories", views.AssumptionCategoryViewSet, basename="assumptioncategory")
router.register(r"assumptions", views.DefaultAssumptionViewSet, basename="defaultassumption")
router.register(r"audit-logs", views.AuditLogViewSet, basename="auditlog")
router.register(r"formulas", views.FormulaGlossaryViewSet, basename="formulaglossary")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", views.DashboardSummaryView.as_view(), name="dashboard-summary"),
]
