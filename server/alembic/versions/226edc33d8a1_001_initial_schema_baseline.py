"""001_initial_schema_baseline

Revision ID: 226edc33d8a1
Revises:
Create Date: 2026-10-31 10:40:19.509254
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "226edc33d8a1"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply baseline indexes only when their target tables/columns exist."""
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())
    indexes = [
        ("ix_audit_logs_user_email", "audit_logs", ["user_email"]),
        ("ix_chat_messages_user_email", "chat_messages", ["user_email"]),
        ("ix_financial_records_user_email", "financial_records", ["user_email"]),
        ("ix_memory_vault_user_email", "memory_vault", ["user_email"]),
    ]

    for index_name, table, columns in indexes:
        if table not in tables:
            continue
        existing_columns = {column["name"] for column in inspect(bind).get_columns(table)}
        if not set(columns).issubset(existing_columns):
            continue
        existing_indexes = {index["name"] for index in inspect(bind).get_indexes(table)}
        if index_name not in existing_indexes:
            op.create_index(index_name, table, columns, unique=False)

    if "tasks" in tables:
        task_columns = {column["name"]: column for column in inspect(bind).get_columns("tasks")}
        if "reminder_time" in task_columns and "TEXT" in str(task_columns["reminder_time"]["type"]).upper():
            column = task_columns["reminder_time"]
            with op.batch_alter_table("tasks") as batch_op:
                batch_op.alter_column(
                    "reminder_time",
                    existing_type=column["type"],
                    type_=sa.String(),
                    existing_nullable=column["nullable"],
                )

        task_columns = {column["name"] for column in inspect(bind).get_columns("tasks")}
        task_indexes = {index["name"] for index in inspect(bind).get_indexes("tasks")}
        if "user_email" in task_columns and "ix_tasks_user_email" not in task_indexes:
            op.create_index("ix_tasks_user_email", "tasks", ["user_email"], unique=False)


def downgrade() -> None:
    """Reverse only baseline objects that exist."""
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    for index_name, table in (
        ("ix_audit_logs_user_email", "audit_logs"),
        ("ix_chat_messages_user_email", "chat_messages"),
        ("ix_financial_records_user_email", "financial_records"),
        ("ix_memory_vault_user_email", "memory_vault"),
        ("ix_tasks_user_email", "tasks"),
    ):
        if table in tables:
            existing_indexes = {index["name"] for index in inspect(bind).get_indexes(table)}
            if index_name in existing_indexes:
                op.drop_index(index_name, table_name=table)

    if "tasks" in tables:
        task_columns = {column["name"]: column for column in inspect(bind).get_columns("tasks")}
        if "reminder_time" in task_columns and "TEXT" not in str(task_columns["reminder_time"]["type"]).upper():
            column = task_columns["reminder_time"]
            with op.batch_alter_table("tasks") as batch_op:
                batch_op.alter_column(
                    "reminder_time",
                    existing_type=column["type"],
                    type_=sa.TEXT(),
                    existing_nullable=column["nullable"],
                )
