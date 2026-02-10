"""Serializers for assumptions and formula glossary API."""
from rest_framework import serializers

from .models import (
    AssumptionCategory,
    DefaultAssumption,
    AssumptionAuditLog,
    FormulaCategory,
    FormulaGlossary,
)


class DefaultAssumptionSerializer(serializers.ModelSerializer):
    """Serializer for DefaultAssumption (list/detail)."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    updated_by_email = serializers.SerializerMethodField()

    def get_updated_by_email(self, obj):
        return obj.updated_by.email if obj.updated_by else None

    class Meta:
        model = DefaultAssumption
        fields = [
            "id",
            "category",
            "category_name",
            "category_slug",
            "key",
            "label",
            "value",
            "description",
            "data_type",
            "is_active",
            "is_locked",
            "updated_by",
            "updated_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class AssumptionCategoryDetailSerializer(serializers.ModelSerializer):
    """Serializer for AssumptionCategory with nested assumptions."""

    assumptions = DefaultAssumptionSerializer(many=True, read_only=True)

    class Meta:
        model = AssumptionCategory
        fields = ["id", "name", "slug", "icon", "order", "assumptions"]


class AssumptionUpdateSerializer(serializers.Serializer):
    """Serializer for updating a single assumption value."""

    value = serializers.CharField(required=True, allow_blank=True)
    change_reason = serializers.CharField(required=False, allow_blank=True)

    def validate_value(self, value):
        """Optional type-specific validation based on assumption.data_type."""
        assumption = self.context.get("assumption")
        if not assumption:
            return value
        # allow_blank=True: empty string is permitted for all types
        if value == "":
            return value
        if assumption.data_type in ("number", "percentage", "currency"):
            try:
                float(value)
            except (ValueError, TypeError):
                raise serializers.ValidationError("Must be a valid number")
        elif assumption.data_type == "boolean":
            if value.lower() not in ("true", "false", "1", "0", "yes", "no"):
                raise serializers.ValidationError("Must be true or false")
        return value


class BulkUpdateItemSerializer(serializers.Serializer):
    """Single item for bulk update."""

    id = serializers.IntegerField()
    value = serializers.CharField()


class BulkAssumptionUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating multiple assumptions."""

    updates = BulkUpdateItemSerializer(many=True)
    change_reason = serializers.CharField(required=False, allow_blank=True)


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AssumptionAuditLog."""

    assumption_key = serializers.CharField(
        source="assumption.key",
        read_only=True,
    )
    changed_by_email = serializers.SerializerMethodField()

    def get_changed_by_email(self, obj):
        return obj.changed_by.email if obj.changed_by else None

    class Meta:
        model = AssumptionAuditLog
        fields = [
            "id",
            "assumption",
            "assumption_key",
            "changed_by",
            "changed_by_email",
            "old_value",
            "new_value",
            "change_reason",
            "ip_address",
            "timestamp",
        ]


class FormulaGlossarySerializer(serializers.ModelSerializer):
    """Serializer for FormulaGlossary."""

    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = FormulaGlossary
        fields = [
            "id",
            "category",
            "category_name",
            "category_slug",
            "slug",
            "name",
            "abbreviation",
            "definition",
            "formula_expression",
            "tags",
            "complexity",
            "is_active",
            "related_assumptions",
            "created_at",
            "updated_at",
        ]


class FormulaCategoryDetailSerializer(serializers.ModelSerializer):
    """Serializer for FormulaCategory with formula count."""

    formula_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = FormulaCategory
        fields = ["id", "name", "slug", "icon", "color", "order", "formula_count"]
