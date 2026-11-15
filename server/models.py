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
    owner_user_id = Column(String, index=True, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="medium")  # low, medium, high, urgent
    status = Column(String, default="pending")    # pending, in_progress, completed, cancelled
    due_date = Column(DateTime, nullable=True)
    reminder_time = Column(String, nullable=True) # e.g. "10:30 AM" or "13:30"
    recurrence = Column(String, nullable=True, default=None) # e.g. "daily", "weekdays", "weekly_monday" or None
    parent_id = Column(Integer, nullable=True, default=None) # For hierarchical subtasks
    dependency_task_ids = Column(Text, nullable=True, default="[]") # JSON array of blocking task IDs
    notified = Column(Boolean, default=False)
    completion_comment = Column(Text, nullable=True) # Comments / notes on completion
    attachments = Column(Text, nullable=True) # JSON array string of attached files [{name, url, type, size}]
    created_at = Column(DateTime, default=datetime.utcnow)

class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    owner_user_id = Column(String, index=True, nullable=True)
    type = Column(String, nullable=False)        # expense, income, emi, investment
    category = Column(String, default="general") # food, rent, fuel, client, etc.
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    payment_mode = Column(String, default="upi") # upi, cash, card, bank
    note = Column(Text, nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurrence_interval = Column(String, nullable=True) # "monthly", "yearly", "weekly"
    next_due_date = Column(DateTime, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)

class MemoryItem(Base):
    __tablename__ = "memory_vault"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    owner_user_id = Column(String, index=True, nullable=True)
    category = Column(String, default="general") # preference, personal_rule, contact, context
    fact = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    importance = Column(Float, default=1.0)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)
    embedding = Column(Text, nullable=True) # JSON array of floats for semantic vector search
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    owner_user_id = Column(String, index=True, nullable=True)
    action_type = Column(String, nullable=False) # create_task, log_expense, etc.
    details = Column(Text, nullable=False)
    confidence_score = Column(Float, default=1.0)
    executed_at = Column(DateTime, default=datetime.utcnow)
    undo_payload = Column(Text, nullable=True)   # JSON string for undo operation
    is_undone = Column(Boolean, default=False)

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True) # e.g. sess_20261102_123456
    user_email = Column(String, index=True, nullable=False)
    owner_user_id = Column(String, index=True, nullable=True)
    title = Column(String, nullable=False, default="New Conversation")
    is_pinned = Column(Boolean, default=False)
    project = Column(String, nullable=True, default=None) # e.g. "work", "personal", "ideas"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    owner_user_id = Column(String, index=True, nullable=True)
    session_id = Column(String, index=True, default="default", nullable=True)
    role = Column(String, nullable=False)        # "user" or "aether"
    content = Column(Text, nullable=False)
    action_type = Column(String, default="query")# "task", "expense", "income", "memory", "query"
    action_data = Column(Text, nullable=True)    # JSON string
    confidence = Column(Float, default=1.0)
    importance = Column(Float, default=1.0)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)
    embedding = Column(Text, nullable=True) # JSON array of floats for semantic vector search
    created_at = Column(DateTime, default=datetime.utcnow)
class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=False)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    job_type = Column(String, nullable=False)   # e.g. "reminder", "task_notify", "whatsapp_digest"
    idempotency_key = Column(String, index=True, nullable=True)
    payload = Column(Text, nullable=True)       # JSON string
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    attempts = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class TaskDateCompletion(Base):
    __tablename__ = "task_date_completions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, index=True, nullable=False)
    user_email = Column(String, index=True, nullable=False)
    date_str = Column(String, index=True, nullable=False)  # "YYYY-MM-DD"
    completed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=True)
    owner_user_id = Column(String, index=True, nullable=True)
    direction = Column(String, default="outbound")  # "outbound" or "inbound"
    phone_number = Column(String, index=True, nullable=False)
    sender_name = Column(String, nullable=True)
    message_text = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)
    attachment_name = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True) # "image", "document", etc.
    status = Column(String, default="delivered")    # "sent", "delivered", "read", "received", "failed"
    waba_message_id = Column(String, nullable=True, index=True)
    activity_data = Column(Text, nullable=True)     # JSON array of { event, timestamp, note }
    created_at = Column(DateTime, default=datetime.utcnow)

class ProcessedMutation(Base):
    __tablename__ = "processed_mutations"

    id = Column(Integer, primary_key=True, index=True)
    mutation_id = Column(String, unique=True, index=True, nullable=False)
    user_email = Column(String, index=True, nullable=True)
    owner_user_id = Column(String, index=True, nullable=True)
    endpoint = Column(String, nullable=True)
    response_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BriefingPreference(Base):
    __tablename__ = "briefing_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, unique=True, index=True, nullable=False)
    owner_user_id = Column(String, index=True, nullable=True)
    modules = Column(Text, default='["tasks","finances","weather","news","cricket"]') # JSON list
    delivery_time_morning = Column(String, default="08:00")
    delivery_time_evening = Column(String, default="20:00")
    channel_in_app = Column(Boolean, default=True)
    channel_whatsapp = Column(Boolean, default=False)
    channel_tts = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ActionApproval(Base):
    """
    Durable, DB-persisted action approvals for high-impact AI tool execution (AETH-P0-03).
    Ensures approvals survive server restarts, worker crashes, and prevents replay attacks.
    """
    __tablename__ = "action_approvals"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String, unique=True, index=True, nullable=False)
    owner_user_id = Column(String, index=True, nullable=False)
    user_email = Column(String, index=True, nullable=True)
    tool_name = Column(String, nullable=False)
    param_hash = Column(String, nullable=False)
    params_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(Float, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    consumed_at = Column(DateTime, nullable=True)


class ProcessedWebhookEvent(Base):
    """
    Durable DB-persisted webhook deduplication across restarts and workers (AETH-P0-05).
    """
    __tablename__ = "processed_webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, index=True, nullable=False)  # "whatsapp", "telegram"
    event_id = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserIntegrationPairing(Base):
    """
    Cryptographically verified messaging channel pairing (AETH-P0-05).
    """
    __tablename__ = "user_integration_pairings"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(String, index=True, nullable=False)
    user_email = Column(String, index=True, nullable=True)
    channel = Column(String, index=True, nullable=False)  # "telegram", "whatsapp"
    channel_user_id = Column(String, index=True, nullable=False)  # chat_id or phone
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ChannelPairingChallenge(Base):
    """
    Durable DB-persisted OTP pairing challenges for Telegram and WhatsApp (AETH-P0-05).
    Replaces process-local in-memory dictionaries so pairing works across workers and restarts.
    """
    __tablename__ = "channel_pairing_challenges"

    id = Column(Integer, primary_key=True, index=True)
    otp_hash = Column(String, index=True, nullable=False)
    owner_user_id = Column(String, index=True, nullable=False)
    user_email = Column(String, index=True, nullable=True)
    channel = Column(String, index=True, nullable=False)  # "telegram", "whatsapp"
    expires_at = Column(Float, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)





