"""row level security policies

Revision ID: 99eedb16dff3
Revises: aa7522716f77
Create Date: 2026-07-22 18:42:10.686430

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '99eedb16dff3'
down_revision: Union[str, None] = 'aa7522716f77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables carrying a `tenant_id` column that must be tenant-isolated.
TENANT_SCOPED_TABLES = [
    "consumption_points",
    "users",
    "documents",
    "meters",
    "invoices",
    "invoice_line_items",
    "meter_readings",
    "processing_runs",
    "validation_issues",
    "audit_log",
]

# The policy allows full access when no tenant context has been set on the
# connection (SET LOCAL app.current_tenant_id ...) — this is the case for
# trusted backend-internal sessions (e.g. login lookup by email across
# tenants, super admin operations). Regular request-handling code always
# opens a tenant_scoped_session (see app/db/session.py) which sets the
# tenant context, and RLS then acts as a second line of defense against an
# application bug that forgets a `WHERE tenant_id = ...` filter.
POLICY_USING_CLAUSE = (
    "tenant_id = current_setting('app.current_tenant_id', true)::uuid "
    "OR current_setting('app.current_tenant_id', true) IS NULL"
)


def upgrade() -> None:
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation_{table} ON {table} "
            f"USING ({POLICY_USING_CLAUSE})"
        )


def downgrade() -> None:
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
