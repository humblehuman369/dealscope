from django.apps import AppConfig


class AssumptionsConfig(AppConfig):
    """Configuration for the assumptions admin app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "app.assumptions"
    verbose_name = "Assumption Defaults & Formula Glossary"
