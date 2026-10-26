from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text

try:
    from .database import Base
except ImportError:
    from database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="medium")  # low, medium, high, urgent
    status = Column(String, default="pending")    # pending, in_progress, completed, cancelled
    due_date = Column(DateTime, nullable=True)
    reminder_time = Column(String, nullable=True) # e.g. "10:30 AM" or "13:30"
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    type = Column(String, nullable=False)        # expense, income, emi, investment
    category = Column(String, default="general") # food, rent, fuel, client, etc.
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    payment_mode = Column(String, default="upi") # upi, cash, card, bank
    note = Column(Text, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)

class MemoryItem(Base):
    __tablename__ = "memory_vault"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    category = Column(String, default="general") # preference, personal_rule, contact, context
    fact = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    action_type = Column(String, nullable=False) # create_task, log_expense, etc.
    details = Column(Text, nullable=False)
    confidence_score = Column(Float, default=1.0)
    executed_at = Column(DateTime, default=datetime.utcnow)
    undo_payload = Column(Text, nullable=True)   # JSON string for undo operation
    is_undone = Column(Boolean, default=False)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    role = Column(String, nullable=False)        # "user" or "aether"
    content = Column(Text, nullable=False)
    action_type = Column(String, default="query")# "task", "expense", "income", "memory", "query"
    action_data = Column(Text, nullable=True)    # JSON string
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

