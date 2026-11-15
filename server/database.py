import os
from typing import Optional, Any, Dict, List
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

engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True
)

# Concurrency & Reliability Hardening for SQLite:
# WAL (Write-Ahead Logging) allows simultaneous reads and writes without blocking.
# busy_timeout=5000 prevents any 'database is locked' errors under high load.
if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@event.listens_for(SessionLocal, "after_begin")
def receive_after_begin(session, transaction, connection):
    """Re-applies transaction-local PostgreSQL RLS context whenever a new transaction begins (AETH-P0-02)."""
    user_id = session.info.get("rls_user_id")
    if user_id and "postgres" in str(engine.url).lower():
        try:
            connection.execute(text("SET LOCAL request.jwt.claim.sub = :sub"), {"sub": str(user_id).strip()})
        except Exception as e:
            raise RuntimeError(f"Failed to apply transaction-local RLS security context: {e}")

Base = declarative_base()

def get_db(request: Optional[Any] = None):
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

    # Ensure all tables from Base metadata exist
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[Schema Migration Warning] create_all error: {e}")

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
        "ALTER TABLE chat_messages ADD COLUMN importance FLOAT DEFAULT 1.0",
        "ALTER TABLE chat_messages ADD COLUMN last_accessed_at TIMESTAMP",
        "ALTER TABLE financial_records ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE",
        "ALTER TABLE financial_records ADD COLUMN recurrence_interval VARCHAR",
        "ALTER TABLE financial_records ADD COLUMN next_due_date TIMESTAMP",
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
                print(f"[RLS Migration Note] {t}: {e}")


def set_db_rls_context(db: Session, user_id: str):
    """
    Sets transaction-local PostgreSQL RLS context from verified authenticated UUID (AETH-P0-02).
    Ensures current_setting('request.jwt.claim.sub', true) matches verified user_id in all queries.
    Fails closed if the identity cannot be set.
    """
    if not user_id:
        return
    clean_sub = str(user_id).strip()
    db.info["rls_user_id"] = clean_sub
    try:
        is_pg = "postgres" in str(engine.url).lower()
        if is_pg:
            db.execute(text("SET LOCAL request.jwt.claim.sub = :sub"), {"sub": clean_sub})
    except Exception as e:
        raise RuntimeError(f"Database security context initialization failed: {e}")

