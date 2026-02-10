"""Django admin registration for assumptions app."""
from django.contrib import admin
from .models import (
    AssumptionCategory,
    DefaultAssumption,
    AssumptionAuditLog,
    FormulaCategory,
    FormulaGlossary,
)


@admin.register(AssumptionCategory)
class AssumptionCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "order"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["order", "name"]


@admin.register(DefaultAssumption)
class DefaultAssumptionAdmin(admin.ModelAdmin):
    list_display = ["key", "label", "category", "value", "data_type", "is_active", "is_locked"]
    list_filter = ["category", "data_type", "is_active", "is_locked"]
    search_fields = ["key", "label", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(AssumptionAuditLog)
class AssumptionAuditLogAdmin(admin.ModelAdmin):
    list_display = ["assumption", "changed_by", "old_value", "new_value", "timestamp"]
    list_filter = ["timestamp"]
    readonly_fields = ["assumption", "changed_by", "old_value", "new_value", "timestamp"]
    date_hierarchy = "timestamp"


@admin.register(FormulaCategory)
class FormulaCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "order"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["order", "name"]


@admin.register(FormulaGlossary)
class FormulaGlossaryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "category", "complexity", "is_active"]
    list_filter = ["category", "complexity", "is_active"]
    search_fields = ["name", "abbreviation", "definition"]
    filter_horizontal = ["related_assumptions"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
