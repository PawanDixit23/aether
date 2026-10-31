"""add_scheduled_jobs_table

Revision ID: 887d14dfae4a
Revises: 226edc33d8a1
Create Date: 2026-10-31 16:06:14.917546

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '887d14dfae4a'
down_revision: Union[str, Sequence[str], None] = '226edc33d8a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'scheduled_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_email', sa.String(), nullable=True),
        sa.Column('job_type', sa.String(), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(), nullable=True, server_default='pending'),
        sa.Column('attempts', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scheduled_jobs_id'), 'scheduled_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_scheduled_jobs_user_email'), 'scheduled_jobs', ['user_email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_scheduled_jobs_user_email'), table_name='scheduled_jobs')
    op.drop_index(op.f('ix_scheduled_jobs_id'), table_name='scheduled_jobs')
    op.drop_table('scheduled_jobs')
