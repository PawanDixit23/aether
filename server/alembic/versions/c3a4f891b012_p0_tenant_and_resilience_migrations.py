"""p0_tenant_and_resilience_migrations

Revision ID: c3a4f891b012
Revises: 887d14dfae4a
Create Date: 2026-11-15 17:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3a4f891b012'
down_revision: Union[str, Sequence[str], None] = '887d14dfae4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Scheduled jobs tenant & idempotency columns (CI fix & AETH-P0-02)
    if 'scheduled_jobs' in tables:
        cols = {c['name'].lower() for c in inspector.get_columns('scheduled_jobs')}
        with op.batch_alter_table('scheduled_jobs') as batch_op:
            if 'owner_user_id' not in cols:
                batch_op.add_column(sa.Column('owner_user_id', sa.String(), nullable=True))
                batch_op.create_index(batch_op.f('ix_scheduled_jobs_owner_user_id'), ['owner_user_id'], unique=False)
            if 'idempotency_key' not in cols:
                batch_op.add_column(sa.Column('idempotency_key', sa.String(), nullable=True))
                batch_op.create_index(batch_op.f('ix_scheduled_jobs_idempotency_key'), ['idempotency_key'], unique=False)

    # 2. Unique constraint on sender_pairing_rate_limits (AETH-P0-05)
    if 'sender_pairing_rate_limits' in tables:
        existing_uqs = {u['name'] for u in inspector.get_unique_constraints('sender_pairing_rate_limits') if u.get('name')}
        if 'uq_sender_pairing_rate_limit' not in existing_uqs:
            # Deduplicate sender_pairing_rate_limits before creating unique constraint
            if bind.dialect.name == "postgresql":
                bind.execute(sa.text("""
                    DELETE FROM sender_pairing_rate_limits a USING sender_pairing_rate_limits b
                    WHERE a.id < b.id AND a.channel = b.channel AND a.sender = b.sender;
                """))
            else:
                bind.execute(sa.text("""
                    DELETE FROM sender_pairing_rate_limits
                    WHERE id NOT IN (
                        SELECT MAX(id) FROM sender_pairing_rate_limits GROUP BY channel, sender
                    );
                """))
            with op.batch_alter_table('sender_pairing_rate_limits') as batch_op:
                batch_op.create_unique_constraint('uq_sender_pairing_rate_limit', ['channel', 'sender'])

    # 3. Processed webhook events status column
    if 'processed_webhook_events' in tables:
        p_cols = {c['name'].lower() for c in inspector.get_columns('processed_webhook_events')}
        if 'status' not in p_cols:
            with op.batch_alter_table('processed_webhook_events') as batch_op:
                batch_op.add_column(sa.Column('status', sa.String(), nullable=False, server_default='processed'))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'sender_pairing_rate_limits' in tables:
        with op.batch_alter_table('sender_pairing_rate_limits') as batch_op:
            batch_op.drop_constraint('uq_sender_pairing_rate_limit', type_='unique')

    if 'scheduled_jobs' in tables:
        with op.batch_alter_table('scheduled_jobs') as batch_op:
            batch_op.drop_index(batch_op.f('ix_scheduled_jobs_idempotency_key'))
            batch_op.drop_index(batch_op.f('ix_scheduled_jobs_owner_user_id'))
            batch_op.drop_column('idempotency_key')
            batch_op.drop_column('owner_user_id')
