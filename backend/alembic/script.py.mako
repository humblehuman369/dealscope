"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}

# ---------------------------------------------------------------------------
# PRODUCTION INDEX GUIDE
# ---------------------------------------------------------------------------
# For CREATE INDEX on existing tables with live traffic, ALWAYS use
# ``CREATE INDEX CONCURRENTLY`` to avoid locking the table.  Because
# CONCURRENTLY cannot run inside a transaction, you must:
#
#   1. Pass ``postgresql_concurrently=True`` to ``op.create_index()``.
#   2. Wrap the migration function with ``@run_outside_transaction``:
#
#        from alembic.operations import ops
#
#        def upgrade() -> None:
#            with op.get_context().autocommit_block():
#                op.create_index(
#                    "ix_my_table_col",
#                    "my_table",
#                    ["col"],
#                    postgresql_concurrently=True,
#                )
#
# See: https://alembic.sqlalchemy.org/en/latest/batch.html#concurrently
# ---------------------------------------------------------------------------


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}

