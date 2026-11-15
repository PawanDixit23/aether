"""001_initial_schema_baseline

Revision ID: 226edc33d8a1
Revises:
Create Date: 2026-10-31 10:40:19.509254
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "226edc33d8a1"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply baseline indexes/type normalization idempotently.

    Inspect the live schema before issuing DDL. Catching a PostgreSQL DDL
    exception inside the migration is unsafe: PostgreSQL marks the current
    transaction as aborted, so subsequent statements (including Alembic's
    version-table update) fail with InFailedSqlTransaction.
    """
    bind = op.get_bind()
    inspector = inspect(bind)

    indexes = [
        ("ix_audit_logs_user_email", "audit_logs", ["user_email"]),
        ("ix_chat_messages_user_email", "chat_messages", ["user_email"]),
        ("ix_financial_records_user_email", "financial_records", ["user_email"]),
        ("ix_memory_vault_user_email", "memory_vault", ["user_email"]),
    ]

    for index_name, table_name, columns in indexes:
        if not inspector.has_table(table_name):
            continue
        existing_indexes = {
            index.get("name") for index in inspector.get_indexes(table_name)
        }
        if index_name not in existing_indexes:
            table_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            if all(column in table_columns for column in columns):
                op.create_index(
                    op.f(index_name),
                    table_name,
                    columns,
                    unique=False,
                )

    if inspector.has_table("tasks"):
        task_columns = {
            column["name"]: column
            for column in inspector.get_columns("tasks")
        }

        reminder_column = task_columns.get("reminder_time")
        if reminder_column is not None and isinstance(reminder_column["type"], sa.Text):
            op.alter_column(
                "tasks",
                "reminder_time",
                existing_type=sa.Text(),
                type_=sa.String(),
                existing_nullable=reminder_column.get("nullable", True),
            )

        existing_task_indexes = {
            index.get("name") for index in inspector.get_indexes("tasks")
        }
        if (
            "user_email" in task_columns
            and "ix_tasks_user_email" not in existing_task_indexes
        ):
            op.create_index(
                op.f("ix_tasks_user_email"),
                "tasks",
                ["user_email"],
                unique=False,
            )


def downgrade() -> None:
    """Reverse the baseline schema changes where present."""
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("tasks"):
        task_columns = {
            column["name"]: column
            for column in inspector.get_columns("tasks")
        }
        task_indexes = {
            index.get("name") for index in inspector.get_indexes("tasks")
        }
        if "ix_tasks_user_email" in task_indexes:
            op.drop_index(op.f("ix_tasks_user_email"), table_name="tasks")

        reminder_column = task_columns.get("reminder_time")
        if reminder_column is not None and isinstance(reminder_column["type"], sa.String):
            op.alter_column(
                "tasks",
                "reminder_time",
                existing_type=sa.String(),
                type_=sa.Text(),
                existing_nullable=reminder_column.get("nullable", True),
            )

    for index_name, table_name in [
        ("ix_memory_vault_user_email", "memory_vault"),
        ("ix_financial_records_user_email", "financial_records"),
        ("ix_chat_messages_user_email", "chat_messages"),
        ("ix_audit_logs_user_email", "audit_logs"),
    ]:
        if inspector.has_table(table_name):
            existing_indexes = {
                index.get("name") for index in inspector.get_indexes(table_name)
            }
            if index_name in existing_indexes:
                op.drop_index(op.f(index_name), table_name=table_name)
