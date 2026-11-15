"""Add verified Supabase owner UUIDs to tenant-owned records.

Revision ID: a17f2c9d4e61
Revises: 887d14dfae4a
Create Date: 2026-11-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

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
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())
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


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())
    for table in reversed(TABLES):
        if table not in existing_tables:
            continue
        indexes = {idx["name"] for idx in inspect(bind).get_indexes(table)}
        index_name = f"ix_{table}_owner_user_id"
        if index_name in indexes:
            op.drop_index(index_name, table_name=table)
        columns = {col["name"] for col in inspect(bind).get_columns(table)}
        if "owner_user_id" in columns:
            op.drop_column(table, "owner_user_id")
