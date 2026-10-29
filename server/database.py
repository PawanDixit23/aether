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

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_migrations():
    """Ensure user_email column exists on all tables even if existing SQLite file is used."""
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
    except Exception as e:
        print(f"[Schema Migration Note] {e}")
