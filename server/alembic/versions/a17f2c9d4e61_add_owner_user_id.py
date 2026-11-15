"""Add verified Supabase owner UUIDs and PostgreSQL tenant RLS.

Revision ID: a17f2c9d4e61
Revises: 887d14dfae4a
Create Date: 2026-11-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

from database import Base
import models  # register all tenant-owned models in Base.metadata

revision = "a17f2c9d4e61"
down_revision = "887d14dfae4a"
branch_labels = None
depends_on = None

TABLES = (
    "tasks",
    "financial_records",
    "memory_vault",
    "audit_logs",
    "chat_messages",
    "push_subscriptions",
    "scheduled_jobs",
)


def upgrade():
    bind = op.get_bind()
    # The legacy baseline migration predates complete table creation; create any
    # model tables that are missing before enabling RLS across the full tenant set.
    Base.metadata.create_all(bind=bind)
    existing_tables = set(inspect(bind).get_table_names())
    for table in TABLES:
        if table not in existing_tables:
            continue
        columns = {col["name"] for col in inspect(bind).get_columns(table)}
        if "owner_user_id" not in columns:
            op.add_column(table, sa.Column("owner_user_id", sa.String(length=36), nullable=True))
        indexes = {idx["name"] for idx in inspect(bind).get_indexes(table)}
        index_name = f"ix_{table}_owner_user_id"
        if index_name not in indexes:
            op.create_index(index_name, table, ["owner_user_id"], unique=False)

    if bind.dialect.name == "postgresql":
        for table in TABLES:
            if table not in existing_tables:
                continue
            policy_name = f"aether_tenant_isolation_{table}"
            op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
            op.execute(f'ALTER TABLE "{table}" FORCE ROW LEVEL SECURITY')
            op.execute(f'DROP POLICY IF EXISTS "{policy_name}" ON "{table}"')

            tenant_select = """
                COALESCE(current_setting('app.is_worker', true), 'false') = 'true'
                OR (
                    NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL
                    AND owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')
                )
                OR (
                    owner_user_id IS NULL
                    AND NULLIF(current_setting('app.current_user_email', true), '') IS NOT NULL
                    AND lower(COALESCE(user_email, '')) =
                        lower(current_setting('app.current_user_email', true))
                )
                OR (
                    COALESCE(current_setting('app.is_webhook_service', true), 'false') = 'true'
                    AND NULLIF(current_setting('app.current_user_email', true), '') IS NOT NULL
                    AND lower(COALESCE(user_email, '')) =
                        lower(current_setting('app.current_user_email', true))
                )
                OR (
                    COALESCE(current_setting('app.is_owner', true), 'false') = 'true'
                    AND (user_email IS NULL OR lower(user_email) IN ('', 'operator@aether.ai'))
                )
            """
            tenant_check = """
                COALESCE(current_setting('app.is_worker', true), 'false') = 'true'
                OR (
                    NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL
                    AND owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')
                    AND (
                        user_email IS NULL
                        OR lower(COALESCE(user_email, '')) =
                           lower(current_setting('app.current_user_email', true))
                    )
                )
                OR (
                    owner_user_id IS NULL
                    AND NULLIF(current_setting('app.current_user_email', true), '') IS NOT NULL
                    AND lower(COALESCE(user_email, '')) =
                        lower(current_setting('app.current_user_email', true))
                )
                OR (
                    COALESCE(current_setting('app.is_webhook_service', true), 'false') = 'true'
                    AND NULLIF(current_setting('app.current_user_email', true), '') IS NOT NULL
                    AND lower(COALESCE(user_email, '')) =
                        lower(current_setting('app.current_user_email', true))
                )
                OR (
                    COALESCE(current_setting('app.is_owner', true), 'false') = 'true'
                    AND owner_user_id = NULLIF(current_setting('app.current_user_id', true), '')
                    AND lower(COALESCE(user_email, '')) =
                        lower(current_setting('app.current_user_email', true))
                )
            """
            if table == "memory_vault":
                webhook_pairing_access = """
                    COALESCE(current_setting('app.is_webhook_service', true), 'false') = 'true'
                    AND category IN ('telegram_pairing', 'whatsapp_pairing')
                """
                tenant_select += " OR (" + webhook_pairing_access + ")"
                tenant_check += " OR (" + webhook_pairing_access + ")"
            op.execute(
                f'CREATE POLICY "{policy_name}" ON "{table}" '
                f'FOR ALL USING ({tenant_select}) WITH CHECK ({tenant_check})'
            )


def downgrade():
    bind = op.get_bind()
    existing_tables = set(inspect(bind).get_table_names())
    for table in reversed(TABLES):
        if table not in existing_tables:
            continue
        if bind.dialect.name == "postgresql":
            policy_name = f"aether_tenant_isolation_{table}"
            op.execute(f'DROP POLICY IF EXISTS "{policy_name}" ON "{table}"')
            op.execute(f'ALTER TABLE "{table}" NO FORCE ROW LEVEL SECURITY')
            op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
        indexes = {idx["name"] for idx in inspect(bind).get_indexes(table)}
        index_name = f"ix_{table}_owner_user_id"
        if index_name in indexes:
            op.drop_index(index_name, table_name=table)
        columns = {col["name"] for col in inspect(bind).get_columns(table)}
        if "owner_user_id" in columns:
            op.drop_column(table, "owner_user_id")
