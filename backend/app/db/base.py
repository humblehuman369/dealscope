"""
SQLAlchemy Base class for all models.
Import all models here to ensure they're registered with SQLAlchemy.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Naming convention for constraints (helps with migrations)
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    metadata = MetaData(naming_convention=convention)

    def __repr__(self):
        """Generate a useful repr for debugging."""
        class_name = self.__class__.__name__
        attrs = []
        for col in self.__table__.columns:
            if col.name in ("id", "email", "name", "title"):
                value = getattr(self, col.name, None)
                if value is not None:
                    attrs.append(f"{col.name}={value!r}")
        return f"<{class_name}({', '.join(attrs)})>"
