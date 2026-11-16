import os
from typing import Optional, Any, Dict, List
from fastapi import Request
from sqlalchemy import create_engine, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Support persistent cloud PostgreSQL (Supabase / Render / Neon) or local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
if not DATABASE_URL:
    DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "aether.db"))
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# Normalize PostgreSQL URL for SQLAlchemy:
# SQLAlchemy 2 defaults postgresql:// to psycopg (v3). To guarantee compatibility with
# both psycopg2 and psycopg v3 drivers without errors:
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {"check_same_thread": False, "timeout": 15} if DATABASE_URL.startswith("sqlite") else {}

# Keep each API worker's database footprint predictable. The application runs a
# single Uvicorn worker on the Render 512 MB service; a small bounded pool prevents
# request bursts from opening an unbounded number of PostgreSQL connections.
engine_options = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
}
if DATABASE_URL.startswith(("postgresql://", "postgresql+")):
    engine_options.update({
        "pool_size": int(os.environ.get("DB_POOL_SIZE", "3")),
        "max_overflow": int(os.environ.get("DB_POOL_MAX_OVERFLOW", "2")),
        "pool_timeout": int(os.environ.get("DB_POOL_TIMEOUT_SECONDS", "10")),
        "pool_recycle": int(os.environ.get("DB_POOL_RECYCLE_SECONDS", "1800")),
        "pool_use_lifo": True,
        # Bound runaway SQL and lock waits at the database connection level.
        "connect_args": {
            **connect_args,
            "options": "-c statement_timeout=10000 -c lock_timeout=3000",
            "connect_timeout": 10,
        },
    })

engine = create_engine(DATABASE_URL, **engine_options)

# Concurrency & Reliability Hardening for SQLite:
# Configure WAL once per process. Re-running PRAGMA journal_mode=WAL on every
# newly opened connection can itself contend for SQLite's schema/database lock
# when another session has an active transaction (notably TestClient + worker sessions).
# Per-connection settings remain in the connect hook.
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.close()

    # journal_mode is persistent for the database file; set it once during engine
    # initialization rather than attempting to change it on every connection.
    with engine.connect() as sqlite_connection:
        sqlite_connection.exec_driver_sql("PRAGMA journal_mode=WAL")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@event.listens_for(SessionLocal, "after_begin")
def receive_after_begin(session, transaction, connection):
    """Re-applies transaction-local PostgreSQL RLS context whenever a new transaction begins (AETH-P0-02)."""
    user_id = session.info.get("rls_user_id")
    if user_id and "postgres" in str(engine.url).lower():
        try:
            connection.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": str(user_id).strip()})
        except Exception as e:
            raise RuntimeError(f"Failed to apply transaction-local RLS security context: {e}")

Base = declarative_base()

def get_db(request: Request = None):
    """FastAPI database dependency wired with transaction-local RLS context (AETH-P0-02)."""
    db = SessionLocal()
    try:
        if request and hasattr(request, "state"):
            request.state.db = db
            user_id = getattr(request.state, "current_user_id", None)
            if user_id:
                set_db_rls_context(db, user_id)
        yield db
    finally:
        db.close()

def ensure_schema_migrations():
    """Ensure all required columns and tables exist across both SQLite and PostgreSQL."""
    is_pg = "postgres" in str(engine.url).lower()

    # Register every ORM model before create_all. This function is also invoked
    # from a fresh Python process by CI/CLI, where Alembic's earlier "import models"
    # does not carry over and Base.metadata would otherwise be empty.
    try:
        try:
            import models  # noqa: F401
        except ImportError:
            from . import models  # noqa: F401

        # Ensure all tables from the fully populated Base metadata exist.
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Schema Migration Error] create_all failed: {e}")
        # Continuing to ALTER/RLS operations with missing base tables is unsafe.
        if is_pg:
            raise RuntimeError(
                "CRITICAL: Failed to create ORM tables before applying schema/RLS migrations"
            ) from e

    # Inspect existing columns to skip unnecessary ALTER TABLE locks on PostgreSQL
    table_columns = {}
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        for tbl in inspector.get_table_names():
            try:
                table_columns[tbl.lower()] = {c["name"].lower() for c in inspector.get_columns(tbl)}
            except Exception:
                table_columns[tbl.lower()] = set()
    except Exception as e:
        table_columns = {}

    migration_statements = [
        "ALTER TABLE tasks ADD COLUMN user_email VARCHAR",
        "ALTER TABLE financial_records ADD COLUMN user_email VARCHAR",
        "ALTER TABLE memory_vault ADD COLUMN user_email VARCHAR",
        "ALTER TABLE audit_logs ADD COLUMN user_email VARCHAR",
        "ALTER TABLE chat_messages ADD COLUMN user_email VARCHAR",
        "ALTER TABLE tasks ADD COLUMN recurrence VARCHAR",
        "ALTER TABLE tasks ADD COLUMN parent_id INTEGER",
        "ALTER TABLE tasks ADD COLUMN completion_comment TEXT",
        "ALTER TABLE tasks ADD COLUMN attachments TEXT",
        "ALTER TABLE chat_messages ADD COLUMN session_id VARCHAR DEFAULT 'default'",
        "ALTER TABLE chat_sessions ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE",
        "ALTER TABLE chat_sessions ADD COLUMN project VARCHAR",
        "ALTER TABLE memory_vault ADD COLUMN embedding TEXT",
        "ALTER TABLE chat_messages ADD COLUMN embedding TEXT",
        "ALTER TABLE tasks ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE financial_records ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE memory_vault ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE audit_logs ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE chat_sessions ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE chat_messages ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE whatsapp_messages ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE task_date_completions ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE processed_mutations ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE briefing_preferences ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE channel_pairing_challenges ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE processed_webhook_events ADD COLUMN status VARCHAR DEFAULT 'processed'",
        "ALTER TABLE push_subscriptions ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE scheduled_jobs ADD COLUMN owner_user_id VARCHAR",
        "ALTER TABLE tasks ADD COLUMN dependency_task_ids TEXT DEFAULT '[]'",
        "ALTER TABLE tasks ADD COLUMN backup_key VARCHAR",
        "ALTER TABLE chat_messages ADD COLUMN importance FLOAT DEFAULT 1.0",
        "ALTER TABLE chat_messages ADD COLUMN last_accessed_at TIMESTAMP",
        "ALTER TABLE financial_records ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE",
        "ALTER TABLE financial_records ADD COLUMN recurrence_interval VARCHAR",
        "ALTER TABLE financial_records ADD COLUMN next_due_date TIMESTAMP",
        "ALTER TABLE financial_records ADD COLUMN backup_key VARCHAR",
        "ALTER TABLE memory_vault ADD COLUMN importance FLOAT DEFAULT 1.0",
        "ALTER TABLE memory_vault ADD COLUMN last_accessed_at TIMESTAMP",
        "ALTER TABLE scheduled_jobs ADD COLUMN idempotency_key VARCHAR",
    ]

    for stmt in migration_statements:
        parts = stmt.split()
        if len(parts) >= 6:
            tbl = parts[2].lower()
            col = parts[5].lower()
            if tbl in table_columns and col in table_columns[tbl]:
                continue  # Column already exists: skip ALTER TABLE to prevent lock contention

        try:
            with engine.connect() as conn:
                target_sql = stmt
                if is_pg:
                    target_sql = target_sql.replace("ADD COLUMN", "ADD COLUMN IF NOT EXISTS")
                conn.execute(text(target_sql))
                conn.commit()
        except Exception as e:
            err_str = str(e).lower()
            if "already exists" not in err_str and "duplicate column" not in err_str and "canceled" not in err_str:
                print(f"[Postgres Migration Note] {stmt}: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # AETH-P0-05: Ensure unique constraint on sender_pairing_rate_limits
    # ─────────────────────────────────────────────────────────────────────────
    try:
        with engine.connect() as conn:
            if is_pg:
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'uq_sender_pairing_rate_limit'
                        ) THEN
                            ALTER TABLE sender_pairing_rate_limits ADD CONSTRAINT uq_sender_pairing_rate_limit UNIQUE (channel, sender);
                        END IF;
                    END $$;
                """))
                conn.commit()
            else:
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_sender_pairing_rate_limit ON sender_pairing_rate_limits (channel, sender);"))
                conn.commit()
    except Exception as e:
        print(f"[Unique Constraint Migration Note] sender_pairing_rate_limits: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # App-wide bounded-read indexes. Build PostgreSQL indexes CONCURRENTLY so
    # existing user data remains readable while production indexes are created.
    # SQLite uses the equivalent idempotent CREATE INDEX statement.
    # ─────────────────────────────────────────────────────────────────────────
    resource_indexes = [
        "CREATE INDEX IF NOT EXISTS ix_tasks_owner_created_id ON tasks (owner_user_id, created_at, id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_owner_backup_key ON tasks (owner_user_id, backup_key) WHERE backup_key IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_tasks_owner_parent_id ON tasks (owner_user_id, parent_id, id)",
        "CREATE INDEX IF NOT EXISTS ix_tasks_owner_status_due ON tasks (owner_user_id, status, due_date)",
        "CREATE INDEX IF NOT EXISTS ix_financial_owner_date_id ON financial_records (owner_user_id, date, id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_owner_backup_key ON financial_records (owner_user_id, backup_key) WHERE backup_key IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_memory_owner_importance_created ON memory_vault (owner_user_id, importance, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_chat_owner_session_id ON chat_messages (owner_user_id, session_id, id)",
        "CREATE INDEX IF NOT EXISTS ix_task_completions_owner_task_id ON task_date_completions (owner_user_id, task_id, id)",
    ]
    for index_sql in resource_indexes:
        try:
            with engine.connect() as conn:
                if is_pg:
                    conn = conn.execution_options(isolation_level="AUTOCOMMIT")
                    concurrent_sql = index_sql.replace("CREATE UNIQUE INDEX IF NOT EXISTS", "CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS", 1)
                    concurrent_sql = concurrent_sql.replace("CREATE INDEX IF NOT EXISTS", "CREATE INDEX CONCURRENTLY IF NOT EXISTS", 1)
                    conn.exec_driver_sql(concurrent_sql)
                else:
                    conn.exec_driver_sql(index_sql)
        except Exception as e:
            print(f"[Resource Index Migration Note] {index_sql.split(' ON ')[0]}: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # AETH-P0-02: Trusted Supabase Auth Identity Mapping & Quarantining
    # ─────────────────────────────────────────────────────────────────────────
    tenant_tables = [
        "tasks", "financial_records", "memory_vault", "chat_sessions", 
        "chat_messages", "audit_logs", "push_subscriptions", "scheduled_jobs",
        "task_date_completions", "whatsapp_messages", "processed_mutations",
        "briefing_preferences", "channel_pairing_challenges"
    ]
    for tbl in tenant_tables:
        try:
            with engine.connect() as conn:
                if is_pg:
                    # Map legacy rows only if matching authentic auth.users subject exists
                    conn.execute(text(f"""
                        DO $$
                        BEGIN
                            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
                                UPDATE {tbl}
                                SET owner_user_id = u.id::text
                                FROM auth.users u
                                WHERE {tbl}.owner_user_id IS NULL
                                  AND {tbl}.user_email IS NOT NULL
                                  AND lower(trim({tbl}.user_email)) = lower(trim(u.email));
                            END IF;
                        END $$;
                    """))
                    conn.commit()
        except Exception as e:
            print(f"[Trusted Identity Mapping Note] {tbl}: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # AETH-P0-02: PostgreSQL Row-Level Security (RLS) & Force Enforcement
    # Complete inventory of all 15 tenant-owned tables
    # ─────────────────────────────────────────────────────────────────────────
    if is_pg:
        rls_tables = [
            "tasks", "financial_records", "memory_vault", "chat_sessions",
            "chat_messages", "audit_logs", "action_approvals", "user_integration_pairings",
            "push_subscriptions", "scheduled_jobs", "whatsapp_messages",
            "task_date_completions", "processed_mutations", "briefing_preferences",
            "channel_pairing_challenges"
        ]
        for t in rls_tables:
            try:
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;"))
                    conn.execute(text(f"ALTER TABLE {t} FORCE ROW LEVEL SECURITY;"))
                    if t in ["user_integration_pairings", "channel_pairing_challenges"]:
                        # AETH-P0-05: Bridge tables allow PROVIDER-MATCHED verified webhook lookup OR tenant access.
                        # Provider isolation: Telegram webhook cannot read WhatsApp pairings and vice-versa.
                        # The channel column is matched against request.webhook_provider setting.
                        conn.execute(text(f"""
                            DO $$
                            BEGIN
                                IF EXISTS (
                                    SELECT 1 FROM pg_policies WHERE tablename = '{t}' AND policyname = '{t}_tenant_isolation'
                                ) THEN
                                    DROP POLICY {t}_tenant_isolation ON {t};
                                END IF;
                                CREATE POLICY {t}_tenant_isolation ON {t}
                                    FOR ALL
                                    USING (
                                        owner_user_id = current_setting('request.jwt.claim.sub', true)
                                        OR (
                                            current_setting('request.webhook_service_authorized', true) = 'true'
                                            AND channel = current_setting('request.webhook_provider', true)
                                        )
                                    )
                                    WITH CHECK (
                                        owner_user_id = current_setting('request.jwt.claim.sub', true)
                                        OR (
                                            current_setting('request.webhook_service_authorized', true) = 'true'
                                            AND channel = current_setting('request.webhook_provider', true)
                                        )
                                    );
                            END $$;
                        """))
                    else:
                        conn.execute(text(f"""
                            DO $$
                            BEGIN
                                IF NOT EXISTS (
                                    SELECT 1 FROM pg_policies WHERE tablename = '{t}' AND policyname = '{t}_tenant_isolation'
                                ) THEN
                                    CREATE POLICY {t}_tenant_isolation ON {t}
                                        FOR ALL
                                        USING (owner_user_id = current_setting('request.jwt.claim.sub', true))
                                        WITH CHECK (owner_user_id = current_setting('request.jwt.claim.sub', true));
                                END IF;
                            END $$;
                        """))
                    conn.commit()
            except Exception as e:
                print(f"[RLS Migration Error] {t}: {e}")
                env = os.environ.get("ENVIRONMENT", "production").lower()
                if env in ["prod", "production"] or is_pg:
                    raise RuntimeError(f"CRITICAL: Failed to enforce RLS policy on table {t}: {e}")


def set_webhook_service_rls_context(db: Session, authorized_provider: str):
    """
    Sets transaction-local webhook service context ONLY after cryptographic webhook signature validation (AETH-P0-05).
    Enables bridge tables (user_integration_pairings, channel_pairing_challenges) lookup strictly within this transaction.
    """
    try:
        is_pg = "postgres" in str(engine.url).lower()
        if is_pg:
            db.execute(text("SELECT set_config('request.webhook_service_authorized', 'true', true)"))
            db.execute(text("SELECT set_config('request.webhook_provider', :provider, true)"), {"provider": authorized_provider})
    except Exception as e:
        raise RuntimeError(f"Webhook service security context initialization failed: {e}")


def set_db_rls_context(db: Session, user_id: Optional[str]):
    """
    Sets transaction-local PostgreSQL RLS context from verified authenticated UUID (AETH-P0-02).
    Uses official PostgreSQL set_config(setting_name, new_val, is_local=true) for parameter-bound transaction isolation.
    Fails closed if the identity cannot be set.
    """
    clean_sub = str(user_id).strip() if user_id else ""
    db.info["rls_user_id"] = clean_sub
    try:
        is_pg = "postgres" in str(engine.url).lower()
        if is_pg:
            db.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": clean_sub})
            # Clear webhook bridge authorization so subsequent business operations are strictly scoped to the tenant
            db.execute(text("SELECT set_config('request.webhook_service_authorized', 'false', true)"))
    except Exception as e:
        raise RuntimeError(f"Database security context initialization failed: {e}")

