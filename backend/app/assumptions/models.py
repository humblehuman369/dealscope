"""
Assumption and formula glossary models.

Preserves concepts from app.models.assumption_defaults (AdminAssumptionDefaults)
while providing structured, auditable per-key assumption management.
"""
from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField


class AssumptionCategory(models.Model):
    """Category for grouping default assumptions (e.g. financing, operating)."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Assumption categories"

    def __str__(self):
        return self.name


class DefaultAssumption(models.Model):
    """
    Individual default assumption value.
    Replaces flat JSON structure with auditable, per-key records.
    """

    DATA_TYPES = [
        ("number", "Number"),
        ("percentage", "Percentage"),
        ("boolean", "Boolean"),
        ("string", "String"),
        ("currency", "Currency"),
    ]

    category = models.ForeignKey(
        AssumptionCategory,
        on_delete=models.CASCADE,
        related_name="assumptions",
    )
    key = models.CharField(max_length=100)
    label = models.CharField(max_length=255)
    value = models.TextField(default="")
    description = models.TextField(blank=True)
    data_type = models.CharField(max_length=20, choices=DATA_TYPES, default="number")
    is_active = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_assumptions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "key"]
        unique_together = [["category", "key"]]

    def __str__(self):
        return f"{self.category.slug}.{self.key}"


class AssumptionAuditLog(models.Model):
    """Audit trail for assumption value changes."""

    assumption = models.ForeignKey(
        DefaultAssumption,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="assumption_changes",
    )
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    change_reason = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.assumption} changed by {self.changed_by} at {self.timestamp}"


class FormulaCategory(models.Model):
    """Category for formula glossary entries."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=20, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Formula categories"

    def __str__(self):
        return self.name


class FormulaGlossary(models.Model):
    """Formula definition and documentation for metrics."""

    COMPLEXITY_CHOICES = [
        ("simple", "Simple"),
        ("moderate", "Moderate"),
        ("advanced", "Advanced"),
    ]

    category = models.ForeignKey(
        FormulaCategory,
        on_delete=models.CASCADE,
        related_name="formulas",
    )
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    abbreviation = models.CharField(max_length=20, blank=True)
    definition = models.TextField()
    formula_expression = models.TextField(blank=True)
    tags = ArrayField(
        models.CharField(max_length=50, blank=True),
        default=list,
        blank=True,
        help_text="Tags for search and related formulas",
    )
    complexity = models.CharField(
        max_length=20,
        choices=COMPLEXITY_CHOICES,
        default="moderate",
    )
    is_active = models.BooleanField(default=True)
    related_assumptions = models.ManyToManyField(
        DefaultAssumption,
        related_name="formulas",
        blank=True,
        help_text="Assumptions used in this formula",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]
        verbose_name_plural = "Formula glossary"

    def __str__(self):
        return self.name

    def get_related_formulas(self, limit=10):
        """Return formulas that share tags or are in the same category."""
        if not self.tags:
            return (
                FormulaGlossary.objects.filter(
                    category=self.category, is_active=True
                )
                .exclude(pk=self.pk)
                .select_related("category")[:limit]
            )
        from django.db.models import Q

        # tags__overlap works with PostgreSQL ArrayField
        tag_filter = Q(tags__overlap=self.tags) | Q(category=self.category)
        return (
            FormulaGlossary.objects.filter(tag_filter, is_active=True)
            .exclude(pk=self.pk)
            .select_related("category")
            .distinct()[:limit]
        )
