import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

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

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_migrations():
    """Ensure user_email and recurrence columns exist on tables even if existing SQLite/Postgres is used."""
    try:
        with engine.connect() as conn:
            tables = ["tasks", "financial_records", "memory_vault", "audit_logs", "chat_messages"]
            for table in tables:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_email VARCHAR"))
                    conn.commit()
                except Exception:
                    # Column already exists or table not created yet
                    pass
            try:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN recurrence VARCHAR"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE tasks ADD COLUMN parent_id INTEGER"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN session_id VARCHAR DEFAULT 'default'"))
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        print(f"[Schema Migration Note] {e}")
