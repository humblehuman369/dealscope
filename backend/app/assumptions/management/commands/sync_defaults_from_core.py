"""
Management command to sync DefaultAssumption records from app.core.defaults (get_all_defaults).

Preserves logic from backend/app/models/assumption_defaults.py and app/core/defaults.py
by populating the structured AssumptionCategory and DefaultAssumption models from
the centralized default values.

Usage:
    python manage.py sync_defaults_from_core
"""
from django.core.management.base import BaseCommand

from app.assumptions.models import AssumptionCategory, DefaultAssumption


class Command(BaseCommand):
    help = "Sync AssumptionCategory and DefaultAssumption from app.core.defaults"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without writing",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        try:
            from app.core.defaults import get_all_defaults
        except ImportError:
            self.stdout.write(
                self.style.WARNING(
                    "app.core.defaults not found (FastAPI app). "
                    "Skipping sync - create categories/assumptions manually or via admin."
                )
            )
            return

        defaults = get_all_defaults()
        created_cats = 0
        created_assumptions = 0
        order = 0

        for category_key, category_data in defaults.items():
            if not isinstance(category_data, dict):
                continue

            cat, created = AssumptionCategory.objects.get_or_create(
                slug=category_key,
                defaults={
                    "name": category_key.replace("_", " ").title(),
                    "icon": "",
                    "order": order,
                },
            )
            if created:
                created_cats += 1
                order += 1
                if not dry_run:
                    self.stdout.write(f"  Created category: {cat.slug}")

            for key, value in category_data.items():
                if isinstance(value, (dict, list)):
                    continue
                _, a_created = DefaultAssumption.objects.get_or_create(
                    category=cat,
                    key=key,
                    defaults={
                        "label": key.replace("_", " ").title(),
                        "value": str(value),
                        "data_type": "number"
                        if isinstance(value, (int, float))
                        else "string",
                        "is_active": True,
                    },
                )
                if a_created:
                    created_assumptions += 1
                    if not dry_run:
                        self.stdout.write(f"    Created: {cat.slug}.{key} = {value}")

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Dry run: would create {created_cats} categories, "
                    f"{created_assumptions} assumptions"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Synced: {created_cats} categories, {created_assumptions} assumptions"
                )
            )
