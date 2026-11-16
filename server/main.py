import os
import sys
import time

# Ensure server module directory is in sys.path regardless of execution root
_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
if _SERVER_DIR not in sys.path:
    sys.path.insert(0, _SERVER_DIR)

import json
import csv
import io
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import base64
import hashlib
import hmac
from fastapi import FastAPI, Depends, HTTPException, Header, Request, UploadFile, File
from document_parser import extract_text_from_file
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from resource_limits import AI_CONTEXT_CHAT_LIMIT, AI_CONTEXT_FINANCE_LIMIT, AI_CONTEXT_MEMORY_LIMIT, AI_CONTEXT_TASK_LIMIT, bounded_page, chunks, WRITE_BATCH_SIZE
from sqlalchemy.exc import IntegrityError
import httpx
import re
import traceback
import gc
import ctypes

def trim_memory():
    """Forces garbage collection and releases unmapped heap memory back to OS kernel (Render 512MB RAM optimization)."""
    try:
        gc.collect()
        try:
            libc = ctypes.CDLL("libc.so.6")
            libc.malloc_trim(0)
        except Exception:
            pass
    except Exception:
        pass

# ─── Web Push (VAPID) Setup ────────────────────────────────────────────────────
# Loaded securely from Environment Variables or auto-generated & persisted locally
VAPID_PUBLIC_KEY   = (os.environ.get("VAPID_PUBLIC_KEY") or "").strip()
VAPID_PRIVATE_KEY  = (os.environ.get("VAPID_PRIVATE_KEY") or "").strip()
VAPID_CLAIMS_EMAIL = (os.environ.get("VAPID_CLAIMS_EMAIL") or "mailto:aether@pawandixit.com").strip()

if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
    vapid_file = os.path.join(os.path.dirname(__file__), ".vapid_keys.json")
    if os.path.exists(vapid_file):
        try:
            with open(vapid_file, "r") as f:
                saved_keys = json.load(f)
                if saved_keys.get("publicKey") and saved_keys.get("privateKey"):
                    VAPID_PUBLIC_KEY = saved_keys["publicKey"]
                    VAPID_PRIVATE_KEY = saved_keys["privateKey"]
        except Exception:
            pass

    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        try:
            from cryptography.hazmat.primitives.asymmetric import ec
            from cryptography.hazmat.primitives import serialization
            import base64

            _ec_key = ec.generate_private_key(ec.SECP256R1())
            _priv_bytes = _ec_key.private_numbers().private_value.to_bytes(32, byteorder='big')
            _priv_b64 = base64.urlsafe_b64encode(_priv_bytes).decode('utf-8').rstrip('=')

            _pub_bytes = _ec_key.public_key().public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint
            )
            _pub_b64 = base64.urlsafe_b64encode(_pub_bytes).decode('utf-8').rstrip('=')

            VAPID_PUBLIC_KEY = _pub_b64
            VAPID_PRIVATE_KEY = _priv_b64

            try:
                with open(vapid_file, "w") as f:
                    json.dump({"publicKey": _pub_b64, "privateKey": _priv_b64}, f)
            except Exception:
                pass
            print(f"[VAPID Setup] Auto-generated secure VAPID keypair for instant Web Push.")
        except Exception as e:
            print("[VAPID Setup Warning] Could not auto-generate VAPID keys:", e)

if VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY:
    print("[VAPID Setup] ✅ Web Push active with valid VAPID keys.")
else:
    print("[VAPID Security Notice] VAPID keys not configured in environment. Web Push notifications disabled until set.")

# In-memory push subscription store (user_email -> list of subscriptions)
# Render container restart पर clear होता है, इसलिए client re-subscribe करता है
_push_subscriptions: dict = {}  # {email: [subscription_info_dict, ...]}

def _send_web_push(subscription_info: dict, title: str, body: str, tag: str = "aether-alert"):
    """VAPID Web Push notification एक subscription पर भेजें। Returns (success: bool, is_expired: bool)."""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        return False, False
    try:
        from pywebpush import webpush, WebPushException
        webpush(
            subscription_info=subscription_info,
            data=json.dumps({"title": title, "body": body, "tag": tag, "icon": "/favicon.svg"}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
        )
        return True, False
    except Exception as e:
        is_expired = False
        resp = getattr(e, "response", None)
        status_code = getattr(resp, "status_code", None)
        err_str = str(e)
        if status_code in (404, 410) or "410" in err_str or "404" in err_str or "Gone" in err_str:
            is_expired = True
            print(f"[WebPush Expired] Subscription expired (404/410): {subscription_info.get('endpoint', '')[:50]}")
        else:
            print(f"[WebPush Error] {e}")
        return False, is_expired
# ──────────────────────────────────────────────────────────────────────────────

try:
    from database import engine, Base, get_db, ensure_schema_migrations, SessionLocal, set_db_rls_context, set_webhook_service_rls_context
    from models import (
        Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription,
        ChatSession, TaskDateCompletion, WhatsAppMessage, ProcessedMutation,
        BriefingPreference, ActionApproval, ProcessedWebhookEvent, UserIntegrationPairing,
        ChannelPairingChallenge, SenderPairingRateLimit
    )
    from ai_engine import parse_intent_with_llm
except ImportError:
    try:
        from server.database import engine, Base, get_db, ensure_schema_migrations, SessionLocal, set_db_rls_context, set_webhook_service_rls_context
        from server.models import (
            Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription,
            ChatSession, TaskDateCompletion, WhatsAppMessage, ProcessedMutation,
            BriefingPreference, ActionApproval, ProcessedWebhookEvent, UserIntegrationPairing,
            ChannelPairingChallenge, SenderPairingRateLimit
        )
        from server.ai_engine import parse_intent_with_llm
    except ImportError:
        from .database import engine, Base, get_db, ensure_schema_migrations, SessionLocal
        from .models import (
            Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription,
            ChatSession, TaskDateCompletion, WhatsAppMessage, ProcessedMutation,
            BriefingPreference, ActionApproval, ProcessedWebhookEvent, UserIntegrationPairing,
            ChannelPairingChallenge, SenderPairingRateLimit
        )
        from .ai_engine import parse_intent_with_llm

# Initialize tables & run automated schema migrations
Base.metadata.create_all(bind=engine)
ensure_schema_migrations()

from security.auth import validate_security_config_at_startup
try:
    validate_security_config_at_startup()
except RuntimeError as e:
    # If production environment lacks critical security secrets, fail startup fast
    import sys
    print(f"[SECURITY STARTUP ERROR] {e}", file=sys.stderr)
    if os.environ.get("ENVIRONMENT", "production").lower() in ["prod", "production"]:
        raise

app = FastAPI(
    title="Aether Executive Core API",
    version="2.0.0",
    description="Production-grade AI Operating System with hardened security, tenant isolation, durable scheduling, and multi-modal autonomous workflows (AETH-DOC-02).",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable hardened CORS for local desktop, mobile webview & authorized origins (AETH-SEC-07)
_raw_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = [o.strip() for o in _raw_allowed_origins.split(",") if o.strip()]
if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "tauri://localhost",
        "https://tauri.localhost",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Has-More", "X-Next-Offset", "X-Page-Limit", "Content-Disposition"],
)

# ─── Security & Observability Subsystems ─────────────────────────────────────
from security import TokenBucketRateLimiter, ContentQuarantine
from observability import tracker as obs_tracker

_api_rate_limiter = TokenBucketRateLimiter(capacity=300, refill_rate_per_sec=10.0)

@app.middleware("http")
async def security_and_observability_middleware(request: Request, call_next):
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"

    # Reject oversized JSON payloads before FastAPI/Pydantic materializes them.
    # File uploads use multipart and retain their separate upload policy.
    if request.headers.get("content-type", "").lower().startswith("application/json"):
        try:
            content_length = int(request.headers.get("content-length", "0"))
        except (TypeError, ValueError):
            content_length = 0
        max_json_bytes = int(os.environ.get("MAX_JSON_REQUEST_BYTES", str(2 * 1024 * 1024)))
        if content_length > max_json_bytes:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=413,
                content={
                    "detail": "JSON request is too large. Split bulk data into batches of at most 200 records.",
                    "max_bytes": max_json_bytes
                }
            )

    # Rate Limiting Guard on API routes
    if request.url.path.startswith("/api/"):
        allowed, remaining, retry_after = _api_rate_limiter.is_allowed(client_ip)
        if not allowed:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please throttle your rate."},
                headers={"Retry-After": str(int(retry_after) + 1)}
            )
            
    response = await call_next(request)
    
    # Observability & Latency Tracking
    duration_ms = (time.time() - start_time) * 1000
    obs_tracker.record_request(request.url.path, duration_ms, response.status_code)
    response.headers["X-Response-Time-Ms"] = str(round(duration_ms, 2))
    
    # Security Hardening Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # High-Performance Stale-While-Revalidate (SWR) Caching
    if request.url.path in ("/api/cricket/live", "/api/news"):
        response.headers["Cache-Control"] = "public, max-age=3, stale-while-revalidate=15"
    elif request.url.path.startswith("/api/") and "Cache-Control" not in response.headers:
        response.headers["Cache-Control"] = "private, no-cache"
    
    return response

@app.get("/api/metrics")
def get_system_metrics():
    """Returns real-time observability telemetry and operational health."""
    return obs_tracker.get_summary()

# In-memory deduplication cache for WhatsApp incoming webhooks (prevents duplicate replies)
PROCESSED_WABA_MSG_IDS = set()

def _verify_supabase_jwt(token: str, secret: str) -> Optional[dict]:
    """Verifies an HS256 Supabase JWT without external dependencies."""
    import base64
    import hashlib
    import hmac
    import time as _jwt_time

    parts = token.split(".")
    if len(parts) != 3:
        return None
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b"=").decode("utf-8")
    if not hmac.compare_digest(expected_b64, sig_b64):
        return None
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    exp = payload.get("exp")
    if exp is not None and _jwt_time.time() > float(exp):
        return None
    return payload

from security.auth import (
    UserIdentity,
    get_current_user_identity,
    get_current_user_email,
    get_current_user_id,
    get_optional_user_identity,
    verify_supabase_jwt,
)

def get_user_email(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """
    Resolves verified user email from canonical identity principal (AETH-P0-01).
    Arbitrary X-User-Email headers and request parameters cannot override identity.
    """
    user = get_current_user_identity(request, authorization)
    return user.email


def tenant_filter(model, current_user: UserIdentity):
    """
    Enforces strict immutable UUID ownership on all tenant-owned rows (AETH-P0-02).
    Never falls back to email. Fails closed if model lacks owner_user_id.
    """
    if hasattr(model, "owner_user_id"):
        return model.owner_user_id == current_user.id
    # Fail closed: never silently return True or fall back to email
    import sqlalchemy.sql
    return sqlalchemy.sql.false()


def check_and_record_otp_attempt(db: Session, channel: str, sender: str, is_correct: bool) -> Tuple[bool, str]:
    """
    Per-sender OTP rate-limiting and bounded lockout with atomic SQL increments (AETH-P0-05).
    Guarantees failed guesses from one sender/attacker never increment or exhaust another user's challenges.
    Uses atomic SQL expressions to eliminate race conditions under concurrent requests.
    """
    now = time.time()
    clean_sender = str(sender).strip()

    # 1. Atomic upsert to ensure tracking row exists without concurrency duplicate key exceptions
    rate_rec = db.query(SenderPairingRateLimit).filter(
        SenderPairingRateLimit.channel == channel,
        SenderPairingRateLimit.sender == clean_sender
    ).first()
    if not rate_rec:
        try:
            with db.begin_nested():
                rate_rec = SenderPairingRateLimit(
                    channel=channel,
                    sender=clean_sender,
                    failed_attempts=0,
                    locked_until=0.0
                )
                db.add(rate_rec)
                db.flush()
        except Exception:
            db.rollback()

    if is_correct:
        db.query(SenderPairingRateLimit).filter(
            SenderPairingRateLimit.channel == channel,
            SenderPairingRateLimit.sender == clean_sender
        ).update({
            SenderPairingRateLimit.failed_attempts: 0,
            SenderPairingRateLimit.locked_until: 0.0,
            SenderPairingRateLimit.last_attempt_at: datetime.utcnow()
        }, synchronize_session=False)
        db.commit()
        return True, "Success"

    # 2. Atomic SQL increment (eliminates lost updates under concurrency)
    db.query(SenderPairingRateLimit).filter(
        SenderPairingRateLimit.channel == channel,
        SenderPairingRateLimit.sender == clean_sender
    ).update({
        SenderPairingRateLimit.failed_attempts: SenderPairingRateLimit.failed_attempts + 1,
        SenderPairingRateLimit.last_attempt_at: datetime.utcnow()
    }, synchronize_session=False)

    # 3. Atomic lockout update if threshold reached
    db.query(SenderPairingRateLimit).filter(
        SenderPairingRateLimit.channel == channel,
        SenderPairingRateLimit.sender == clean_sender,
        SenderPairingRateLimit.failed_attempts >= 5
    ).update({
        SenderPairingRateLimit.locked_until: now + 900.0  # 15-minute lockout
    }, synchronize_session=False)
    db.commit()

    curr = db.query(SenderPairingRateLimit).filter(
        SenderPairingRateLimit.channel == channel,
        SenderPairingRateLimit.sender == clean_sender
    ).first()

    if curr and curr.locked_until > now:
        rem = int((curr.locked_until - now) / 60) + 1
        return False, f"⚠️ 5 failed attempts exceeded. This sender is locked out for {rem} minutes."

    attempts = curr.failed_attempts if curr else 1
    return False, f"⚠️ Invalid pairing code. {max(0, 5 - attempts)} attempts remaining."

DEFAULT_OWNER_EMAIL = os.environ.get("DEFAULT_USER_EMAIL", "e.pawandixit@gmail.com").strip().lower()

def get_effective_email(user_email: Optional[str]) -> Optional[str]:
    """Returns effective email with strict isolation: explicit user email if provided, else None."""
    if user_email and user_email.strip():
        return user_email.strip().lower()
    return None

def is_owner_email(email: Optional[str]) -> bool:
    """Checks whether the given email matches the primary environment owner."""
    if not email:
        return False
    return email.strip().lower() == DEFAULT_OWNER_EMAIL

# ----------------- Pydantic Schemas -----------------
class AuthRecordRequest(BaseModel):
    email: str
    name: Optional[str] = "Operator"
    provider: Optional[str] = "google"

class KeyValidationRequest(BaseModel):
    api_key: str
    provider: Optional[str] = "gemini"

class QuickCaptureRequest(BaseModel):
    input_text: str = ""
    image_data: Optional[str] = None
    images: Optional[list] = None
    user_email: Optional[str] = None
    session_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    language: Optional[str] = "auto" # 'auto', 'hi', 'en', 'hinglish'
    client_time: Optional[str] = None
    timezone: Optional[str] = None
    api_key: Optional[str] = None
    openai_key: Optional[str] = None
    grok_key: Optional[str] = None
    active_provider: Optional[str] = None
    user_name: Optional[str] = None
    finance_records: Optional[list] = None
    finance_summary: Optional[dict] = None

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    id: Optional[str] = None
    project: Optional[str] = None
    is_pinned: Optional[bool] = False

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    project: Optional[str] = None
    is_pinned: Optional[bool] = None

class ChatSessionPin(BaseModel):
    is_pinned: bool

class ChatSessionProject(BaseModel):
    project: Optional[str] = None

class TranslateRequest(BaseModel):
    text: str
    target_lang: Optional[str] = "hi"

class TaskCreate(BaseModel):
    title: str
    user_email: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None
    reminder_time: Optional[str] = None
    recurrence: Optional[str] = None
    parent_id: Optional[int] = None
    dependency_task_ids: Optional[List[int]] = None
    subtasks: Optional[List[str]] = None
    completion_comment: Optional[str] = None
    attachments: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    reminder_time: Optional[str] = None
    recurrence: Optional[str] = None
    dependency_task_ids: Optional[List[int]] = None
    status: Optional[str] = None
    completion_comment: Optional[str] = None
    attachments: Optional[str] = None

class TaskReschedule(BaseModel):
    due_date: Optional[datetime] = None
    reminder_time: Optional[str] = None

class TaskToggleRequest(BaseModel):
    status: Optional[str] = None
    date: Optional[str] = None
    completion_comment: Optional[str] = None
    attachments: Optional[str] = None

class DateCompletionRequest(BaseModel):
    date: str
    completed: bool

class TaskAttachmentDownloadRequest(BaseModel):
    filename: Optional[str] = "attachment"
    data: str
    mime_type: Optional[str] = None

class FinancialRecordCreate(BaseModel):
    type: str
    user_email: Optional[str] = None
    category: Optional[str] = "general"
    amount: float
    currency: Optional[str] = "INR"
    payment_mode: Optional[str] = "upi"
    note: Optional[str] = None
    monthly_budget: Optional[float] = None
    is_recurring: Optional[bool] = False
    recurrence_interval: Optional[str] = None
    next_due_date: Optional[str] = None

class FinancialRecordBulkCreate(BaseModel):
    records: List[FinancialRecordCreate] = Field(..., max_length=200)
    user_email: Optional[str] = None

class FinancialRecordUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    note: Optional[str] = None
    payment_mode: Optional[str] = None

class MemoryCreate(BaseModel):
    fact: str
    user_email: Optional[str] = None
    category: Optional[str] = "preference"

class ClientSyncBackup(BaseModel):
    user_email: str
    # The client must upload each dataset in bounded chunks; oversized batches are rejected,
    # never silently truncated or partially accepted.
    tasks: List[dict] = Field(default_factory=list, max_length=200)
    memories: List[dict] = Field(default_factory=list, max_length=200)
    finances: List[dict] = Field(default_factory=list, max_length=200)

class ICalSyncRequest(BaseModel):
    url: str
    user_email: Optional[str] = None

class ParseSmsRequest(BaseModel):
    sms_text: Optional[str] = None
    sms_list: Optional[List[str]] = None
    auto_commit: bool = True
    user_email: Optional[str] = None
    custom_note: Optional[str] = None

class EmailDraftRequest(BaseModel):
    sender: str
    subject: str
    body: str
    instructions: Optional[str] = ""
    language: Optional[str] = "en"
    user_name: Optional[str] = "Pawan Dixit"

# ─── Financial Precision & Idempotency Utilities (AETH-REL-03 & AETH-REL-04) ───
from decimal import Decimal, ROUND_HALF_EVEN

def round_currency(amount: Any) -> float:
    """Rounds currency to 2 decimal places with Banker's Rounding to eliminate drift (AETH-REL-03)."""
    try:
        d = Decimal(str(amount))
        return float(d.quantize(Decimal('0.01'), rounding=ROUND_HALF_EVEN))
    except Exception:
        try:
            return round(float(amount), 2)
        except Exception:
            return 0.0

def get_cached_mutation(mutation_id: Optional[str], db: Session) -> Optional[Dict[str, Any]]:
    if not mutation_id:
        return None
    try:
        rec = db.query(ProcessedMutation).filter(ProcessedMutation.mutation_id == str(mutation_id).strip()).first()
        if rec and rec.response_json:
            return json.loads(rec.response_json)
    except Exception:
        pass
    return None

def record_mutation(mutation_id: Optional[str], user_email: Optional[str], endpoint: str, data: Any, db: Session):
    if not mutation_id:
        return
    try:
        rec = ProcessedMutation(
            mutation_id=str(mutation_id).strip(),
            user_email=user_email,
            endpoint=endpoint,
            response_json=json.dumps(data)
        )
        db.add(rec)
        db.commit()
    except Exception as e:
        print(f"[record_mutation error] {e}")
        db.rollback()

try:
    from zoneinfo import ZoneInfo
    DEFAULT_TZ = ZoneInfo(os.environ.get("TIMEZONE", "Asia/Kolkata"))
except Exception:
    DEFAULT_TZ = None

def get_current_time_str(client_time: Optional[str] = None, tz_name: Optional[str] = None) -> str:
    if client_time and client_time.strip():
        return client_time.strip()
    try:
        tz = ZoneInfo(tz_name) if tz_name else DEFAULT_TZ
        if tz:
            return datetime.now(tz).strftime("%A, %d %B %Y, %I:%M %p")
    except Exception:
        pass
    return datetime.now().strftime("%A, %d %B %Y, %I:%M %p")

def build_context(db: Session, client_time: Optional[str] = None, tz_name: Optional[str] = None, user_email: Optional[str] = None, exclude_chat_id: Optional[int] = None, prompt_query: Optional[str] = None, session_id: Optional[str] = None, user_lat: Optional[float] = None, user_lon: Optional[float] = None, user_city: Optional[str] = None, owner_user_id: Optional[str] = None) -> dict:
    """Build a bounded AI context; aggregate history in SQL and fetch only useful recent rows."""
    user_loc = (user_city or "").strip()
    if not user_loc:
        user_loc = f"{round(user_lat, 2)}, {round(user_lon, 2)}" if user_lat and user_lon else "Jaipur, Rajasthan"

    chat_q = db.query(ChatMessage)
    if owner_user_id:
        chat_q = chat_q.filter(ChatMessage.owner_user_id == owner_user_id)
    elif session_id:
        chat_q = chat_q.filter(ChatMessage.session_id == session_id)
    else:
        chat_q = chat_q.filter(sqlalchemy.sql.false())
    if session_id:
        chat_q = chat_q.filter(ChatMessage.session_id == session_id)
    if exclude_chat_id:
        chat_q = chat_q.filter(ChatMessage.id != exclude_chat_id)
    try:
        recent_msgs = list(reversed(chat_q.order_by(ChatMessage.id.desc()).limit(AI_CONTEXT_CHAT_LIMIT).all()))
    except Exception:
        db.rollback()
        recent_msgs = []
    recent_chat = [
        {"role": ("User" if m.role == "user" else "Aether"), "content": m.content}
        for m in recent_msgs
    ]

    if not user_email:
        return {
            "current_time": get_current_time_str(client_time, tz_name),
            "tasks": [], "total_income": 0, "total_expense": 0, "balance": 0,
            "memories": [], "recent_chat": recent_chat, "user_location": user_loc,
            "user_state": "Rajasthan", "user_city": "Jaipur"
        }

    tasks = []
    memories = []
    recent_finances = []
    total_income = 0.0
    total_expense = 0.0
    if owner_user_id:
        tasks = (
            db.query(Task)
            .filter(Task.owner_user_id == owner_user_id, Task.status == "pending")
            .order_by(Task.due_date.asc().nullslast(), Task.id.desc())
            .limit(AI_CONTEXT_TASK_LIMIT)
            .all()
        )

        # Compute lifetime totals inside PostgreSQL; never materialize the user's ledger.
        totals = db.query(
            FinancialRecord.type,
            func.coalesce(func.sum(FinancialRecord.amount), 0.0)
        ).filter(
            FinancialRecord.owner_user_id == owner_user_id
        ).group_by(FinancialRecord.type).all()
        for record_type, amount in totals:
            if (record_type or "").lower() == "income":
                total_income = float(amount or 0.0)
            elif (record_type or "").lower() == "expense":
                total_expense = float(amount or 0.0)

        recent_finances = (
            db.query(FinancialRecord)
            .filter(FinancialRecord.owner_user_id == owner_user_id)
            .order_by(FinancialRecord.date.desc(), FinancialRecord.id.desc())
            .limit(AI_CONTEXT_FINANCE_LIMIT)
            .all()
        )

        recalled_facts = []
        if prompt_query:
            try:
                from memory import HybridMemoryProvider
                recalled = HybridMemoryProvider.recall_context(
                    prompt_query, user_email or owner_user_id, db, limit=AI_CONTEXT_MEMORY_LIMIT
                )
                recalled_facts = list(dict.fromkeys(recalled.get("relevant_facts", [])))[:AI_CONTEXT_MEMORY_LIMIT]
            except Exception as recall_error:
                print(f"[AI Context Memory Recall] {recall_error}")

        memory_q = db.query(MemoryItem).filter(MemoryItem.owner_user_id == owner_user_id)
        if recalled_facts:
            memory_q = memory_q.filter(MemoryItem.fact.in_(recalled_facts))
        memories = (
            memory_q.order_by(MemoryItem.importance.desc(), MemoryItem.created_at.desc(), MemoryItem.id.desc())
            .limit(AI_CONTEXT_MEMORY_LIMIT)
            .all()
        )

    balance = total_income - total_expense
    category_totals = {}
    fin_list = []
    for r in recent_finances:
        r_type = (r.type or "expense").lower()
        amt = float(r.amount or 0.0)
        cat = (r.category or "general").strip().capitalize()
        if r_type == "expense":
            category_totals[cat] = category_totals.get(cat, 0.0) + amt
        fin_list.append({
            "id": r.id, "type": r_type, "category": cat, "amount": amt,
            "note": r.note or "",
            "date": r.date.strftime("%Y-%m-%d %H:%M") if r.date else ""
        })

    return {
        "current_time": get_current_time_str(client_time, tz_name),
        "tasks": [{"id": t.id, "title": str(t.title or "Task"), "priority": str(t.priority or "medium"), "reminder_time": t.reminder_time} for t in tasks],
        "total_income": total_income, "total_expense": total_expense, "balance": balance,
        "financial_records": fin_list, "financial_category_breakdown": category_totals,
        "memories": [{"category": str(m.category or "general"), "fact": str(m.fact or "")} for m in memories],
        "recent_chat": recent_chat, "user_location": user_loc,
        "user_state": "India", "user_city": user_loc
    }

# ----------------- Multi-Provider Key Validation Engine (Gemini / OpenAI / Grok) -----------------
@app.post("/api/auth/validate-key")
async def validate_api_key(req: KeyValidationRequest):
    """Validate a Gemini, OpenAI, or Grok API Key directly against respective providers."""
    key = req.api_key.strip()
    provider = (req.provider or "gemini").lower().strip()
    if not key:
        return {"valid": False, "error": "API key cannot be empty"}
    
    # Auto-detect provider if default was sent
    if key.startswith("sk-"):
        provider = "openai"
    elif key.startswith("xai-") or key.startswith("grok_") or key.startswith("grok-"):
        provider = "grok"
    elif key.startswith("AIzaSy"):
        provider = "gemini"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if provider == "openai":
                url = "https://api.openai.com/v1/models"
                headers = {"Authorization": f"Bearer {key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return {"valid": True, "provider": "openai", "models_count": len(data.get("data", []))}
                else:
                    err_msg = "अमान्य OpenAI API Key! कृपया platform.openai.com पर अपनी सही Key जांचें।"
                    try:
                        err_json = resp.json()
                        if err_json.get("error", {}).get("message"):
                            err_msg = err_json["error"]["message"]
                    except Exception:
                        pass
                    return {"valid": False, "provider": "openai", "error": err_msg}

            elif provider == "grok":
                url = "https://api.x.ai/v1/models"
                headers = {"Authorization": f"Bearer {key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return {"valid": True, "provider": "grok", "models_count": len(data.get("data", []))}
                else:
                    err_msg = "अमान्य Grok (xAI) API Key! कृपया console.x.ai पर अपनी सही Key जांचें।"
                    try:
                        err_json = resp.json()
                        if err_json.get("error"):
                            err_msg = str(err_json["error"])
                    except Exception:
                        pass
                    return {"valid": False, "provider": "grok", "error": err_msg}

            else:  # Google Gemini
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    return {"valid": True, "provider": "gemini", "models_count": len(models)}
                else:
                    return {"valid": False, "provider": "gemini", "error": "अमान्य Gemini API Key! कृपया aistudio.google.com से सही Key जांचें।"}
    except Exception as e:
        return {"valid": False, "provider": provider, "error": str(e)}

@app.post("/api/auth/record-login")
def record_user_login(req: AuthRecordRequest, db: Session = Depends(get_db)):
    """Log user authentication in local audit log and claim legacy unassigned tenant data."""
    email = req.email.strip().lower()
    try:
        # Auto-claim removed for strict tenant isolation (AETH-P0-02).
        pass
    except Exception as e:
        print(f"[Record Login Auto-claim Note] {e}")

    details = f"User {req.name} ({email}) successfully authenticated via {req.provider.capitalize()} OAuth."
    audit = AuditLog(
        user_email=email,
        action_type="user_auth",
        details=details,
        confidence_score=1.0,
        executed_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return {"status": "logged", "audit_id": audit.id, "details": details}

# ----------------- Client Sync & Resilience Engine -----------------
@app.post("/api/sync/backup")
def client_backup_sync(
    req: ClientSyncBackup,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Merge client cache in bounded batches without scanning tenant history."""
    email = current_user.email
    restored = {"tasks": 0, "memories": 0, "finances": 0}
    skipped = {"duplicate_tasks": 0, "invalid_tasks": 0, "duplicate_memories": 0, "invalid_memories": 0, "finances_already_present": 0}
    failed_count = 0
    failure_samples = []

    def note_failure(kind: str, index: int, error: Exception):
        nonlocal failed_count
        failed_count += 1
        if len(failure_samples) < 25:
            failure_samples.append({"type": kind, "index": index, "error": str(error)[:240]})

    for batch_start in range(0, len(req.tasks or []), WRITE_BATCH_SIZE):
        batch = (req.tasks or [])[batch_start:batch_start + WRITE_BATCH_SIZE]
        prepared = []
        numeric_ids = []
        for local_index, item in enumerate(batch):
            try:
                raw_id = item.get("id")
                numeric_id = int(raw_id) if raw_id is not None and str(raw_id).isdigit() else None
                if numeric_id and numeric_id > 0:
                    numeric_ids.append(numeric_id)
                stable_key = (
                    f"client:{str(raw_id).strip()}" if raw_id is not None and str(raw_id).strip()
                    else "hash:" + hashlib.sha256(json.dumps(item, sort_keys=True, default=str).encode("utf-8")).hexdigest()
                )
                title = str(item.get("title") or "").strip()
                if not title:
                    skipped["invalid_tasks"] += 1
                    continue
                due_dt = None
                if item.get("due_date"):
                    try:
                        due_dt = datetime.fromisoformat(str(item["due_date"]).replace("Z", "+00:00")).replace(tzinfo=None)
                    except (TypeError, ValueError):
                        pass
                created_dt = None
                if item.get("created_at"):
                    try:
                        created_dt = datetime.fromisoformat(str(item["created_at"]).replace("Z", "+00:00")).replace(tzinfo=None)
                    except (TypeError, ValueError):
                        pass
                prepared.append({
                    "index": batch_start + local_index, "key": stable_key,
                    "numeric_id": numeric_id, "item": item, "title": title,
                    "due_date": due_dt, "created_at": created_dt
                })
            except Exception as exc:
                note_failure("task", batch_start + local_index, exc)

        candidate_keys = [entry["key"] for entry in prepared]
        existing_keys = set()
        if candidate_keys:
            existing_keys = {
                key for (key,) in db.query(Task.backup_key).filter(
                    tenant_filter(Task, current_user), Task.backup_key.in_(candidate_keys)
                ).all() if key
            }
        existing_ids = set()
        if numeric_ids:
            existing_ids = {
                task_id for (task_id,) in db.query(Task.id).filter(
                    tenant_filter(Task, current_user), Task.id.in_(numeric_ids)
                ).all()
            }

        batch_inserted = 0
        for entry in prepared:
            if entry["key"] in existing_keys or (
                entry["numeric_id"] is not None and entry["numeric_id"] in existing_ids
            ):
                skipped["duplicate_tasks"] += 1
                continue
            item = entry["item"]
            try:
                db.add(Task(
                    user_email=email, owner_user_id=current_user.id,
                    title=entry["title"], priority=item.get("priority", "medium"),
                    status=item.get("status", "pending"), reminder_time=item.get("reminder_time"),
                    recurrence=item.get("recurrence"), completion_comment=item.get("completion_comment"),
                    attachments=item.get("attachments"), due_date=entry["due_date"],
                    created_at=entry["created_at"] or datetime.utcnow(),
                    notified=item.get("notified", False), backup_key=entry["key"]
                ))
                batch_inserted += 1
                existing_keys.add(entry["key"])
            except Exception as exc:
                note_failure("task", entry["index"], exc)
        try:
            db.commit()
            restored["tasks"] += batch_inserted
        except Exception as exc:
            db.rollback()
            note_failure("task_batch", batch_start, exc)
            failed_count += max(0, batch_inserted - 1)

    for batch_start in range(0, len(req.memories or []), WRITE_BATCH_SIZE):
        batch = (req.memories or [])[batch_start:batch_start + WRITE_BATCH_SIZE]
        candidate_facts = list({
            str(item.get("fact") or item.get("content") or "").strip().lower()
            for item in batch if str(item.get("fact") or item.get("content") or "").strip()
        })
        existing_facts = set()
        if candidate_facts:
            existing_facts = {
                value for (value,) in db.query(func.lower(MemoryItem.fact)).filter(
                    tenant_filter(MemoryItem, current_user), func.lower(MemoryItem.fact).in_(candidate_facts)
                ).all() if value
            }
        batch_inserted = 0
        for local_index, item in enumerate(batch):
            try:
                fact_text = str(item.get("fact") or item.get("content") or "").strip()
                if not fact_text:
                    skipped["invalid_memories"] += 1
                    continue
                if fact_text.lower() in existing_facts:
                    skipped["duplicate_memories"] += 1
                    continue
                db.add(MemoryItem(
                    owner_user_id=current_user.id, user_email=email,
                    category=item.get("category", "preference"), fact=fact_text
                ))
                existing_facts.add(fact_text.lower())
                batch_inserted += 1
            except Exception as exc:
                note_failure("memory", batch_start + local_index, exc)
        try:
            db.commit()
            restored["memories"] += batch_inserted
        except Exception as exc:
            db.rollback()
            note_failure("memory_batch", batch_start, exc)
            failed_count += max(0, batch_inserted - 1)

    for batch_start in range(0, len(req.finances or []), WRITE_BATCH_SIZE):
        batch = (req.finances or [])[batch_start:batch_start + WRITE_BATCH_SIZE]
        prepared = []
        numeric_ids = []
        for local_index, item in enumerate(batch):
            try:
                raw_id = item.get("id")
                numeric_id = int(raw_id) if raw_id is not None and str(raw_id).isdigit() else None
                if numeric_id and numeric_id > 0:
                    numeric_ids.append(numeric_id)
                stable_key = (
                    f"client:{str(raw_id).strip()}" if raw_id is not None and str(raw_id).strip()
                    else "hash:" + hashlib.sha256(json.dumps(item, sort_keys=True, default=str).encode("utf-8")).hexdigest()
                )
                amount = abs(float(item.get("amount") or 0))
                if amount <= 0:
                    skipped.setdefault("invalid_finances", 0)
                    skipped["invalid_finances"] += 1
                    continue
                record_date = None
                raw_date = item.get("date") or item.get("created_at")
                if raw_date:
                    try:
                        record_date = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00")).replace(tzinfo=None)
                    except (TypeError, ValueError):
                        record_date = None
                next_due_date = None
                if item.get("next_due_date"):
                    try:
                        next_due_date = datetime.fromisoformat(str(item["next_due_date"]).replace("Z", "+00:00")).replace(tzinfo=None)
                    except (TypeError, ValueError):
                        next_due_date = None
                prepared.append({
                    "index": batch_start + local_index, "key": stable_key,
                    "numeric_id": numeric_id, "item": item, "amount": amount,
                    "date": record_date, "next_due_date": next_due_date
                })
            except Exception as exc:
                note_failure("finance", batch_start + local_index, exc)

        candidate_keys = [entry["key"] for entry in prepared]
        existing_keys = set()
        if candidate_keys:
            existing_keys = {
                key for (key,) in db.query(FinancialRecord.backup_key).filter(
                    tenant_filter(FinancialRecord, current_user),
                    FinancialRecord.backup_key.in_(candidate_keys)
                ).all() if key
            }
        existing_ids = set()
        if numeric_ids:
            existing_ids = {
                record_id for (record_id,) in db.query(FinancialRecord.id).filter(
                    tenant_filter(FinancialRecord, current_user),
                    FinancialRecord.id.in_(numeric_ids)
                ).all()
            }

        batch_inserted = 0
        for entry in prepared:
            item = entry["item"]
            if entry["key"] in existing_keys or (
                entry["numeric_id"] is not None and entry["numeric_id"] in existing_ids
            ):
                skipped["finances_already_present"] += 1
                continue
            try:
                db.add(FinancialRecord(
                    owner_user_id=current_user.id, user_email=email,
                    type=item.get("type", "expense"), category=item.get("category", "general"),
                    amount=entry["amount"], currency=item.get("currency", "INR"),
                    payment_mode=item.get("payment_mode", "upi"), note=item.get("note", ""),
                    date=entry["date"] or datetime.utcnow(),
                    is_recurring=bool(item.get("is_recurring", False)),
                    recurrence_interval=item.get("recurrence_interval"),
                    next_due_date=entry["next_due_date"], backup_key=entry["key"]
                ))
                batch_inserted += 1
                existing_keys.add(entry["key"])
            except Exception as exc:
                note_failure("finance", entry["index"], exc)
        try:
            db.commit()
            restored["finances"] += batch_inserted
        except Exception as exc:
            db.rollback()
            note_failure("finance_batch", batch_start, exc)
            failed_count += max(0, batch_inserted - 1)

    return {
        "status": "synced", "user": email, "restored": restored,
        "skipped": skipped, "failed_count": failed_count,
        "failure_samples": failure_samples
    }

# ----------------- Autonomous Agent & Quick Capture Engine -----------------
class AgentRunRequest(BaseModel):
    prompt: str
    language: Optional[str] = "auto"
    action_id: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

@app.post("/api/agent/run")
@app.post("/api/agent/approve")
async def run_agent_workflow(
    req: AgentRunRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """
    Executes multi-step autonomous workflows with permission checks, tool loops,
    canonical parameter hash approvals, and reversible audit logging (AETH-P0-03).
    Client-controlled approved_tools parameter is removed to prevent approval bypass.
    """
    from agent import AgentOrchestrator
    orchestrator = AgentOrchestrator(
        db=db,
        user_email=current_user.email,
        owner_user_id=current_user.id,
        lang=req.language or "auto"
    )
    context = {}
    if req.action_id:
        context["action_id"] = req.action_id
    if req.parameters:
        context["parameters"] = req.parameters
    result_state = await orchestrator.run(req.prompt, context=context)
    return {
        "status": "completed" if result_state.completed else "partial",
        "requires_approval": result_state.requires_approval,
        "approval_prompt": result_state.approval_prompt,
        "pending_action": result_state.metadata.get("pending_action"),
        "message": result_state.final_message,
        "plan": result_state.plan,
        "tools_executed": [t.tool_name for t in result_state.executed_tools],
        "can_undo": any(t.undo_payload is not None for t in result_state.executed_tools)
    }

# ----------------- Google Calendar Integration Endpoints -----------------
class CalendarEventRequest(BaseModel):
    title: str
    start_time_str: Optional[str] = None
    date_str: Optional[str] = None
    duration_minutes: Optional[int] = 60
    details: Optional[str] = None
    user_email: Optional[str] = None

@app.post("/api/calendar/events")
def create_calendar_event(
    req: CalendarEventRequest,
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Creates a Google Calendar event and returns direct integration template links."""
    from calendar_sync import GoogleCalendarService
    eff_email = req.user_email or user_email or "operator@aether.local"
    event_info = GoogleCalendarService.schedule_event(
        title=req.title,
        start_time_str=req.start_time_str,
        date_str=req.date_str,
        duration_minutes=req.duration_minutes or 60,
        details=req.details or "",
        user_email=eff_email
    )
    return {"status": "created", "event": event_info}

@app.get("/api/calendar/events")
def get_calendar_events(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Retrieves upcoming calendar-bound tasks and events for the active user (AETH-P0-02)."""
    tasks = db.query(Task).filter(
        tenant_filter(Task, current_user),
        Task.status == "pending"
    ).order_by(Task.due_date.asc()).limit(20).all()
    from calendar_sync import GoogleCalendarService
    events = []
    for t in tasks:
        dt = t.due_date or datetime.now()
        cal_url = GoogleCalendarService.generate_calendar_template_url(
            title=t.title,
            start_time=dt,
            description=f"Aether Task: {t.title} [Priority: {t.priority}]"
        )
        events.append({
            "id": t.id,
            "title": t.title,
            "due_date": dt.isoformat(),
            "reminder_time": t.reminder_time,
            "google_calendar_url": cal_url
        })
    return {"events": events, "count": len(events)}

@app.post("/api/action/quick-capture")
async def quick_capture(
    req: QuickCaptureRequest, 
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Core Smart Action Engine with Multi-Tenant Isolation & Conversational History (AETH-P0-02)."""
    try:
        return await _execute_quick_capture(req, current_user, db)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Quick-Capture Error] {exc}")
        traceback.print_exc()
        fallback_msg = (
            "नमस्ते! मैं आपका कार्य प्रोसेस कर रहा हूँ। कृपया पुनः प्रयास करें।"
            if (req.language == "hi" or req.language == "auto")
            else "I am ready. Please re-state your request."
        )
        return {
            "status": "executed",
            "action": "query",
            "confidence_level": "medium",
            "confidence": 0.8,
            "message": fallback_msg,
            "parsed": {"action": "query", "data": {"response": fallback_msg}},
            "can_undo": False
        }

async def _execute_quick_capture(
    req: QuickCaptureRequest, 
    current_user: UserIdentity,
    db: Session
):
    user_email = current_user.email
    owner_user_id = current_user.id
    user_msg = (req.input_text or "").strip()
    if not user_msg and not req.image_data:
        raise HTTPException(status_code=400, detail="Empty input")
    if not user_msg and req.image_data:
        user_msg = "कृपया इस फ़ोटो का विश्लेषण करें (यदि यह बिल/रसीद/खर्च है तो राशि और विवरण दर्ज करें, अन्यथा सामान्य जानकारी दें)।"

    eff_email = current_user.email
    req_sess = (req.session_id or "").strip()
    active_session_id = req_sess if req_sess and req_sess != "default" else f"default_{owner_user_id}"
    is_temporary = active_session_id.startswith("temp_") or active_session_id == "temporary"

    # Ensure ChatSession exists or auto-title it (Skip completely for Temporary Chats)
    if eff_email and not is_temporary:
        try:
            sess_obj = db.query(ChatSession).filter(ChatSession.id == active_session_id).first()
            raw_title = user_msg.replace("📸", "").strip()
            smart_title = (raw_title[:38] + ("..." if len(raw_title) > 38 else "")) if raw_title else "New Conversation"
            if not sess_obj:
                sess_obj = ChatSession(
                    id=active_session_id,
                    owner_user_id=owner_user_id,
                    user_email=eff_email,
                    title=smart_title,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(sess_obj)
            else:
                if sess_obj.owner_user_id and sess_obj.owner_user_id != owner_user_id:
                    raise HTTPException(status_code=403, detail="Access denied: Cannot post to another user's chat session")
                sess_obj.owner_user_id = owner_user_id
                sess_obj.user_email = eff_email
                if sess_obj.title in ["New Conversation", "New Chat", "default"] and smart_title:
                    sess_obj.title = smart_title
                sess_obj.updated_at = datetime.utcnow()
            db.commit()
        except HTTPException:
            raise
        except Exception as sess_err:
            db.rollback()
            print(f"[ChatSession Note] {sess_err}")

    # Security: Content Quarantine & Prompt Injection Sanitization (AETHER_SECURITY_REVIEW.md)
    _, is_suspicious = ContentQuarantine.sanitize_input(user_msg, source="user_quick_capture")
    if is_suspicious:
        print(f"[Security Alert] Neutralized prompt injection pattern in: {user_msg[:60]}")

    # Record User Message (Skip completely for Temporary Chats) (AETH-P0-02)
    user_chat = None
    if not is_temporary:
        db_content = f"📸 {user_msg}" if req.image_data and not user_msg.startswith("📸") else user_msg
        user_chat = ChatMessage(
            role="user",
            content=db_content,
            user_email=eff_email,
            owner_user_id=owner_user_id,
            session_id=active_session_id
        )
        db.add(user_chat)
        db.commit()
        db.refresh(user_chat)

    # 1. ChatSorter: Automatically extract episodic facts/routines into memory vault (Skip for Temporary Chats)
    if not is_temporary:
        try:
            from memory import ChatSorter
            ChatSorter.extract_facts(user_msg, eff_email or "operator@aether.local", db)
        except Exception as cs_err:
            print(f"[ChatSorter Passive Note] {cs_err}")

    # 2. Autonomous Multi-Step Agent Routing (AETH-P0-03)
    lang = req.language or "auto"
    has_conjunction = bool(re.search(r'\b(?:and then|after that|aur phir|and|aur|तथा|और)\b', user_msg, re.I))
    has_multi_intent = any(w in user_msg.lower() for w in ["spent", "kharch", "balance", "task", "remind", "weather", "youtube", "meeting"])
    if has_conjunction and has_multi_intent and not (req.image_data or req.images):
        try:
            from agent import AgentOrchestrator
            orchestrator = AgentOrchestrator(
                db=db,
                user_email=eff_email,
                owner_user_id=owner_user_id,
                lang=lang
            )
            agent_res = await orchestrator.run(user_msg)
            if agent_res.executed_tools and len(agent_res.executed_tools) > 1:
                if not is_temporary:
                    ai_chat = ChatMessage(
                        user_email=eff_email,
                        owner_user_id=owner_user_id,
                        session_id=active_session_id,
                        role="assistant",
                        content=agent_res.final_message,
                        action_type="agent_multi_step",
                        action_data=json.dumps({"plan": agent_res.plan}),
                        confidence=0.98
                    )
                    db.add(ai_chat)
                    db.commit()
                return {
                    "status": "executed",
                    "action": "agent_multi_step",
                    "confidence_level": "high",
                    "confidence": 0.98,
                    "message": agent_res.final_message,
                    "parsed": {"action": "agent_multi_step", "plan": agent_res.plan},
                    "can_undo": any(t.undo_payload is not None for t in agent_res.executed_tools)
                }
        except Exception as ag_err:
            print(f"[Agent Orchestrator Note] {ag_err}")

    context = build_context(
        db, 
        client_time=req.client_time, 
        tz_name=req.timezone, 
        user_email=eff_email, 
        exclude_chat_id=(user_chat.id if user_chat else None), 
        prompt_query=user_msg,
        session_id=active_session_id,
        user_lat=req.latitude,
        user_lon=req.longitude,
        user_city=req.city
    )
    if req.finance_records and isinstance(req.finance_records, list) and len(req.finance_records) > 0:
        context["financial_records"] = req.finance_records
        cat_map = {}
        for r in req.finance_records:
            if (r.get("type") or "expense").lower() == "expense":
                cat = (r.get("category") or "General").capitalize()
                cat_map[cat] = cat_map.get(cat, 0.0) + float(r.get("amount") or 0.0)
        context["financial_category_breakdown"] = cat_map
    if req.finance_summary and isinstance(req.finance_summary, dict):
        if "total_income" in req.finance_summary:
            context["total_income"] = float(req.finance_summary["total_income"])
        if "total_expense" in req.finance_summary:
            context["total_expense"] = float(req.finance_summary["total_expense"])
        if "balance" in req.finance_summary:
            context["balance"] = float(req.finance_summary["balance"])

    lang = req.language or "auto"
    parsed = await parse_intent_with_llm(
        user_msg, 
        context, 
        user_lat=req.latitude, 
        user_lon=req.longitude, 
        language=lang,
        api_key=req.api_key,
        user_name=req.user_name or "Operator",
        image_data=req.image_data,
        images=req.images,
        user_email=eff_email,
        openai_key=req.openai_key,
        grok_key=req.grok_key,
        active_provider=req.active_provider,
        user_city=req.city
    )
    
    action = parsed.get("action", "query")
    confidence = parsed.get("confidence", 0.95)
    conf_level = parsed.get("confidence_level", "high")
    data = parsed.get("data", {})
    if not isinstance(data, dict):
        data = {}
    if not data.get("follow_ups") or not isinstance(data.get("follow_ups"), list) or len(data.get("follow_ups")) == 0:
        try:
            from ai_engine import generate_contextual_follow_ups
            is_hi_query = (lang == "hi" or bool(re.search(r'[\u0900-\u097F]', user_msg)))
            data["follow_ups"] = generate_contextual_follow_ups(user_msg, is_hi=is_hi_query, action=action)
        except Exception as _fe:
            print(f"[Follow-up Gen Notice] {_fe}")
    if isinstance(parsed, dict):
        if not isinstance(parsed.get("data"), dict):
            parsed["data"] = {}
        parsed["data"]["follow_ups"] = data.get("follow_ups", [])

    # Safety unwrap if response accidentally has embedded JSON
    if action == "query":
        raw_resp = (data.get("response") or "").strip()
        if "```json" in raw_resp or (raw_resp.startswith("{") and '"action"' in raw_resp):
            try:
                clean_json = re.sub(r'^```(?:json)?\s*', '', raw_resp, flags=re.IGNORECASE)
                clean_json = re.sub(r'\s*```$', '', clean_json).strip()
                j_match = re.search(r'\{.*\}', clean_json, re.DOTALL)
                if j_match:
                    inner_dict = json.loads(j_match.group(0))
                    if inner_dict.get("action") and inner_dict.get("action") != "query":
                        action = inner_dict.get("action")
                        data = inner_dict.get("data", {})
                        confidence = inner_dict.get("confidence", confidence)
                        conf_level = inner_dict.get("confidence_level", conf_level)
                    elif inner_dict.get("data", {}).get("response"):
                        data["response"] = inner_dict["data"]["response"]
                    elif inner_dict.get("explanation"):
                        data["response"] = inner_dict.get("explanation")
            except Exception as e:
                print(f"[Aether Engine] Query JSON unwrap notice: {e}")

    executed = False
    result_message = ""
    undo_payload = None

    if action == "query":
        fallback_greeting = (
            f"नमस्ते {req.user_name or 'साथी'}! मैं तैयार हूँ। बताइए, अभी आपके किस काम में मदद करूँ?"
            if lang == "hi"
            else f"Hello {req.user_name or 'Pawan'}! Systems operational. What work or tasks can I handle for you right now?"
        )
        result_message = data.get("response", fallback_greeting)
        if isinstance(result_message, str) and (result_message.strip().startswith('{') or '"action":' in result_message):
            clean_res = re.sub(r'\{|\}|"action"\s*:\s*"[^"]*",?|"data"\s*:\s*\{?|"confidence(?:_level)?"\s*:\s*(?:"[^"]*"|[\d.]+),?|"response"\s*:\s*"?|"explanation"\s*:\s*"?', '', result_message)
            clean_res = re.sub(r'^[\s,"]+|[\s,"]+$', '', clean_res).strip()
            if clean_res and len(clean_res) > 3:
                result_message = clean_res
            else:
                result_message = fallback_greeting
            data["response"] = result_message
        executed = True
        
    elif action == "expense":
        merchant_or_note = data.get("note") or user_msg
        txn_dt = datetime.utcnow()
        if data.get("date"):
            try:
                txn_dt = datetime.fromisoformat(data["date"])
            except Exception:
                pass
        record = FinancialRecord(
            user_email=eff_email,
            type="expense",
            category=data.get("category", "general"),
            amount=data.get("amount", 0.0),
            currency=data.get("currency", "INR"),
            payment_mode=data.get("payment_mode", "upi"),
            note=merchant_or_note,
            date=txn_dt
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        executed = True
        
        is_scanned_receipt = bool(req.image_data or req.images)
        if is_scanned_receipt:
            clean_merchant = data.get("note") or record.category.title()
            if lang == "en":
                result_message = f"🧾 **Receipt Scanned & Logged:**\n• **Merchant**: {clean_merchant}\n• **Amount**: ₹{record.amount:,.2f}\n• **Category**: {record.category.title()} ({record.payment_mode.upper()})\n\nSaved to your financial records! ✅"
            elif lang == "hinglish":
                result_message = f"🧾 **Receipt Scan Ho Gayi:**\n• **Merchant**: {clean_merchant}\n• **Amount**: ₹{record.amount:,.2f}\n• **Category**: {record.category.title()} ({record.payment_mode.upper()})\n\nYeh kharch financial records me jud gaya hai! ✅"
            else:
                result_message = f"🧾 **रसीद सफलतापूर्वक स्कैन हुई:**\n• **दुकान/व्यापारी**: {clean_merchant}\n• **राशि**: ₹{record.amount:,.2f}\n• **श्रेणी**: {record.category.title()} ({record.payment_mode.upper()})\n\nयह खर्च आपके वित्तीय रिकॉर्ड में दर्ज कर लिया गया है! ✅"
        else:
            if lang == "en":
                result_message = f"Expense of ₹{record.amount:,.2f} ({record.category}) logged successfully."
            elif lang == "hinglish":
                result_message = f"₹{record.amount:,.2f} ka kharch ({record.category}) safaltapoorvak record ho gaya."
            else:
                result_message = f"₹{record.amount:,.2f} का खर्च ({record.category}) सफलतापूर्वक दर्ज कर लिया गया है।"
        
        # Monthly Category Budget Check & Smart Alert (AETH-P0-02)
        try:
            m_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            c_spend = db.query(func.sum(FinancialRecord.amount)).filter(
                FinancialRecord.owner_user_id == owner_user_id,
                FinancialRecord.type == "expense",
                FinancialRecord.category == record.category,
                FinancialRecord.date >= m_start
            ).scalar() or 0.0

            BUDGET_LIMITS = {
                "fuel": 4000.0, "petrol": 4000.0,
                "food": 5000.0, "dining": 5000.0,
                "shopping": 10000.0, "travel": 4000.0, "bills": 3000.0
            }
            lim = BUDGET_LIMITS.get(record.category.lower())
            if lim and c_spend >= (lim * 0.8):
                pct = int((c_spend / lim) * 100)
                result_message += f"\n\n⚠️ **बजट अलर्ट**: इस माह {record.category.title()} का कुल खर्च ₹{c_spend:,.0f} / ₹{lim:,.0f} ({pct}%) हो चुका है!"
        except Exception as b_err:
            print(f"[Budget Check Warning] {b_err}")

        undo_payload = json.dumps({"table": "financial_records", "id": record.id})

    elif action == "income":
        txn_dt = datetime.utcnow()
        if data.get("date"):
            try:
                txn_dt = datetime.fromisoformat(data["date"])
            except Exception:
                pass
        record = FinancialRecord(
            user_email=eff_email,
            type="income",
            category=data.get("category", "salary"),
            amount=data.get("amount", 0.0),
            currency=data.get("currency", "INR"),
            payment_mode=data.get("payment_mode", "bank"),
            note=data.get("note", user_msg),
            date=txn_dt
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        executed = True
        if lang == "en":
            result_message = f"Income of ₹{record.amount:,.2f} logged successfully."
        elif lang == "hinglish":
            result_message = f"₹{record.amount:,.2f} ki aay (income) record ho gayi hai."
        else:
            result_message = f"₹{record.amount:,.2f} की आय दर्ज कर ली गई है।"
        undo_payload = json.dumps({"table": "financial_records", "id": record.id})

    elif action == "memory":
        item = MemoryItem(
            user_email=eff_email,
            category=data.get("category", "preference"),
            fact=data.get("fact", user_msg),
            confidence=confidence
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        executed = True
        if lang == "en":
            result_message = f"Preference saved to memory vault: \"{item.fact}\""
        elif lang == "hinglish":
            result_message = f"Aapki preference memory me save ho gayi: \"{item.fact}\""
        else:
            result_message = f"आपकी प्राथमिकता मेमोरी में सुरक्षित कर ली गई: \"{item.fact}\""
        undo_payload = json.dumps({"table": "memory_vault", "id": item.id})

    elif action == "task":
        # Multi-task Voice Memo Extraction (e.g. 2+ tasks dictated in one message)
        multi_list = data.get("multi_tasks")
        if multi_list and isinstance(multi_list, list) and len(multi_list) > 1:
            created_tasks = []
            for mt in multi_list:
                t_title = mt.get("title", "").strip()
                if t_title:
                    mt_time = mt.get("reminder_time")
                    mt_due = None
                    if mt.get("due_date"):
                        try:
                            mt_due = datetime.fromisoformat(mt["due_date"])
                        except Exception:
                            mt_due = None
                    ct = Task(
                        user_email=eff_email,
                        title=t_title,
                        priority=mt.get("priority", "medium"),
                        reminder_time=mt_time,
                        due_date=mt_due or datetime.combine(datetime.now().date(), datetime.min.time()),
                        notified=False
                    )
                    db.add(ct)
                    created_tasks.append(ct)
            db.commit()
            executed = True
            lines = [f"{idx+1}. **{ct.title}** ({ct.reminder_time or 'Anytime'})" for idx, ct in enumerate(created_tasks)]
            if lang == "en":
                result_message = f"⏰ **{len(created_tasks)} tasks scheduled:**\n\n" + "\n".join(lines) + "\n\nAll reminders are active! ✅"
            elif lang == "hinglish":
                result_message = f"⏰ **{len(created_tasks)} tasks agenda me add ho gaye:**\n\n" + "\n".join(lines) + "\n\nSabhi reminders set hain! ✅"
            else:
                result_message = f"⏰ **{len(created_tasks)} कार्य एजेंडा में दर्ज किए गए:**\n\n" + "\n".join(lines) + "\n\nसभी रिमाइंडर्स निर्धारित समय पर एक्टिव रहेंगे! ✅"
            undo_payload = json.dumps({"table": "tasks", "ids": [ct.id for ct in created_tasks]})
        else:

            r_time = data.get("reminder_time")
            due_dt = None
            if data.get("due_date"):
                try:
                    due_dt = datetime.fromisoformat(data["due_date"])
                except Exception:
                    due_dt = None
        
            # Fallback time extraction if not in LLM payload
            if not r_time or not due_dt:
                try:
                    from ai_engine import parse_reminder_time
                except ImportError:
                    from .ai_engine import parse_reminder_time
                extracted_time, extracted_dt = parse_reminder_time(user_msg)
                if extracted_time:
                    r_time = r_time or extracted_time
                    due_dt = due_dt or extracted_dt

            # If time was not found in current turn, check recent conversation history to restore agreed time
            if not r_time:
                for m in reversed(context.get("recent_chat", [])):
                    try:
                        from ai_engine import parse_reminder_time
                        cand_time, cand_dt = parse_reminder_time(m.get("content", ""))
                        if cand_time:
                            r_time = cand_time
                            if not due_dt:
                                due_dt = cand_dt
                            break
                    except Exception:
                        pass

            # Ensure due_date is always valid today if time exists
            if not due_dt:
                if r_time:
                    try:
                        from ai_engine import parse_reminder_time
                        _, calculated_dt = parse_reminder_time(r_time)
                        if calculated_dt:
                            due_dt = calculated_dt
                    except Exception:
                        pass
                if not due_dt:
                    due_dt = datetime.combine(datetime.now().date(), datetime.min.time())

            title = data.get("title") or user_msg
            try:
                from ai_engine import clean_task_title
                title = clean_task_title(title)
            except Exception:
                pass

            # Detect recurring intent
            msg_lower = user_msg.lower()
            is_daily = any(w in msg_lower for w in ["daily", "everyday", "every day", "har din", "roz", "rozaana", "रोज", "रोजाना", "प्रतिदिन"]) or (data.get("recurrence") == "daily")
            is_weekdays = any(w in msg_lower for w in ["monday to friday", "mon to fri", "weekdays", "सोमवार से शुक्रवार"]) or (data.get("recurrence") == "weekdays")
            is_weekly_mon = any(w in msg_lower for w in ["every monday", "har somwar", "हर सोमवार"]) or (data.get("recurrence") == "weekly_monday")
        
            recurrence_val = None
            if is_daily:
                recurrence_val = "daily"
            elif is_weekdays:
                recurrence_val = "weekdays"
            elif is_weekly_mon:
                recurrence_val = "weekly_monday"
            else:
                recurrence_val = data.get("recurrence")

            # Handle recurrence due_date start dates
            if recurrence_val in ["weekdays", "monday_to_friday"]:
                # For Monday to Friday: start TODAY if today is Mon-Fri
                today_d = datetime.now().date()
                if today_d.weekday() < 5: # Monday (0) to Friday (4)
                    due_dt = datetime.combine(today_d, due_dt.time() if due_dt else datetime.min.time())
                else: # Saturday (5) or Sunday (6) -> start next Monday
                    days_ahead = (0 - today_d.weekday()) % 7
                    due_dt = datetime.combine(today_d + timedelta(days=days_ahead), due_dt.time() if due_dt else datetime.min.time())
            elif recurrence_val == "weekly_monday":
                today_d = datetime.now().date()
                days_ahead = (0 - today_d.weekday()) % 7 # 0 is Monday
                if days_ahead == 0 and due_dt and due_dt < datetime.now():
                    days_ahead = 7
                elif days_ahead == 0 and not (due_dt and due_dt >= datetime.now()):
                    days_ahead = 7
                if days_ahead > 0:
                    due_dt = datetime.combine(today_d + timedelta(days=days_ahead), due_dt.time() if due_dt else datetime.min.time())

            # Check if parent task with subtasks requested
            subtask_list = data.get("subtasks")
            if not subtask_list:
                p_match = re.search(r'(?:parent[s]?\s+task|parent)\s+(?:like\s+)?[\"\'\s]*([\w\s]+?)(?:[\"\'\s]+and|\s+and|\s+tells|\s+with)\s+.*?(?:subtask[s]?)\s+(.*)', user_msg, re.I)
                if p_match:
                    title = p_match.group(1).strip()
                    s_raw = p_match.group(2).strip()
                    if "january to december" in s_raw.lower() or "jan to dec" in s_raw.lower() or "जनवरी से दिसंबर" in s_raw:
                        subtask_list = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                    else:
                        subtask_list = [s.strip(" ,.-") for s in re.split(r',| and | aur | और ', s_raw) if s.strip()]

            task = Task(
                user_email=eff_email,
                title=title,
                priority=data.get("priority", "medium"),
                reminder_time=r_time,
                due_date=due_dt,
                recurrence=recurrence_val,
                notified=False
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            executed = True

            # If subtasks are defined, create child tasks linked by parent_id
            if subtask_list and isinstance(subtask_list, list) and len(subtask_list) > 0:
                for st in subtask_list:
                    st_name = str(st).strip()
                    if st_name:
                        db.add(Task(
                            user_email=eff_email,
                            title=st_name,
                            parent_id=task.id,
                            priority=task.priority,
                            status="pending",
                            notified=False
                        ))
                db.commit()

                if lang == "en":
                    result_message = f"Parent task \"{task.title}\" and {len(subtask_list)} subtasks created successfully! 📁✅"
                elif lang == "hinglish":
                    result_message = f"Parent task \"{task.title}\" aur {len(subtask_list)} subtasks create ho gaye hain! 📁✅"
                else:
                    result_message = f"पैरेंट टास्क \"{task.title}\" और इसके {len(subtask_list)} सब-टास्क सफलतापूर्वक बनाए गए! 📁✅"
            else:
                repeat_tag = ""
                if recurrence_val == "daily":
                    repeat_tag = " [DAILY 🔁]"
                elif recurrence_val in ["weekdays", "monday_to_friday"]:
                    repeat_tag = " [MON-FRI 🔁]"
                elif recurrence_val == "weekly_monday":
                    repeat_tag = " [EVERY MONDAY 🔁]"

                if lang == "en":
                    time_part = f" for {task.reminder_time}" if task.reminder_time else ""
                    prefix = "Recurring reminder" if recurrence_val else "Reminder"
                    result_message = f"{prefix} scheduled{time_part}: \"{task.title}\" ⏰{repeat_tag} [{task.priority.upper()}]"
                elif lang == "hinglish":
                    time_part = f" {task.reminder_time} ke liye" if task.reminder_time else ""
                    prefix = "Aapka recurring reminder" if recurrence_val else "Aapka reminder"
                    result_message = f"{prefix}{time_part} set ho gaya hai: \"{task.title}\" ⏰{repeat_tag} [{task.priority.upper()}]"
                else: # 'hi' or 'auto'
                    time_part = f" ({task.reminder_time} के लिए)" if task.reminder_time else ""
                    prefix = "पुनरावर्ती (Recurring) रिमाइंडर" if recurrence_val else "रिमाइंडर"
                    result_message = f"{prefix} एजेंडा में सेट किया गया{time_part}: \"{task.title}\" ⏰{repeat_tag} [{task.priority.upper()}]"
                undo_payload = json.dumps({"table": "tasks", "id": task.id})

    elif action == "youtube":
        q = data.get("query")
        if not q or q == user_msg or q.lower() in ["any", "some", "a", "song", "video", "youtube"]:
            clean_yt = re.sub(r'(?i)\b(can you|could you|please|kripya|play|open|suno|sunao|chalao|chala do|chala|bajao|baja do|gana|gaana|song|songs|video|videos|music|bhajan|kholo|karo|dekho)\b', '', user_msg)
            clean_yt = re.sub(r'(?i)\b(on|in|par|pe|me|se)\s+youtube\b', '', clean_yt)
            clean_yt = re.sub(r'(?i)\byoutube\b', '', clean_yt)
            clean_yt = re.sub(r'(?i)\b(any|some|a|an|the|good|top|best|koi|kuch|ek|accha|achha|hit|latest|naya|purana|new|old|bhi|sa|to|kripya)\b', '', clean_yt)
            clean_yt = re.sub(r'(?i)\b(ka|ke|ki|for)\b\s*$', '', clean_yt).strip()
            q = re.sub(r'\s+', ' ', clean_yt).strip(' :-.,')
            if not q or len(q) < 2 or q.lower() in ["youtube", "video", "song", "gana", "gaana", "trending", "music", "sangeet"]:
                q = "Top Trending Songs"
        try:
            from ai_engine import resolve_youtube_playback
        except ImportError:
            from .ai_engine import resolve_youtube_playback
        yt_info = resolve_youtube_playback(q)
        data.update(yt_info)
        watch_url = yt_info.get("watch_url") or data.get("url")
        executed = True
        if lang == "en":
            result_message = f"🎬 **Playing on YouTube:**\n« {q} »\n\n▶️ **Play Video:** {watch_url} 🎵"
        elif lang == "hinglish":
            result_message = f"🎬 **YouTube par chala raha hoon:**\n« {q} »\n\n▶️ **Play Video:** {watch_url} 🎵"
        else:
            result_message = f"🎬 **YouTube पर चलाया जा रहा है:**\n« {q} »\n\n▶️ **वीडियो चलाएं:** {watch_url} 🎵"

    elif action == "call":
        raw_name = data.get("contact_name") or "Contact"
        # Clean leading words like "make a call to", "lets call", "call", "dial", etc.
        c_name = re.sub(r'(?i)^(?:make\s+a\s+call\s+to|make\s+a\s+call|let\'?s\s+call|call\s+to|call|dial|phone|please\s+call)\s+', '', raw_name).strip() or "Contact"
        c_name = re.sub(r'(?i)\s+(?:ko|ko\s+call|par\s+call|ko\s+phone)$', '', c_name).strip() or c_name
        data["contact_name"] = c_name

        c_num = data.get("phone_number")
        if not c_num:
            p_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', user_msg)
            if p_match:
                c_num = p_match.group(1).replace(" ", "").replace("-", "")
                data["phone_number"] = c_num

        # Smart Memory Lookup: Check if user stored this contact's phone number in memory vault (AETH-P0-02)
        if not c_num:
            try:
                search_terms = [c_name.lower(), c_name.replace(" ", "").lower()]
                mems = db.query(MemoryItem).filter(
                    MemoryItem.owner_user_id == owner_user_id,
                    or_(*[MemoryItem.fact.ilike(f"%{term}%") for term in search_terms])
                ).order_by(MemoryItem.importance.desc(), MemoryItem.id.desc()).limit(25).all()
                for m in mems:
                    m_fact = (m.fact or "").lower()
                    if any(st in m_fact for st in search_terms):
                        mem_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', m.fact or "")
                        if mem_match:
                            c_num = mem_match.group(1).replace(" ", "").replace("-", "")
                            data["phone_number"] = c_num
                            break
            except Exception as e_mem:
                print(f"[Contact Memory Lookup Note] {e_mem}")

        tel_url = f"tel:{c_num}" if c_num else "tel:"
        data["tel_url"] = tel_url
        executed = True
        if c_num:
            if lang == "en":
                result_message = f"📞 **Calling {c_name}** ({c_num})...\n\nTap Call below to dial directly on your phone. 📱"
            elif lang == "hinglish":
                result_message = f"📞 **{c_name} ({c_num}) ko call milayi ja rahi hai...**\n\nDirect dial karne ke liye Call button dabayein! 📱"
            else:
                result_message = f"📞 **{c_name} ({c_num}) को कॉल मिलाई जा रही है...**\n\nसीधे डायल करने के लिए नीचे दिए गए 'Call' बटन पर टैप करें। 📱"
        else:
            if lang == "en":
                result_message = f"📞 **Calling {c_name}:**\nTap **Call Now** to enter {c_name}'s number and dial directly. (Aether will remember this contact for next time!) 📱"
            elif lang == "hinglish":
                result_message = f"📞 **{c_name} ko call karne ke liye:**\n**Call Now** dabakar number enter karein aur dial karein. Agli baar ke liye Aether ise yaad rakhega! 📱"
            else:
                result_message = f"📞 **{c_name} को कॉल करने के लिए:**\nसीधे डायल करने के लिए नीचे **Call Now** पर टैप करके नंबर दर्ज करें। (Aether अगली बार के लिए यह नंबर याद रखेगा!) 📱"

    elif action == "draft_email":
        recip = data.get("email_recipient") or "Recipient"
        subj = data.get("email_subject") or "Follow-up"
        body = data.get("email_body") or ""
        import urllib.parse
        mailto_url = f"mailto:{recip}?subject={urllib.parse.quote(subj)}&body={urllib.parse.quote(body)}"
        data["mailto_url"] = mailto_url
        executed = True
        if lang == "en":
            result_message = f"✉️ **Email Draft Ready for Review:**\n• **To**: {recip}\n• **Subject**: {subj}\n\nReview or launch draft in your email client below. 📝"
        elif lang == "hinglish":
            result_message = f"✉️ **Email draft taiyar hai:**\n• **To**: {recip}\n• **Subject**: {subj}\n\nReview karne ya Gmail me kholne ke liye niche draft card dekhein. 📝"
        else:
            result_message = f"✉️ **ईमेल ड्राफ्ट समीक्षा के लिए तैयार है:**\n• **प्राप्तकर्ता**: {recip}\n• **विषय**: {subj}\n\nसमीक्षा करने या सीधे ईमेल क्लाइंट में खोलने के लिए नीचे दिया गया कार्ड देखें। 📝"

    elif action == "upi_pay":
        payee_name = data.get("payee_name") or "Recipient"
        amount = str(data.get("amount") or "")
        upi_id = data.get("upi_id") or ""
        note = data.get("note") or f"Payment to {payee_name}"
        
        # Check Memory Vault for recipient's UPI ID or phone number
        if not upi_id:
            try:
                target_email = get_effective_email(eff_email or user_email)
                from memory.hybrid_provider import HybridMemoryProvider
                recalled = HybridMemoryProvider.recall_context(f"UPI ID or phone number for {payee_name}", target_email, db, limit=5)
                for mem in recalled.get("top_memories", []):
                    upi_match = re.search(r'([A-Za-z0-9._%+-]+@[a-zA-Z0-9.-]+)', mem.fact or "")
                    if upi_match:
                        upi_id = upi_match.group(1).lower()
                        data["upi_id"] = upi_id
                        break
                    # If phone number found, check if it's 10 digits
                    phone_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', mem.fact or "")
                    if phone_match and not upi_id:
                        p_digits = re.sub(r'[^\d]', '', phone_match.group(1))
                        if len(p_digits) >= 10:
                            upi_id = f"{p_digits[-10:]}@upi"
                            data["upi_id"] = upi_id
            except Exception as e_upi_lookup:
                print(f"[UPI Memory Lookup Note] {e_upi_lookup}")

        clean_amt = re.sub(r'[^\d\.]', '', amount) if amount else ""
        if clean_amt:
            try:
                clean_amt = f"{float(clean_amt):.2f}"
            except Exception:
                pass

        data["payee_name"] = payee_name
        data["amount"] = clean_amt
        data["upi_id"] = upi_id
        data["note"] = note

        import urllib.parse
        pa_param = f"&pa={upi_id}" if upi_id else ""
        am_param = f"&am={clean_amt}" if clean_amt else ""
        pn_param = f"&pn={urllib.parse.quote(payee_name)}"
        tn_param = f"&tn={urllib.parse.quote(note)}"
        upi_uri = f"upi://pay?cu=INR{pa_param}{pn_param}{am_param}{tn_param}"
        data["upi_uri"] = upi_uri
        executed = True

        amt_display = f"₹{clean_amt}" if clean_amt else ""
        if lang == "en":
            result_message = f"⚡ **UPI Payment Ready:** {amt_display} to **{payee_name}**\n\nTap **Pay Now** to launch Google Pay, PhonePe, or Paytm directly. 💸"
        elif lang == "hinglish":
            result_message = f"⚡ **UPI Payment Taiyar:** {amt_display} **{payee_name}** ko\n\nGoogle Pay, PhonePe ya Paytm se payment karne ke liye niche **Pay Now** dabayein. 💸"
        else:
            result_message = f"⚡ **UPI पेमेंट तैयार है:** {amt_display} **{payee_name}** के लिए\n\nGoogle Pay, PhonePe या Paytm से तुरंत भुगतान करने के लिए नीचे **Pay Now** पर टैप करें। 💸"

    else:
        fallback_greeting = (
            f"नमस्ते {req.user_name or 'साथी'}! मैं सुन रहा हूँ। बताइए, मैं आपकी क्या सहायता करूँ?"
            if (lang == "hi" or lang == "auto")
            else f"Hello {req.user_name or 'Pawan'}! I am listening. How can I assist you right now?"
        )
        result_message = data.get("response") or data.get("explanation") or data.get("message") or fallback_greeting
        data["response"] = result_message
        executed = True

    if not result_message or not result_message.strip():
        fallback_greeting = (
            f"नमस्ते {req.user_name or 'साथी'}! मैं सुन रहा हूँ। बताइए, मैं आपकी क्या सहायता करूँ?"
            if (lang == "hi" or lang == "auto")
            else f"Hello {req.user_name or 'Pawan'}! I am listening. How can I assist you right now?"
        )
        result_message = data.get("response") or data.get("explanation") or fallback_greeting
        data["response"] = result_message

    # Record AI Response in Chat History (resilient to schema constraints, skip for temporary chats)
    if not is_temporary:
        try:
            effective_msg = (result_message and result_message.strip()) or (data.get("response") if isinstance(data, dict) else None) or "प्रतिक्रिया संसाधित की गई।"
            ai_chat = ChatMessage(
                user_email=eff_email,
                owner_user_id=owner_user_id,
                session_id=active_session_id,
                role="assistant",
                content=effective_msg,
                action_type=action,
                action_data=json.dumps(data) if data else None,
                confidence=confidence
            )
            db.add(ai_chat)

            # Log to Audit Log if real action was taken
            if executed and action != "query":
                audit = AuditLog(
                    user_email=eff_email,
                    owner_user_id=owner_user_id,
                    action_type=f"auto_{action}",
                    details=effective_msg,
                    confidence_score=confidence,
                    undo_payload=undo_payload
                )
                db.add(audit)
            
            db.commit()
        except Exception as chat_db_err:
            db.rollback()
            try:
                effective_msg = (result_message and result_message.strip()) or (data.get("response") if isinstance(data, dict) else None) or "प्रतिक्रिया संसाधित की गई।"
                ai_chat = ChatMessage(
                    user_email=eff_email,
                    owner_user_id=owner_user_id,
                    role="assistant",
                    content=effective_msg,
                    action_type=action,
                    action_data=json.dumps(data) if data else None,
                    confidence=confidence
                )
                db.add(ai_chat)
                db.commit()
            except Exception:
                db.rollback()
            print(f"[Aether Chat Record Note] {chat_db_err}")

    if req.image_data or req.images:
        trim_memory()

    return {
        "status": "executed",
        "action": action,
        "confidence_level": conf_level,
        "confidence": confidence,
        "message": result_message,
        "parsed": parsed,
        "can_undo": undo_payload is not None
    }

# ----------------- Direct Chat Endpoint (Gemini Live & Third-Party) -----------------
class DirectChatRequest(BaseModel):
    prompt: Optional[str] = None
    input_text: Optional[str] = None
    user_email: Optional[str] = None
    lang: Optional[str] = "auto"
    language: Optional[str] = None
    live_voice: Optional[bool] = False
    api_key: Optional[str] = None
    openai_key: Optional[str] = None
    grok_key: Optional[str] = None
    active_provider: Optional[str] = None
    user_name: Optional[str] = None
    client_time: Optional[str] = None
    timezone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None

@app.post("/api/chat")
@app.post("/chat")
async def direct_chat_endpoint(
    req: DirectChatRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    text = (req.prompt or req.input_text or "").strip()
    if not text:
        return {"response": "नमस्ते! मैं सुन रहा हूँ, कृपया बोलें।", "content": "नमस्ते! मैं सुन रहा हूँ।"}
    
    qc_req = QuickCaptureRequest(
        input_text=text,
        language=req.language or req.lang or "auto",
        user_email=current_user.email,
        api_key=req.api_key,
        openai_key=req.openai_key,
        grok_key=req.grok_key,
        active_provider=req.active_provider,
        user_name=req.user_name,
        client_time=req.client_time,
        timezone=req.timezone,
        latitude=req.latitude,
        longitude=req.longitude,
        city=req.city
    )
    result = await _execute_quick_capture(qc_req, current_user, db)
    
    reply = result.get("message") or ""
    if not reply and result.get("parsed"):
        reply = result.get("parsed", {}).get("data", {}).get("response", "")
    if not reply or reply.strip() == "समझ गया।":
        # Provide natural, polite conversational answers instead of one-word robotic acknowledgments
        user_l = text.lower()
        is_hi = any('\u0900' <= ch <= '\u097f' for ch in text) or any(w in user_l for w in ["kya", "bhai", "kaise", "suno", "sun", "idhar", "batao", "namaste", "yaar"])
        is_en = any(w in user_l for w in ["listen", "hearing", "how", "what", "hello", "hi", "there", "you"])
        if is_hi:
            reply = "हाँ जी भाई, मैं आपकी बात ध्यान से सुन रहा हूँ। बताइए मैं क्या मदद करूँ?"
        elif is_en:
            reply = "Yes, I am listening to you clearly. How can I help you right now?"
        else:
            reply = "हाँ, मैं सुन रहा हूँ। कृपया बताइए अभी आपके किस काम में मदद करूँ?"
        
    return {
        "status": "ok",
        "response": reply,
        "content": reply,
        "action": result.get("action"),
        "data": result.get("parsed", {}).get("data")
    }

# ----------------- Translation Endpoint -----------------
@app.post("/api/translate")
async def translate_text(req: TranslateRequest):
    """Translate any text to Hindi or English using Gemini Free API."""
    prompt = f"Translate the following text to natural, clear {'Hindi (हिन्दी)' if req.target_lang == 'hi' else 'English'}. Keep links, names, and numbers intact. Return ONLY the translation, nothing else.\n\nText:\n{req.text}"
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        models = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash"]
        for m in models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key.strip()}"
                payload = {
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2}
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        translated = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        return {"translated": translated}
            except Exception as e:
                print(f"[Aether Engine] Translate error ({m}): {e}")
            
    return {"translated": req.text}

# ----------------- Location Detection -----------------
@app.get("/api/location/detect")
def detect_user_location(request: Request):
    """Detect client geographic location dynamically from client IP header or network IP."""
    client_ip = ""
    for hdr in ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"]:
        val = request.headers.get(hdr, "")
        if val:
            first_ip = val.split(",")[0].strip()
            if first_ip and not first_ip.startswith(("127.", "10.", "192.168.", "172.16.", "::1")):
                client_ip = first_ip
                break
    
    # 1. Try ipwho.is with client IP
    if client_ip:
        try:
            req = urllib.request.Request(f"https://ipwho.is/{client_ip}", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode())
                if data.get("success") and data.get("city"):
                    city = data.get("city")
                    region = data.get("region") or data.get("country") or ""
                    lat = float(data.get("latitude") or 26.9136)
                    lon = float(data.get("longitude") or 75.7858)
                    return {
                        "status": "success",
                        "city": city,
                        "region": region,
                        "latitude": lat,
                        "longitude": lon,
                        "display_name": f"{city}, {region}".strip(", ")
                    }
        except Exception as e:
            print(f"[Aether Engine] ipwho.is error: {e}")

    # 2. Try ip-api.com
    url = f"http://ip-api.com/json/{client_ip}" if client_ip else "http://ip-api.com/json/"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if data.get("status") == "success" and data.get("city"):
                city = data.get("city")
                region = data.get("regionName") or data.get("country") or ""
                # If foreign cloud server datacenter IP without client IP header
                if not client_ip and any(f in (city + " " + region).lower() for f in ["singapore", "frankfurt", "oregon", "virginia"]):
                    city = "Jaipur"
                    region = "Rajasthan"
                return {
                    "status": "success",
                    "city": city,
                    "region": region,
                    "latitude": data.get("lat", 26.9136),
                    "longitude": data.get("lon", 75.7858),
                    "display_name": f"{city}, {region}".strip(", ")
                }
    except Exception as e:
        print(f"[Aether Engine] IP Location lookup error: {e}")
    
    return {
        "status": "unknown",
        "city": "",
        "region": "",
        "latitude": 26.9136,
        "longitude": 75.7858,
        "display_name": ""
    }

# ----------------- Chat Sessions & History -----------------
@app.get("/api/chat/sessions")
def get_chat_sessions(
    limit: int = 50,
    offset: int = 0,
    response: Response = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    try:
        safe_limit, safe_offset = bounded_page(limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    # Exclude temporary sessions and retrieve only one bounded page.
    session_query = (
        db.query(ChatSession)
        .filter(tenant_filter(ChatSession, current_user), ~ChatSession.id.startswith("temp_"), ChatSession.id != "temporary")
        .order_by(ChatSession.updated_at.desc(), ChatSession.id.desc())
    )
    page_rows = session_query.offset(safe_offset).limit(safe_limit + 1).all()
    has_more = len(page_rows) > safe_limit
    sessions = page_rows[:safe_limit]
    if response is not None:
        response.headers["X-Has-More"] = "true" if has_more else "false"
        response.headers["X-Next-Offset"] = str(safe_offset + len(sessions))
    
    # If no sessions exist yet but user has legacy messages without session, backfill default session
    if not sessions and safe_offset == 0:
        try:
            first_msg = (
                db.query(ChatMessage)
                .filter(
                    tenant_filter(ChatMessage, current_user), 
                    ChatMessage.role == "user",
                    (ChatMessage.session_id == None) | (ChatMessage.session_id == "")
                )
                .order_by(ChatMessage.created_at.asc())
                .first()
            )
            if first_msg:
                raw_title = first_msg.content.replace("📸", "").strip()
                legacy_title = (raw_title[:36] + ("..." if len(raw_title) > 36 else "")) if raw_title else "Previous Conversation"
                default_session = ChatSession(
                    id="default",
                    user_email=current_user.email,
                    owner_user_id=current_user.id,
                    title=legacy_title,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(default_session)
                try:
                    db.query(ChatMessage).filter(
                        tenant_filter(ChatMessage, current_user), 
                        (ChatMessage.session_id == None) | (ChatMessage.session_id == "")
                    ).update({"session_id": "default"}, synchronize_session=False)
                except Exception:
                    pass
                db.commit()
                sessions = [default_session]
        except Exception as e:
            db.rollback()
            print(f"[Session Backfill Note] {e}")
            
    return [
        {
            "id": s.id,
            "title": s.title,
            "is_pinned": bool(getattr(s, "is_pinned", False)),
            "project": getattr(s, "project", None),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None
        }
        for s in sessions
    ]

@app.post("/api/chat/sessions")
def create_chat_session(
    req: ChatSessionCreate,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    sess_id = (req.id or "").strip() or f"sess_{int(datetime.utcnow().timestamp() * 1000)}"
    existing = db.query(ChatSession).filter(ChatSession.id == sess_id, tenant_filter(ChatSession, current_user)).first()
    if existing:
        existing.owner_user_id = current_user.id
        db.commit()
        return {
            "id": existing.id,
            "title": existing.title,
            "is_pinned": bool(getattr(existing, "is_pinned", False)),
            "project": getattr(existing, "project", None),
            "created_at": existing.created_at.isoformat() if existing.created_at else None,
            "updated_at": existing.updated_at.isoformat() if existing.updated_at else None
        }
    
    session = ChatSession(
        id=sess_id,
        owner_user_id=current_user.id,
        user_email=current_user.email,
        title=req.title or "New Conversation",
        is_pinned=bool(req.is_pinned),
        project=req.project,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "is_pinned": bool(session.is_pinned),
        "project": session.project,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None
    }

@app.put("/api/chat/sessions/{session_id}")
def update_chat_session(
    session_id: str,
    req: ChatSessionUpdate,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, tenant_filter(ChatSession, current_user)).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    session.owner_user_id = current_user.id
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if req.title is not None:
        clean_title = (req.title or "").strip()
        if clean_title:
            session.title = clean_title
    if req.project is not None:
        session.project = req.project.strip() if req.project else None
    if req.is_pinned is not None:
        session.is_pinned = bool(req.is_pinned)
    
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "is_pinned": bool(session.is_pinned),
        "project": session.project,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None
    }

@app.put("/api/chat/sessions/{session_id}/pin")
def pin_chat_session(
    session_id: str,
    req: ChatSessionPin,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    raw_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if raw_session:
        if raw_session.owner_user_id and raw_session.owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify another user's session")
        elif not raw_session.owner_user_id and raw_session.user_email and raw_session.user_email.strip().lower() != current_user.email:
            raise HTTPException(status_code=403, detail="Not authorized to modify another user's session")
        raw_session.owner_user_id = current_user.id
        raw_session.is_pinned = req.is_pinned
        raw_session.updated_at = datetime.utcnow()
        session = raw_session
    else:
        session = ChatSession(
            id=session_id,
            owner_user_id=current_user.id,
            user_email=current_user.email,
            title="Conversation",
            is_pinned=req.is_pinned,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(session)
    db.commit()
    return {"status": "ok", "id": session.id, "is_pinned": session.is_pinned}

@app.put("/api/chat/sessions/{session_id}/project")
def set_chat_session_project(
    session_id: str,
    req: ChatSessionProject,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    raw_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if raw_session:
        if raw_session.owner_user_id and raw_session.owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify another user's session")
        elif not raw_session.owner_user_id and raw_session.user_email and raw_session.user_email.strip().lower() != current_user.email:
            raise HTTPException(status_code=403, detail="Not authorized to modify another user's session")
        raw_session.owner_user_id = current_user.id
        raw_session.project = (req.project.strip() if req.project else None)
        raw_session.updated_at = datetime.utcnow()
        session = raw_session
    else:
        session = ChatSession(
            id=session_id,
            owner_user_id=current_user.id,
            user_email=current_user.email,
            title="Conversation",
            project=(req.project.strip() if req.project else None),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(session)
    db.commit()
    return {"status": "ok", "id": session.id, "project": session.project}

@app.delete("/api/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: str,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    try:
        if session_id == "default":
            db.query(ChatMessage).filter(
                (ChatMessage.session_id == "default") | (ChatMessage.session_id == None) | (ChatMessage.session_id == ""),
                tenant_filter(ChatMessage, current_user)
            ).delete(synchronize_session=False)
        else:
            db.query(ChatMessage).filter(
                ChatMessage.session_id == session_id,
                tenant_filter(ChatMessage, current_user)
            ).delete(synchronize_session=False)

        session = db.query(ChatSession).filter(ChatSession.id == session_id, tenant_filter(ChatSession, current_user)).first()
        if session:
            db.delete(session)
        db.commit()
        return {"status": "success", "message": "Chat session deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[Delete Session Error] {e}")
        return {"status": "success", "message": "Chat session cleared"}

@app.get("/api/chat/history")
def get_chat_history(
    session_id: Optional[str] = None,
    limit: int = 60,
    offset: int = 0,
    current_user: UserIdentity = Depends(get_current_user_identity),
    response: Response = None,
    db: Session = Depends(get_db)
):
    """Return the newest bounded page, in chronological order.

    Applying LIMIT/OFFSET in SQL avoids loading a user's entire chat history into
    the Render process just to return the last few messages.
    """
    try:
        safe_limit, safe_offset = bounded_page(limit, offset)
        query = db.query(ChatMessage).filter(tenant_filter(ChatMessage, current_user))
        if session_id:
            query = query.filter(ChatMessage.session_id == session_id)
        page_rows = (
            query.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .offset(safe_offset)
            .limit(safe_limit + 1)
            .all()
        )
        has_more = len(page_rows) > safe_limit
        msgs = page_rows[:safe_limit]
        if response is not None:
            response.headers["X-Has-More"] = "true" if has_more else "false"
            response.headers["X-Next-Offset"] = str(safe_offset + len(msgs))
        return list(reversed(msgs))
    except Exception:
        db.rollback()
        raise

@app.delete("/api/chat/history")
def clear_chat_history(
    session_id: Optional[str] = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    query = db.query(ChatMessage).filter(tenant_filter(ChatMessage, current_user))
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
        db.query(ChatSession).filter(ChatSession.id == session_id, tenant_filter(ChatSession, current_user)).delete(synchronize_session=False)
    query.delete(synchronize_session=False)
    db.commit()
    return {"message": "Chat history cleared"}

@app.get("/api/news")
def get_live_news(limit: int = 5, category: str = None):
    try:
        from ai_engine import get_structured_news
    except ImportError:
        from .ai_engine import get_structured_news
    return get_structured_news(limit=limit, category=category)

@app.get("/api/cricket/live")
def get_live_cricket(filter_intl: bool = False, force: bool = False):
    """Returns real-time live cricket scorecards and upcoming matches from ESPNcricinfo."""
    try:
        from ai_engine import fetch_cricinfo_live_matches
    except ImportError:
        from .ai_engine import fetch_cricinfo_live_matches
    matches = fetch_cricinfo_live_matches(force=force)
    if filter_intl:
        matches = [m for m in matches if m.get("is_international")]
    
    live_count = sum(1 for m in matches if m.get("status") == "in")
    intl_count = sum(1 for m in matches if m.get("is_international"))
    
    return {
        "status": "success",
        "matches": matches,
        "live_count": live_count,
        "intl_count": intl_count,
        "total_count": len(matches),
        "last_updated": datetime.now().isoformat()
    }

@app.get("/api/cricket/match/{match_id}")
def get_cricket_match_detail(match_id: str, league_id: Optional[str] = None, force: bool = False):
    """Fetches comprehensive batting, bowling scorecards, rosters and notes for a specific match."""
    try:
        from ai_engine import fetch_cricinfo_match_scorecard
    except ImportError:
        from .ai_engine import fetch_cricinfo_match_scorecard
    return fetch_cricinfo_match_scorecard(match_id=match_id, league_id=league_id, force=force)


# ----------------- Reminders & Notification Engine -----------------
def get_next_weekday(dt: datetime) -> datetime:
    next_day = dt + timedelta(days=1)
    while next_day.weekday() >= 5: # 5=Sat, 6=Sun
        next_day += timedelta(days=1)
    return next_day

def auto_advance_recurring_tasks(db: Session, owner_user_id: Optional[str] = None):
    """Stream recurring tasks in small batches; never load the tenant's full task table."""
    try:
        if not owner_user_id or not str(owner_user_id).strip():
            print("[Security Notice] auto_advance_recurring_tasks called without valid owner_user_id - failing closed.")
            return
        now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
        today = now.date()
        updated = False
        last_id = 0
        while True:
            batch = db.query(Task).filter(
                Task.recurrence != None,
                Task.owner_user_id == str(owner_user_id).strip(),
                Task.id > last_id
            ).order_by(Task.id.asc()).limit(100).all()
            if not batch:
                break
            last_id = batch[-1].id
            for task in batch:
                if task.status == "completed":
                    task.notified = True
                    continue
                title_lower = (task.title or "").lower()
                if any(word in title_lower for word in ["challan", "fine", "ticket", "one-time"]):
                    task.recurrence = None
                    task.notified = True
                    updated = True
                    continue
                if not task.due_date:
                    task.due_date = datetime.combine(today, datetime.min.time())
                    updated = True
                    continue
                due_dt = task.due_date
                if isinstance(due_dt, str):
                    due_dt = datetime.fromisoformat(due_dt.replace(" ", "T"))
                if due_dt.date() < today:
                    if task.recurrence == "daily":
                        new_dt = datetime.combine(today, due_dt.time())
                    elif task.recurrence in ["weekdays", "monday_to_friday"]:
                        new_dt = datetime.combine(today, due_dt.time())
                        while new_dt.weekday() >= 5:
                            new_dt += timedelta(days=1)
                    elif str(task.recurrence).startswith("weekly"):
                        new_dt = due_dt
                        while new_dt.date() < today:
                            new_dt += timedelta(days=7)
                    else:
                        new_dt = datetime.combine(today, due_dt.time())
                    task.due_date = new_dt
                    task.status = "pending"
                    task.notified = False
                    updated = True
            if updated:
                db.commit()
                updated = False
    except Exception as exc:
        db.rollback()
        print(f"[AutoAdvanceRecurringTasks Note] {exc}")

@app.get("/api/reminders/due")
def get_due_reminders(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Read only the small due-time window; old pending tasks are not scanned."""
    auto_advance_recurring_tasks(db, owner_user_id=current_user.id)
    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    start = now - timedelta(seconds=180)
    tasks = db.query(Task).filter(
        tenant_filter(Task, current_user),
        Task.status == "pending",
        Task.notified == False,
        Task.due_date >= start,
        Task.due_date <= now
    ).order_by(Task.due_date.asc(), Task.id.asc()).limit(200).all()
    due_tasks = []
    for task in tasks:
        dt = task.due_date
        try:
            if isinstance(dt, str):
                dt = datetime.fromisoformat(dt.replace(" ", "T"))
            due_tasks.append({
                "id": task.id, "title": task.title, "priority": task.priority,
                "reminder_time": task.reminder_time or dt.strftime("%I:%M %p"),
                "recurrence": getattr(task, "recurrence", None),
                "parent_id": getattr(task, "parent_id", None), "due_date": dt.isoformat()
            })
        except Exception as exc:
            print(f"[Reminder Due Filter Error] {exc}")
    return due_tasks

@app.post("/api/reminders/{task_id}/ack")
def acknowledge_reminder(
    task_id: int, 
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Acknowledge reminder for verified user (AETH-P0-02)."""
    query = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user))
    task = query.first()
    if task:
        task.notified = True
        db.commit()
        return {"status": "acknowledged", "task_id": task_id}
    raise HTTPException(status_code=404, detail="Task not found")

# ----------------- Tasks Endpoints -----------------
def serialize_task(t: Task, db: Optional[Session] = None) -> dict:
    res = {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "priority": t.priority,
        "status": t.status,
        "is_completed": t.status == "completed",
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "reminder_time": t.reminder_time,
        "recurrence": getattr(t, "recurrence", None),
        "parent_id": getattr(t, "parent_id", None),
        "notified": t.notified,
        "completion_comment": getattr(t, "completion_comment", None),
        "attachments": getattr(t, "attachments", None),
        "dependency_task_ids": json.loads(getattr(t, "dependency_task_ids", "[]") or "[]"),
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "subtasks": []
    }
    if db:
        child_query = db.query(Task).filter(
            Task.parent_id == t.id, Task.owner_user_id == t.owner_user_id
        ).order_by(Task.id.asc())
        subs = child_query.limit(101).all()
        res["subtasks"] = [serialize_task(st) for st in subs[:100]]
        res["subtasks_has_more"] = len(subs) > 100
    return res

@app.get("/api/tasks")
def list_tasks(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    response: Response = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Return a bounded task page; response headers expose continuation explicitly."""
    try:
        safe_limit, safe_offset = bounded_page(limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    auto_advance_recurring_tasks(db, owner_user_id=current_user.id)
    query = db.query(Task).filter(tenant_filter(Task, current_user))
    query = query.filter((Task.parent_id == None) | (Task.parent_id == 0))
    if status:
        query = query.filter(Task.status == status)

    page_rows = (
        query.order_by(Task.created_at.desc(), Task.id.desc())
        .offset(safe_offset).limit(safe_limit + 1).all()
    )
    has_more = len(page_rows) > safe_limit
    top_level_tasks = page_rows[:safe_limit]
    if response is not None:
        response.headers["X-Has-More"] = "true" if has_more else "false"
        response.headers["X-Next-Offset"] = str(safe_offset + len(top_level_tasks))
        response.headers["X-Page-Limit"] = str(safe_limit)

    task_ids = [t.id for t in top_level_tasks]
    date_completions_map = {}
    if task_ids:
        completion_rows = (
            db.query(TaskDateCompletion)
            .filter(tenant_filter(TaskDateCompletion, current_user), TaskDateCompletion.task_id.in_(task_ids))
            .order_by(TaskDateCompletion.id.desc())
            .limit(5000).all()
        )
        completion_counts = dict(
            db.query(TaskDateCompletion.task_id, func.count(TaskDateCompletion.id))
            .filter(tenant_filter(TaskDateCompletion, current_user), TaskDateCompletion.task_id.in_(task_ids))
            .group_by(TaskDateCompletion.task_id).all()
        )
        for item in completion_rows:
            date_completions_map.setdefault(item.task_id, {})[item.date_str] = item.completed

        # Keep nested children bounded per parent. The dedicated subtasks endpoint
        # exposes the rest, and the response marks parents with additional children.
        ranked_children = db.query(
            Task.id.label("id"),
            Task.parent_id.label("parent_id"),
            func.row_number().over(partition_by=Task.parent_id, order_by=Task.id.asc()).label("row_num")
        ).filter(
            tenant_filter(Task, current_user), Task.parent_id.in_(task_ids)
        ).subquery()
        subtasks = (
            db.query(Task)
            .join(ranked_children, Task.id == ranked_children.c.id)
            .filter(ranked_children.c.row_num <= 100)
            .order_by(Task.parent_id.asc(), Task.id.asc())
            .all()
        )
        subtask_counts = dict(
            db.query(Task.parent_id, func.count(Task.id))
            .filter(tenant_filter(Task, current_user), Task.parent_id.in_(task_ids))
            .group_by(Task.parent_id).all()
        )
    else:
        subtasks = []
        subtask_counts = {}

    subtasks_by_parent = {}
    for subtask in subtasks:
        subtasks_by_parent.setdefault(subtask.parent_id, []).append(subtask)

    tasks_out = []
    for task in top_level_tasks:
        children = subtasks_by_parent.get(task.id, [])
        serialized = serialize_task(task)
        serialized["subtasks"] = [serialize_task(child) for child in children]
        serialized["subtasks_has_more"] = subtask_counts.get(task.id, 0) > len(children)
        serialized["date_completions"] = date_completions_map.get(task.id, {})
        serialized["date_completions_has_more"] = completion_counts.get(task.id, 0) > len(serialized["date_completions"])
        tasks_out.append(serialized)
    return tasks_out

@app.get("/api/tasks/{task_id}/subtasks")
def list_task_subtasks(
    task_id: int,
    limit: int = 50,
    offset: int = 0,
    response: Response = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Fetch all child tasks in bounded pages; no child records are discarded."""
    parent = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user)).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        safe_limit, safe_offset = bounded_page(limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    rows = (
        db.query(Task).filter(Task.parent_id == task_id, tenant_filter(Task, current_user))
        .order_by(Task.id.asc()).offset(safe_offset).limit(safe_limit + 1).all()
    )
    has_more = len(rows) > safe_limit
    rows = rows[:safe_limit]
    if response is not None:
        response.headers["X-Has-More"] = "true" if has_more else "false"
        response.headers["X-Next-Offset"] = str(safe_offset + len(rows))
    return [serialize_task(row) for row in rows]

@app.post("/api/tasks")
def create_task(
    task_in: TaskCreate, 
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    eff_email = current_user.email
    data = task_in.dict()
    data["user_email"] = eff_email
    data["owner_user_id"] = current_user.id
    subtasks = data.pop("subtasks", None)
    
    # Enforce strict multi-tenant boundary on parent_id
    if data.get("parent_id"):
        parent_task = db.query(Task).filter(Task.id == data["parent_id"], tenant_filter(Task, current_user)).first()
        if not parent_task:
            raise HTTPException(status_code=403, detail="Parent task not found or access denied")

    deps = data.pop("dependency_task_ids", None)
    if deps is not None:
        for dep_id in deps:
            if not db.query(Task).filter(Task.id == dep_id, tenant_filter(Task, current_user)).first():
                raise HTTPException(status_code=403, detail=f"Dependency task {dep_id} not found or access denied")
        data["dependency_task_ids"] = json.dumps(deps)
    task = Task(**data)
    if task.reminder_time:
        time_comp = parse_reminder_time_components(task.reminder_time)
        if time_comp:
            hrs, mins = time_comp
            now_dt = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
            base_dt = task.due_date if task.due_date else now_dt
            task.due_date = base_dt.replace(hour=hrs, minute=mins, second=0, microsecond=0)
    db.add(task)
    db.commit()
    db.refresh(task)
    if subtasks and isinstance(subtasks, list):
        for st in subtasks:
            st_name = str(st).strip()
            if st_name:
                db.add(Task(user_email=eff_email, owner_user_id=current_user.id, title=st_name, parent_id=task.id, priority=task.priority, status="pending"))
        db.commit()
    return serialize_task(task, db=db)

@app.put("/api/tasks/{task_id}")
def update_task(
    task_id: int,
    req: TaskUpdate,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user))
    task = query.first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.owner_user_id = current_user.id
    
    if req.title is not None and req.title.strip():
        task.title = req.title.strip()
    if req.description is not None:
        task.description = req.description.strip()
    if req.priority is not None:
        task.priority = req.priority
    if req.due_date is not None:
        task.due_date = req.due_date
    if req.reminder_time is not None:
        task.reminder_time = req.reminder_time.strip()
    if req.recurrence is not None:
        task.recurrence = req.recurrence
    if req.dependency_task_ids is not None:
        for dep_id in req.dependency_task_ids:
            if not db.query(Task).filter(Task.id == dep_id, tenant_filter(Task, current_user)).first():
                raise HTTPException(status_code=403, detail=f"Dependency task {dep_id} not found or access denied")
        task.dependency_task_ids = json.dumps(req.dependency_task_ids)
    if req.status is not None:
        task.status = req.status
    if req.completion_comment is not None:
        task.completion_comment = req.completion_comment.strip()
    if req.attachments is not None:
        task.attachments = req.attachments.strip()

    db.commit()
    db.refresh(task)
    return serialize_task(task, db=db)

@app.put("/api/tasks/{task_id}/toggle")
def toggle_task(
    task_id: int, 
    req: Optional[TaskToggleRequest] = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user))
    task = query.first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.owner_user_id = current_user.id
    
    if req and req.status in ["completed", "pending"]:
        new_status = req.status
    else:
        new_status = "completed" if task.status != "completed" else "pending"

    # Dependency Tree Check (AETH-TASK-01): Block completion if dependencies are pending
    if new_status == "completed" and task.dependency_task_ids:
        try:
            dep_ids = json.loads(task.dependency_task_ids)
            if dep_ids and isinstance(dep_ids, list):
                blocking = db.query(Task).filter(
                    Task.id.in_(dep_ids),
                    Task.status != "completed"
                ).all()
                if blocking:
                    titles = [b.title for b in blocking]
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot complete task: blocked by uncompleted dependencies: {', '.join(titles)}"
                    )
        except HTTPException:
            raise
        except Exception:
            pass

    now_dt = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    today_str = now_dt.strftime("%Y-%m-%d")
    target_date = (req.date.strip() if req and req.date else today_str)

    is_recurring = bool(task.recurrence and str(task.recurrence).strip())

    if is_recurring:
        # A recurring task is an ongoing series. The master task template row MUST remain "pending"
        # so that tomorrow and future dates are NEVER pre-marked as completed!
        # Only TaskDateCompletion records completion for the specific target_date.
        task.status = "pending"
        try:
            rec = db.query(TaskDateCompletion).filter(
                TaskDateCompletion.task_id == task.id,
                TaskDateCompletion.date_str == target_date,
                tenant_filter(TaskDateCompletion, current_user)
            ).first()
            if rec:
                rec.completed = (new_status == "completed")
            else:
                db.add(TaskDateCompletion(
                    task_id=task.id,
                    owner_user_id=current_user.id,
                    user_email=current_user.email,
                    date_str=target_date,
                    completed=(new_status == "completed"),
                    created_at=datetime.utcnow()
                ))
        except Exception as e:
            print(f"[toggle_task] Date completion note: {e}")
    else:
        task.status = new_status
        if new_status == "completed":
            task.notified = True

    if req:
        if req.completion_comment is not None:
            task.completion_comment = req.completion_comment.strip()
        if req.attachments is not None:
            task.attachments = req.attachments.strip()
    
    # If this task is a subtask, update parent task progress
    if getattr(task, "parent_id", None):
        parent = db.query(Task).filter(Task.id == task.parent_id, tenant_filter(Task, current_user)).first()
        if parent:
            incomplete_subtasks = db.query(func.count(Task.id)).filter(
                Task.parent_id == parent.id,
                Task.status != "completed",
                tenant_filter(Task, current_user)
            ).scalar() or 0
            parent.status = "pending" if incomplete_subtasks else "completed"

    # Bulk-update child rows in PostgreSQL; do not hydrate an arbitrarily large tree.
    db.query(Task).filter(
        Task.parent_id == task.id, tenant_filter(Task, current_user)
    ).update({"status": new_status}, synchronize_session=False)

    db.commit()
    db.refresh(task)
    serialized = serialize_task(task, db=db)
    if is_recurring:
        serialized["is_completed"] = (new_status == "completed")
        serialized["status"] = new_status
        serialized["date_completions"] = {target_date: (new_status == "completed")}
    return serialized

@app.get("/api/tasks/date-completions")
def get_task_date_completions(
    task_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    response: Response = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Return completion history in bounded pages; use task_id to page one task."""
    try:
        safe_limit, safe_offset = bounded_page(limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    query = db.query(TaskDateCompletion).filter(tenant_filter(TaskDateCompletion, current_user))
    if task_id is not None:
        owned_task = db.query(Task.id).filter(Task.id == task_id, tenant_filter(Task, current_user)).first()
        if not owned_task:
            raise HTTPException(status_code=404, detail="Task not found")
        query = query.filter(TaskDateCompletion.task_id == task_id)
    rows = query.order_by(TaskDateCompletion.id.desc()).offset(safe_offset).limit(safe_limit + 1).all()
    has_more = len(rows) > safe_limit
    rows = rows[:safe_limit]
    if response is not None:
        response.headers["X-Has-More"] = "true" if has_more else "false"
        response.headers["X-Next-Offset"] = str(safe_offset + len(rows))
    result = {}
    for row in rows:
        result.setdefault(row.task_id, {})[row.date_str] = row.completed
    return result

@app.post("/api/tasks/{task_id}/date-completion")
def set_task_date_completion(
    task_id: int,
    req: DateCompletionRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    eff_email = current_user.email

    task = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    clean_date = req.date.strip()
    rec = db.query(TaskDateCompletion).filter(
        TaskDateCompletion.task_id == task_id,
        TaskDateCompletion.date_str == clean_date,
        tenant_filter(TaskDateCompletion, current_user)
    ).first()

    if rec:
        rec.completed = req.completed
        rec.owner_user_id = current_user.id
    else:
        rec = TaskDateCompletion(
            task_id=task_id,
            owner_user_id=current_user.id,
            user_email=eff_email,
            date_str=clean_date,
            completed=req.completed,
            created_at=datetime.utcnow()
        )
        db.add(rec)

    now_dt = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    today_str = now_dt.strftime("%Y-%m-%d")
    if clean_date == today_str:
        task.status = "completed" if req.completed else "pending"
        task.notified = req.completed

    db.commit()
    return {"status": "ok", "task_id": task_id, "date": clean_date, "completed": req.completed}

# ─── Actionable Task Notifications (Complete & Snooze for SW and Push) ────────
class TaskSnoozeRequest(BaseModel):
    minutes: Optional[int] = 15

@app.post("/api/tasks/{task_id}/complete")
@app.post("/tasks/{task_id}/complete")
def complete_task_action(
    task_id: int,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "completed"
    task.completed = True
    task.notified = True
    db.commit()
    return {"status": "ok", "task_id": task_id, "action": "completed", "title": task.title}

@app.post("/api/tasks/{task_id}/snooze")
@app.post("/tasks/{task_id}/snooze")
def snooze_task_action(
    task_id: int,
    req: Optional[TaskSnoozeRequest] = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    mins = (req.minutes if req and req.minutes else 15)
    now_dt = datetime.now()
    new_due = now_dt + timedelta(minutes=mins)
    task.due_date = new_due.strftime("%Y-%m-%d %H:%M")
    task.reminder_time = new_due.strftime("%H:%M")
    task.notified = False # Re-arm reminder notification!
    db.commit()
    return {"status": "ok", "task_id": task_id, "action": "snoozed", "snooze_minutes": mins, "new_due_date": task.due_date}

# ─── Task Attachment Downloads (Safe & Seamless for Mobile App & Browser) ─────
_temp_attachment_downloads = {}

@app.post("/api/tasks/temp-download")
@app.post("/tasks/temp-download")
def create_temp_task_download(req: TaskAttachmentDownloadRequest):
    import uuid
    token = str(uuid.uuid4())
    data_str = (req.data or "").strip()
    if not data_str:
        raise HTTPException(status_code=400, detail="Empty attachment data")

    mime = req.mime_type
    if "," in data_str:
        header, b64_str = data_str.split(",", 1)
        if not mime and "data:" in header and ";" in header:
            mime = header.split("data:")[1].split(";")[0]
    else:
        b64_str = data_str

    try:
        raw_bytes = base64.b64decode(b64_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 encoding: {e}")

    now = time.time()
    # clean expired tokens older than 15 minutes
    expired_keys = [k for k, v in _temp_attachment_downloads.items() if v.get("expires_at", 0) < now]
    for k in expired_keys:
        _temp_attachment_downloads.pop(k, None)

    _temp_attachment_downloads[token] = {
        "filename": req.filename or "attachment",
        "mime_type": mime or "application/octet-stream",
        "bytes": raw_bytes,
        "expires_at": now + 900
    }

    return {"token": token, "download_url": f"/api/tasks/download-file?token={token}"}

@app.get("/api/tasks/download-file")
@app.get("/tasks/download-file")
def download_task_attachment_file(token: str):
    import urllib.parse
    now = time.time()
    item = _temp_attachment_downloads.get(token)
    if not item or item.get("expires_at", 0) < now:
        raise HTTPException(status_code=404, detail="Download link expired or not found")

    filename = item.get("filename", "attachment")
    safe_filename = filename.replace('"', '\\"')
    quoted_filename = urllib.parse.quote(filename)
    mime = item.get("mime_type", "application/octet-stream")

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_filename}"; filename*=UTF-8\'\'{quoted_filename}',
        "Content-Type": mime,
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Cache-Control": "no-cache"
    }
    return Response(content=item["bytes"], media_type=mime, headers=headers)

@app.put("/api/tasks/{task_id}/reschedule")
def reschedule_task(
    task_id: int, 
    req: TaskReschedule, 
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if req.due_date:
        task.due_date = req.due_date
    if req.reminder_time:
        task.reminder_time = req.reminder_time
    task.status = "pending"
    task.notified = False
    db.commit()
    db.refresh(task)
    return serialize_task(task, db=db)

@app.post("/api/tasks/reschedule-overdue")
def reschedule_all_overdue(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Reschedule overdue tasks using keyset batches; no full-table ORM load."""
    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    today = now.date()
    count = 0
    last_id = 0
    while True:
        batch = db.query(Task).filter(
            tenant_filter(Task, current_user), Task.status == "pending",
            Task.recurrence == None, Task.due_date != None, Task.id > last_id
        ).order_by(Task.id.asc()).limit(200).all()
        if not batch:
            break
        last_id = batch[-1].id
        batch_changed = 0
        for task in batch:
            due = task.due_date
            if isinstance(due, str):
                try:
                    due = datetime.fromisoformat(due.replace(" ", "T"))
                except Exception:
                    continue
            if due and due.date() < today:
                task.due_date = datetime.combine(today, due.time())
                task.notified = False
                batch_changed += 1
        if batch_changed:
            db.commit()
            count += batch_changed
    return {"status": "ok", "rescheduled_count": count}

@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int, 
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id, tenant_filter(Task, current_user)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Delete child subtasks if parent is deleted
    try:
        db.query(Task).filter(Task.parent_id == task.id, tenant_filter(Task, current_user)).delete(synchronize_session=False)
    except Exception as e:
        print(f"[Delete Subtasks Note] {e}")
    db.delete(task)
    db.commit()
    return {"message": "Task and subtasks deleted successfully"}

@app.post("/api/calendar/sync-ical")
def sync_ical_feed(req: ICalSyncRequest, user_email: Optional[str] = Depends(get_user_email)):
    import ipaddress
    import socket
    import urllib.parse
    import urllib.request

    raw_url = req.url.strip()
    parsed = urllib.parse.urlparse(raw_url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid URL. Link must start with http:// or https://")

    try:
        addr_infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve calendar host")

    for info in addr_infos:
        ip_str = info[4][0].split("%")[0]
        ip_obj = ipaddress.ip_address(ip_str)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            raise HTTPException(status_code=400, detail="Private or local calendar URLs are not allowed")

    # Detect common mistake: user pasting the Google Calendar browser URL instead of the secret iCal URL
    if "calendar.google.com/calendar/u/" in raw_url or "/calendar/r" in raw_url:
        raise HTTPException(
            status_code=400, 
            detail="यह Google Calendar का वेब ब्राउज़र लिंक है। Google Calendar से लाइव सिंक करने के लिए Settings (⚙️) → अपने कैलेंडर पर क्लिक करें → 'Secret address in iCal format' (.ics) लिंक कॉपी करके पेस्ट करें।"
        )
    
    try:
        req_obj = urllib.request.Request(
            raw_url, 
            headers={"User-Agent": "Mozilla/5.0 (compatible; AetherCalendar/1.0)"}
        )
        with urllib.request.urlopen(req_obj, timeout=12) as response:
            content = response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google Calendar लिंक लोड करने में त्रुटि: {str(e)}")

    if "<!doctype html" in content.lower() or "accounts.google.com" in content or "BEGIN:VCALENDAR" not in content:
        raise HTTPException(
            status_code=400,
            detail="दिए गए लिंक से कैलेंडर डेटा (.ics फ़ीड) नहीं मिला। कृपया Google Calendar Settings से 'Secret address in iCal format' (.ics) लिंक दर्ज करें, या .ics फ़ाइल डाउनलोड करके अपलोड करें।"
        )

    def parse_ics_dt(val):
        if not val:
            return None
        clean = val.replace("Z", "")
        if "T" in clean:
            try:
                return datetime.strptime(clean[:15], "%Y%m%dT%H%M%S")
            except Exception:
                return None
        elif len(clean) >= 8:
            try:
                return datetime.strptime(clean[:8], "%Y%m%d")
            except Exception:
                return None
        return None

    def generate_rrule_dates(start_dt, rrule_str, win_start, win_end):
        parts = dict(p.split("=", 1) for p in rrule_str.split(";") if "=" in p)
        freq = parts.get("FREQ", "").upper()
        try:
            interval = max(1, int(parts.get("INTERVAL", 1)))
        except Exception:
            interval = 1
        until_dt = parse_ics_dt(parts.get("UNTIL", ""))

        byday = parts.get("BYDAY", "").split(",") if "BYDAY" in parts else []
        day_map = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}
        target_weekdays = [day_map[d[-2:]] for d in byday if d[-2:] in day_map]

        occurrences = []
        curr = start_dt

        if freq == "DAILY":
            if curr < win_start:
                days_behind = (win_start.date() - curr.date()).days
                steps = max(0, (days_behind // interval) * interval)
                curr += timedelta(days=steps)
            while curr <= win_end:
                if curr >= win_start:
                    if until_dt and curr > until_dt:
                        break
                    occurrences.append(curr)
                curr += timedelta(days=interval)

        elif freq == "WEEKLY":
            if not target_weekdays:
                target_weekdays = [curr.weekday()]
            check_date = max(start_dt.date(), win_start.date())
            while check_date <= win_end.date():
                if check_date.weekday() in target_weekdays:
                    occ = datetime.combine(check_date, curr.time())
                    if until_dt and occ > until_dt:
                        break
                    occurrences.append(occ)
                check_date += timedelta(days=1)

        elif freq == "MONTHLY":
            check_date = max(start_dt.date(), win_start.date()).replace(day=min(start_dt.day, 28))
            while check_date <= win_end.date():
                occ = datetime.combine(check_date, curr.time())
                if occ >= win_start:
                    if until_dt and occ > until_dt:
                        break
                    occurrences.append(occ)
                m = check_date.month + interval
                y = check_date.year + (m - 1) // 12
                m = ((m - 1) % 12) + 1
                try:
                    check_date = check_date.replace(year=y, month=m)
                except Exception:
                    check_date += timedelta(days=30 * interval)

        elif freq == "YEARLY":
            check_year = max(start_dt.year, win_start.year)
            while check_year <= win_end.year:
                try:
                    occ = datetime(check_year, start_dt.month, start_dt.day, curr.hour, curr.minute)
                    if win_start <= occ <= win_end:
                        if until_dt and occ > until_dt:
                            break
                        occurrences.append(occ)
                except Exception:
                    pass
                check_year += interval

        return occurrences

    # Unfold RFC 5545 wrapped lines
    unfolded_lines = []
    for line in content.splitlines():
        if (line.startswith(" ") or line.startswith("\t")) and unfolded_lines:
            unfolded_lines[-1] += line[1:]
        else:
            unfolded_lines.append(line)

    raw_events = []
    in_event = False
    curr = {}

    for line in unfolded_lines:
        if line.startswith("BEGIN:VEVENT"):
            in_event = True
            curr = {}
        elif line.startswith("END:VEVENT"):
            in_event = False
            if curr.get("summary") and curr.get("dtstart"):
                raw_events.append(curr)
        elif in_event:
            if line.startswith("SUMMARY:"):
                curr["summary"] = line[8:].strip()
            elif line.startswith("DTSTART"):
                parts = line.split(":")
                if len(parts) >= 2:
                    curr["dtstart"] = parts[-1].strip()
            elif line.startswith("DTEND"):
                parts = line.split(":")
                if len(parts) >= 2:
                    curr["dtend"] = parts[-1].strip()
            elif line.startswith("RRULE:"):
                curr["rrule"] = line[6:].strip()
            elif line.startswith("UID:"):
                curr["uid"] = line[4:].strip()
            elif line.startswith("DESCRIPTION:"):
                curr["description"] = line[12:].strip()

    # Expand occurrences for window (-30 days to +90 days)
    now_ref = datetime.now()
    window_start = now_ref - timedelta(days=30)
    window_end = now_ref + timedelta(days=90)
    events = []

    for ev in raw_events:
        try:
            summary = ev.get("summary", "")
            dtstart_str = ev.get("dtstart", "")
            dtend_str = ev.get("dtend", "")
            rrule_str = ev.get("rrule", "")
            uid = ev.get("uid") or f"ev_{len(events)}"

            start_dt = parse_ics_dt(dtstart_str)
            if not start_dt:
                continue

            time_str = "All Day"
            if "T" in dtstart_str:
                time_str = start_dt.strftime("%I:%M %p")

            if rrule_str:
                occs = generate_rrule_dates(start_dt, rrule_str, window_start, window_end)
                for idx, occ in enumerate(occs):
                    due_date = occ.strftime("%Y-%m-%dT%H:%M:%S") if "T" in dtstart_str else occ.strftime("%Y-%m-%d")
                    events.append({
                        "id": f"gcal_ical_{uid}_{due_date}",
                        "title": summary,
                        "due_date": due_date,
                        "reminder_time": time_str,
                        "priority": "medium",
                        "status": "pending",
                        "is_completed": False,
                        "is_google_calendar": True,
                        "created_at": due_date
                    })
            elif dtend_str and dtend_str != dtstart_str:
                end_dt = parse_ics_dt(dtend_str)
                if end_dt and (end_dt.date() - start_dt.date()).days > 0:
                    curr_date = start_dt.date()
                    end_date = end_dt.date()
                    while curr_date < end_date and curr_date <= window_end.date():
                        if curr_date >= window_start.date():
                            curr_dt = datetime.combine(curr_date, start_dt.time())
                            due_date = curr_dt.strftime("%Y-%m-%dT%H:%M:%S") if "T" in dtstart_str else curr_date.strftime("%Y-%m-%d")
                            events.append({
                                "id": f"gcal_ical_{uid}_{due_date}",
                                "title": summary,
                                "due_date": due_date,
                                "reminder_time": time_str,
                                "priority": "medium",
                                "status": "pending",
                                "is_completed": False,
                                "is_google_calendar": True,
                                "created_at": due_date
                            })
                        curr_date += timedelta(days=1)
                else:
                    due_date = start_dt.strftime("%Y-%m-%dT%H:%M:%S") if "T" in dtstart_str else start_dt.strftime("%Y-%m-%d")
                    events.append({
                        "id": f"gcal_ical_{uid}_{due_date}",
                        "title": summary,
                        "due_date": due_date,
                        "reminder_time": time_str,
                        "priority": "medium",
                        "status": "pending",
                        "is_completed": False,
                        "is_google_calendar": True,
                        "created_at": due_date
                    })
            else:
                due_date = start_dt.strftime("%Y-%m-%dT%H:%M:%S") if "T" in dtstart_str else start_dt.strftime("%Y-%m-%d")
                events.append({
                    "id": f"gcal_ical_{uid}_{due_date}",
                    "title": summary,
                    "due_date": due_date,
                    "reminder_time": time_str,
                    "priority": "medium",
                    "status": "pending",
                    "is_completed": False,
                    "is_google_calendar": True,
                    "created_at": due_date
                })
        except Exception as item_err:
            continue

    return {"status": "ok", "count": len(events), "events": events}

# ----------------- Finance Endpoints -----------------
@app.get("/api/finance/records")
def list_finance_records(
    limit: int = 100,
    offset: int = 0,
    response: Response = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    try:
        safe_limit, safe_offset = bounded_page(limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    rows = db.query(FinancialRecord).filter(
        tenant_filter(FinancialRecord, current_user)
    ).order_by(FinancialRecord.date.desc(), FinancialRecord.id.desc()).offset(
        safe_offset
    ).limit(safe_limit + 1).all()
    has_more = len(rows) > safe_limit
    rows = rows[:safe_limit]
    if response is not None:
        response.headers["X-Has-More"] = "true" if has_more else "false"
        response.headers["X-Next-Offset"] = str(safe_offset + len(rows))
    return rows

@app.post("/api/finance/records")
def create_finance_record(
    req: FinancialRecordCreate,
    x_mutation_id: Optional[str] = Header(None, alias="X-Client-Mutation-Id"),
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    eff_email = current_user.email

    # Idempotency cache check (AETH-REL-04)
    cached = get_cached_mutation(x_mutation_id, db)
    if cached:
        return cached
    
    rec_type = (req.type or "expense").strip().lower()
    if rec_type not in ["expense", "income"]:
        rec_type = "expense"
        
    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    due_dt = None
    if req.next_due_date:
        try:
            due_dt = datetime.fromisoformat(req.next_due_date)
        except Exception:
            due_dt = None

    rounded_amt = round_currency(req.amount) # AETH-REL-03 Banker's rounding
    new_rec = FinancialRecord(
        owner_user_id=current_user.id,
        user_email=eff_email,
        type=rec_type,
        category=(req.category or "general").strip().lower(),
        amount=rounded_amt,
        currency=req.currency or "INR",
        payment_mode=(req.payment_mode or "upi").strip().lower(),
        note=(req.note or "").strip() or None,
        is_recurring=bool(req.is_recurring),
        recurrence_interval=req.recurrence_interval,
        next_due_date=due_dt,
        date=now
    )
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)

    budget_alert = None
    if rec_type == "expense" and req.monthly_budget and req.monthly_budget > 0:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_spent = float(db.query(func.coalesce(func.sum(FinancialRecord.amount), 0.0)).filter(
            tenant_filter(FinancialRecord, current_user),
            FinancialRecord.type == "expense",
            FinancialRecord.date >= month_start
        ).scalar() or 0.0)
        pct = round((total_spent / float(req.monthly_budget)) * 100.0, 1)
        if pct >= 100.0:
            budget_alert = f"Alert: You have exhausted {pct}% of your monthly budget (₹{total_spent:,.0f} / ₹{req.monthly_budget:,.0f})"
        elif pct >= 80.0:
            budget_alert = f"Notice: You have used {pct}% of your monthly budget (₹{total_spent:,.0f} / ₹{req.monthly_budget:,.0f})"

    rec_dict = {
        "id": new_rec.id,
        "user_email": new_rec.user_email,
        "type": new_rec.type,
        "category": new_rec.category,
        "amount": new_rec.amount,
        "currency": new_rec.currency,
        "payment_mode": new_rec.payment_mode,
        "note": new_rec.note,
        "is_recurring": new_rec.is_recurring,
        "recurrence_interval": new_rec.recurrence_interval,
        "next_due_date": new_rec.next_due_date.isoformat() if new_rec.next_due_date else None,
        "date": new_rec.date.isoformat() if new_rec.date else None
    }
    resp_data = {"status": "success", "record": rec_dict, "budget_alert": budget_alert}
    record_mutation(x_mutation_id, eff_email, "/api/finance/records", resp_data, db)
    return resp_data

@app.get("/api/finances/forecast")
def get_cash_flow_forecast(
    days: int = 30,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Calculate forecast inputs with SQL aggregates, not materialized ledger rows."""
    days = max(1, min(int(days), 365))
    now = datetime.utcnow()
    past_30d = now - timedelta(days=30)
    past_expense_total = float(db.query(func.coalesce(func.sum(FinancialRecord.amount), 0.0)).filter(
        tenant_filter(FinancialRecord, current_user), FinancialRecord.type == "expense",
        FinancialRecord.date >= past_30d
    ).scalar() or 0.0)
    past_income_total = float(db.query(func.coalesce(func.sum(FinancialRecord.amount), 0.0)).filter(
        tenant_filter(FinancialRecord, current_user), FinancialRecord.type == "income",
        FinancialRecord.date >= past_30d
    ).scalar() or 0.0)
    recurring_totals = db.query(
        FinancialRecord.type, func.coalesce(func.sum(FinancialRecord.amount), 0.0)
    ).filter(
        tenant_filter(FinancialRecord, current_user), FinancialRecord.is_recurring == True
    ).group_by(FinancialRecord.type).all()
    recurring_monthly_income = 0.0
    recurring_monthly_expense = 0.0
    for record_type, amount in recurring_totals:
        if record_type == "income":
            recurring_monthly_income = float(amount or 0.0)
        elif record_type == "expense":
            recurring_monthly_expense = float(amount or 0.0)

    avg_daily_spend = round_currency(past_expense_total / 30.0)
    projected_discretionary = round_currency(avg_daily_spend * days)
    projected_total_outflow = round_currency(recurring_monthly_expense + projected_discretionary)
    projected_net_cashflow = round_currency(recurring_monthly_income - projected_total_outflow)
    return {
        "status": "success", "forecast_days": days,
        "average_daily_spend": avg_daily_spend,
        "past_30d_income": round_currency(past_income_total),
        "past_30d_expense": round_currency(past_expense_total),
        "recurring_monthly_income": round_currency(recurring_monthly_income),
        "recurring_monthly_expense": round_currency(recurring_monthly_expense),
        "projected_total_outflow": projected_total_outflow,
        "projected_net_cashflow": projected_net_cashflow,
        "runway_health": "positive" if projected_net_cashflow >= 0 else "burn_rate_warning"
    }

@app.post("/api/finance/records/bulk")
def create_finance_records_bulk(
    req: FinancialRecordBulkCreate,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    eff_email = current_user.email
    
    if not req.records or len(req.records) == 0:
        raise HTTPException(status_code=400, detail="No records provided")

    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    created = []
    for item in req.records:
        rec_type = (item.type or "expense").strip().lower()
        if rec_type not in ["expense", "income"]:
            rec_type = "expense"
        try:
            amt = abs(float(item.amount))
        except (ValueError, TypeError):
            continue
        if amt <= 0:
            continue
        new_rec = FinancialRecord(
            owner_user_id=current_user.id,
            user_email=eff_email,
            type=rec_type,
            category=(item.category or "general").strip().lower(),
            amount=amt,
            currency=item.currency or "INR",
            payment_mode=(item.payment_mode or "upi").strip().lower(),
            note=(item.note or "").strip() or None,
            date=now
        )
        db.add(new_rec)
        created.append(new_rec)
    
    if not created:
        raise HTTPException(status_code=400, detail="No valid amounts provided")

    db.commit()
    for rec in created:
        db.refresh(rec)
    return {
        "status": "success",
        "count": len(created),
        "total_amount": sum(r.amount for r in created),
        "records": [r.id for r in created]
    }

@app.get("/api/finance/summary")
def get_finance_summary(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Calculate lifetime totals in PostgreSQL without loading the ledger into RAM."""
    totals = db.query(
        FinancialRecord.type,
        func.coalesce(func.sum(FinancialRecord.amount), 0.0)
    ).filter(tenant_filter(FinancialRecord, current_user)).group_by(FinancialRecord.type).all()
    total_income = 0.0
    total_expense = 0.0
    for record_type, amount in totals:
        if (record_type or "").lower() == "income":
            total_income = float(amount or 0.0)
        elif (record_type or "").lower() == "expense":
            total_expense = float(amount or 0.0)
    record_count = db.query(func.count(FinancialRecord.id)).filter(
        tenant_filter(FinancialRecord, current_user)
    ).scalar() or 0
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "record_count": int(record_count)
    }

@app.get("/api/finance/export-csv")
def export_finance_csv(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Stream CSV rows from PostgreSQL in bounded batches instead of buffering the ledger."""
    query = db.query(FinancialRecord).filter(tenant_filter(FinancialRecord, current_user))
    if year is not None and month is not None:
        if month < 0 or month > 11:
            raise HTTPException(status_code=400, detail="month must be between 0 and 11")
        start = datetime(year, month + 1, 1)
        end = datetime(year + 1, 1, 1) if month == 11 else datetime(year, month + 2, 1)
        query = query.filter(FinancialRecord.date >= start, FinancialRecord.date < end)
    elif year is not None:
        query = query.filter(
            FinancialRecord.date >= datetime(year, 1, 1),
            FinancialRecord.date < datetime(year + 1, 1, 1)
        )

    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    m_name = month_names[month] if (month is not None and 0 <= month < 12) else "All"
    y_name = str(year) if year is not None else ""
    filename = f"aether_finance_{m_name}_{y_name}.csv" if y_name else f"aether_finance_{m_name}.csv"

    def csv_stream():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Record ID", "Date", "Type", "Category", "Amount (INR)", "Payment Mode", "Notes"])
        yield "\ufeff" + output.getvalue()
        output.seek(0)
        output.truncate(0)
        for record in query.order_by(FinancialRecord.date.desc(), FinancialRecord.id.desc()).yield_per(500):
            date_text = record.date.strftime("%d/%m/%Y") if hasattr(record.date, "strftime") else str(record.date or "")
            writer.writerow([
                record.id, date_text, record.type or "expense", record.category or "general",
                record.amount or 0, record.payment_mode or "upi", record.note or ""
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        csv_stream(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@app.delete("/api/finance/records/{record_id}")
def delete_finance_record(
    record_id: int,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    rec = db.query(FinancialRecord).filter(FinancialRecord.id == record_id, tenant_filter(FinancialRecord, current_user)).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Financial record not found")
    db.delete(rec)
    db.commit()
    return {"status": "success", "deleted_id": record_id}

@app.put("/api/finance/records/{record_id}")
def update_finance_record(
    record_id: int,
    req: FinancialRecordUpdate,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    rec = db.query(FinancialRecord).filter(FinancialRecord.id == record_id, tenant_filter(FinancialRecord, current_user)).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Financial record not found")
    rec.owner_user_id = current_user.id
    if req.type is not None:
        rec.type = req.type
    if req.category is not None:
        rec.category = req.category
    if req.amount is not None:
        rec.amount = req.amount
    if req.note is not None:
        rec.note = req.note
    if req.payment_mode is not None:
        rec.payment_mode = req.payment_mode
    db.commit()
    return {"status": "success", "updated_record": rec}

@app.post("/api/finance/parse-sms")
async def parse_and_log_bank_sms(
    req: ParseSmsRequest,
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Parses Bank SMS alerts (single or bulk batch), extracts exact transaction details with date/time, and commits to financial records."""
    try:
        from ai_engine import parse_bank_sms
    except ImportError:
        from .ai_engine import parse_bank_sms

    raw_list = req.sms_list or ([req.sms_text] if req.sms_text else [])
    eff_email = (req.user_email or user_email or "").strip().lower() or None
    created_records = []

    for text in raw_list:
        if not text or not text.strip():
            continue
        p = parse_bank_sms(text.strip())
        if p and p.get("amount", 0) > 0:
            merchant_name = p.get("merchant") or "Store"
            if req.custom_note and req.custom_note.strip():
                final_note = f"{req.custom_note.strip()} ({merchant_name})"
            else:
                final_note = f"{merchant_name} (SMS Auto-Log)"

            rec = FinancialRecord(
                user_email=eff_email,
                type=p["type"],
                category=p["category"],
                amount=p["amount"],
                currency="INR",
                payment_mode=p["payment_mode"],
                note=final_note,
                date=p["date"]
            )
            if req.auto_commit:
                db.add(rec)
                created_records.append(rec)

    if req.auto_commit and created_records:
        db.commit()
        for r in created_records:
            db.refresh(r)

    return {
        "status": "success",
        "processed_count": len(raw_list),
        "logged_count": len(created_records),
        "records": [
            {
                "id": r.id if hasattr(r, "id") else None,
                "type": r.type,
                "amount": r.amount,
                "category": r.category,
                "merchant": r.note,
                "date": r.date.isoformat() if hasattr(r, "date") else None,
                "payment_mode": r.payment_mode
            } for r in created_records
        ]
    }

@app.post("/api/email/draft-reply")
async def draft_email_reply_endpoint(
    req: EmailDraftRequest,
    user_email: Optional[str] = Depends(get_user_email)
):
    """Generates an executive, polished email reply draft for review and one-click opening in Gmail."""
    try:
        from ai_engine import generate_email_draft
    except ImportError:
        from .ai_engine import generate_email_draft

    res = await generate_email_draft(
        sender=req.sender,
        subject=req.subject,
        body=req.body,
        instructions=req.instructions or "",
        operator_name=req.user_name or "Pawan Dixit",
        language=req.language or "en"
    )
    import urllib.parse
    mailto_url = f"mailto:{res['recipient']}?subject={urllib.parse.quote(res['subject'])}&body={urllib.parse.quote(res['body'])}"
    res["mailto_url"] = mailto_url
    return {
        "status": "success",
        "draft": res
    }
    db.refresh(rec)
    return {"status": "success", "record": {
        "id": rec.id,
        "type": rec.type,
        "category": rec.category,
        "amount": rec.amount,
        "note": rec.note,
        "payment_mode": rec.payment_mode,
        "date": rec.date.isoformat() if rec.date else None
    }}

# ----------------- Memory Vault Endpoints -----------------
@app.get("/api/memory")
def list_memory(
    limit: int = 50,
    offset: int = 0,
    response: Response = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Return a bounded page of the current user's memories (newest first).

    The response remains a list for backward compatibility. Clients can request
    older pages with offset; limit is capped to prevent unbounded database reads.
    """
    try:
        safe_limit, safe_offset = bounded_page(limit, offset)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    rows = (
        db.query(MemoryItem)
        .filter(tenant_filter(MemoryItem, current_user))
        .order_by(MemoryItem.created_at.desc(), MemoryItem.id.desc())
        .offset(safe_offset).limit(safe_limit + 1).all()
    )
    has_more = len(rows) > safe_limit
    rows = rows[:safe_limit]
    if response is not None:
        response.headers["X-Has-More"] = "true" if has_more else "false"
        response.headers["X-Next-Offset"] = str(safe_offset + len(rows))
    return rows

@app.post("/api/memory")
def create_memory(
    req: MemoryCreate,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    eff_email = current_user.email
    fact_str = (req.fact or "").strip()
    if not fact_str:
        raise HTTPException(status_code=400, detail="Empty fact")
    cat = (req.category or "contact").strip().lower()

    # Resolve one possible match in SQL instead of loading every memory in this category.
    first_token = fact_str.split()[0].lower() if fact_str else ""
    matched = (
        db.query(MemoryItem)
        .filter(
            tenant_filter(MemoryItem, current_user),
            MemoryItem.category == cat,
            MemoryItem.fact.ilike(f"%{first_token}%")
        )
        .order_by(MemoryItem.updated_at.desc(), MemoryItem.id.desc())
        .first()
    )
    from memory.hybrid_provider import get_embedding
    emb = get_embedding(fact_str)
    emb_json = json.dumps(emb) if emb else None

    if matched:
        matched.fact = fact_str
        matched.owner_user_id = current_user.id
        matched.user_email = eff_email
        matched.embedding = emb_json
        matched.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(matched)
        return {"id": matched.id, "fact": matched.fact, "category": matched.category, "updated": True}

    item = MemoryItem(owner_user_id=current_user.id, user_email=eff_email, category=cat, fact=fact_str, confidence=1.0, embedding=emb_json)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "fact": item.fact, "category": item.category, "created": True}

class BulkContactsSyncRequest(BaseModel):
    contacts: List[Dict[str, Any]] = Field(..., max_length=200)
    user_email: Optional[str] = None

@app.post("/api/memory/bulk-contacts")
@app.post("/memory/bulk-contacts")
def sync_bulk_contacts(
    req: BulkContactsSyncRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    eff_email = current_user.email
    from memory.hybrid_provider import get_embedding

    contacts_list = req.contacts or []
    if not contacts_list:
        return {"status": "ok", "synced_count": 0, "message": "No contacts provided"}

    synced = 0
    skipped = 0
    failed = 0
    failure_samples = []
    for batch_start in range(0, len(contacts_list), WRITE_BATCH_SIZE):
        batch = contacts_list[batch_start:batch_start + WRITE_BATCH_SIZE]
        for local_index, contact in enumerate(batch):
            try:
                name = str(contact.get("name") or "").strip()
                phone = str(contact.get("phone") or contact.get("phoneNumber") or "").strip()
                if not name or not phone:
                    skipped += 1
                    continue
                clean_phone = re.sub(r'[^\d+]', '', phone)
                if len(clean_phone) < 5:
                    skipped += 1
                    continue

                fact_str = f"Contact: {name} - Phone: {clean_phone}"
                if contact.get("email"):
                    fact_str += f" - Email: {str(contact.get('email')).strip()}"

                scoped = db.query(MemoryItem).filter(
                    tenant_filter(MemoryItem, current_user),
                    MemoryItem.category == "contact"
                )
                exact = scoped.filter(func.lower(MemoryItem.fact) == fact_str.lower()).first()
                if exact:
                    skipped += 1
                    continue

                safe_name = name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                matched = scoped.filter(
                    MemoryItem.fact.ilike(f"Contact: {safe_name} - Phone:%", escape="\\")
                ).order_by(MemoryItem.updated_at.desc(), MemoryItem.id.desc()).first()

                emb = get_embedding(fact_str)
                emb_json = json.dumps(emb) if emb else None
                if matched:
                    matched.fact = fact_str
                    matched.embedding = emb_json
                    matched.updated_at = datetime.utcnow()
                else:
                    db.add(MemoryItem(
                        owner_user_id=current_user.id, user_email=eff_email,
                        category="contact", fact=fact_str, confidence=1.0,
                        embedding=emb_json
                    ))
                synced += 1
            except Exception as exc:
                failed += 1
                if len(failure_samples) < 25:
                    failure_samples.append({"index": batch_start + local_index, "error": str(exc)[:240]})
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            failed += len(batch)
            synced = max(0, synced - len(batch))
            if len(failure_samples) < 25:
                failure_samples.append({"batch_start": batch_start, "error": str(exc)[:240]})

    return {
        "status": "ok", "synced_count": synced, "skipped_count": skipped,
        "failed_count": failed, "failure_samples": failure_samples,
        "total_contacts": len(contacts_list),
        "message": f"Processed {len(contacts_list)} contacts in bounded batches."
    }

@app.put("/api/memory/{item_id}")
def update_memory(
    item_id: int,
    req: MemoryCreate,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    query = db.query(MemoryItem).filter(MemoryItem.id == item_id, tenant_filter(MemoryItem, current_user))
    item = query.first()
    if not item:
        raise HTTPException(status_code=404, detail="Memory item not found")
    item.owner_user_id = current_user.id
    fact_str = (req.fact or "").strip()
    if not fact_str:
        raise HTTPException(status_code=400, detail="Empty fact")
    item.fact = fact_str
    if req.category:
        item.category = req.category.strip().lower()
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return {"id": item.id, "fact": item.fact, "category": item.category, "updated": True}

@app.delete("/api/memory/{item_id}")
def delete_memory(
    item_id: int, 
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    query = db.query(MemoryItem).filter(MemoryItem.id == item_id, tenant_filter(MemoryItem, current_user))
    item = query.first()
    if not item:
        raise HTTPException(status_code=404, detail="Memory item not found")
    db.delete(item)
    db.commit()
    return {"message": "Memory deleted successfully"}

# ----------------- Executive Briefing -----------------
# FIX: Briefing response को 5 min cache करो — weather API 429 rate-limit से बचाव
import time as _briefing_time

_BRIEFING_CACHE: dict = {}
_BRIEFING_CACHE_TTL = 5 * 60  # 5 minutes

@app.get("/api/briefing")
def get_executive_briefing(
    user_name: Optional[str] = "Operator",
    lat: Optional[str] = None,
    lon: Optional[str] = None,
    city: Optional[str] = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    global _BRIEFING_CACHE
    parsed_lat = None
    if lat is not None and str(lat).strip():
        try:
            parsed_lat = float(lat)
        except (ValueError, TypeError):
            parsed_lat = None

    parsed_lon = None
    if lon is not None and str(lon).strip():
        try:
            parsed_lon = float(lon)
        except (ValueError, TypeError):
            parsed_lon = None

    loc_key = f"{round(parsed_lat, 2) if parsed_lat else ''}_{round(parsed_lon, 2) if parsed_lon else ''}_{(city or '').strip().lower()}"
    _cache_key = f"{current_user.id}_{loc_key}"
    _cached = _BRIEFING_CACHE.get(_cache_key)
    if _cached and (_briefing_time.time() - _cached["ts"] < _BRIEFING_CACHE_TTL):
        return _cached["data"]

    eff_email = current_user.email
    pending_tasks_count = db.query(func.count(Task.id)).filter(
        tenant_filter(Task, current_user), Task.status == "pending"
    ).scalar() or 0
    memories = db.query(MemoryItem).filter(tenant_filter(MemoryItem, current_user)).order_by(
        MemoryItem.importance.desc(), MemoryItem.created_at.desc()
    ).limit(5).all()
    urgent_tasks = db.query(Task).filter(
        tenant_filter(Task, current_user), Task.status == "pending",
        Task.priority.in_(["high", "urgent"])
    ).order_by(Task.due_date.asc().nullslast(), Task.id.desc()).limit(10).all()
    finance = get_finance_summary(current_user=current_user, db=db)

    now = datetime.now()
    hour = now.hour
    if 5 <= hour < 12:
        greeting = "सुप्रभात"
        time_phase = "morning"
        weather_icon = "sunrise"
    elif 12 <= hour < 17:
        greeting = "शुभ दोपहर"
        time_phase = "afternoon"
        weather_icon = "sun"
    elif 17 <= hour < 20:
        greeting = "शुभ संध्या"
        time_phase = "evening"
        weather_icon = "sunset"
    else:
        greeting = "शुभ रात्रि"
        time_phase = "night"
        weather_icon = "moon"

    try:
        from ai_engine import get_live_weather_data, get_city_travel_guide
    except ImportError:
        from .ai_engine import get_live_weather_data, get_city_travel_guide
    live_w = get_live_weather_data(lat=parsed_lat, lon=parsed_lon, city_name=city)
    city_guide = get_city_travel_guide(city_name=city or live_w.get("city"), lat=parsed_lat, lon=parsed_lon)

    effective_city = (city or "").strip() or live_w.get("city") or "Jaipur"
    weather = {
        "temp": live_w.get("temp", 31.4),
        "condition_en": live_w.get("condition_en", "Mostly Sunny"),
        "condition_hi": live_w.get("condition_hi", "धूप खिली हुई"),
        "city": effective_city,
        "city_en": effective_city,
        "city_hi": live_w.get("city_hi") or effective_city,
        "city_hinglish": effective_city,
        "time_phase": time_phase,
        "icon": weather_icon,
        "humidity": live_w.get("humidity", "36%"),
        "wind": live_w.get("wind", "4.2 km/h")
    }

    display_name = user_name or "साथी"
    if display_name == "Operator":
        if is_owner_email(eff_email):
            display_name = "पवन"
        elif user_email:
            display_name = user_email.split('@')[0].capitalize()
        else:
            display_name = "साथी"

    response_data = {
        "greeting": f"{greeting}, {display_name}!",
        "date_str": now.strftime("%d %b").upper(),
        "pending_tasks_count": int(pending_tasks_count),
        "upcoming_count": int(pending_tasks_count),
        "alert_count": len(urgent_tasks),
        "urgent_tasks": [{"id": t.id, "title": t.title, "priority": t.priority} for t in urgent_tasks],
        "financial_snapshot": finance,
        "active_rules_count": len(memories),
        "weather": weather,
        "city_guide": city_guide,
        "generated_at": now.isoformat()
    }
    # Cache save — अगले 5 min rapid calls इसी से serve होंगी (Memory capped for 512MB RAM)
    if len(_BRIEFING_CACHE) > 12:
        now_ts = _briefing_time.time()
        _BRIEFING_CACHE = {k: v for k, v in _BRIEFING_CACHE.items() if (now_ts - v.get("ts", 0) < _BRIEFING_CACHE_TTL)}
        if len(_BRIEFING_CACHE) > 12:
            _BRIEFING_CACHE.clear()
    _BRIEFING_CACHE[_cache_key] = {"data": response_data, "ts": _briefing_time.time()}
    return response_data

# ----------------- Dynamic City Explorer Guide Endpoint -----------------
@app.get("/api/location/city-guide")
def get_location_city_guide(
    city: Optional[str] = None,
    lat: Optional[str] = None,
    lon: Optional[str] = None
):
    """Retrieve curated places to visit, famous food, and activities for any city."""
    try:
        from ai_engine import get_city_travel_guide
    except ImportError:
        from .ai_engine import get_city_travel_guide
    parsed_lat = None
    if lat is not None and str(lat).strip():
        try:
            parsed_lat = float(lat)
        except (ValueError, TypeError):
            parsed_lat = None
    parsed_lon = None
    if lon is not None and str(lon).strip():
        try:
            parsed_lon = float(lon)
        except (ValueError, TypeError):
            parsed_lon = None
    return get_city_travel_guide(city_name=city, lat=parsed_lat, lon=parsed_lon)

# ----------------- 2-Minute Executive Audio Briefing -----------------
@app.get("/api/briefing/executive")
def get_executive_audio_briefing(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Generates an articulate, crisp 90-second executive audio briefing (AETH-P0-02)."""
    eff_email = current_user.email
    now = datetime.now()
    today_date = now.date()
    
    # 1. Weather
    try:
        from ai_engine import get_live_weather_data
    except ImportError:
        from .ai_engine import get_live_weather_data
    live_w = get_live_weather_data()
    temp = live_w.get("temp", 31)
    cond = live_w.get("condition_hi", "साफ मौसम")
    city = live_w.get("city_hi", "Jaipur")
    
    # 2. Today's pending tasks & reminders
    auto_advance_recurring_tasks(db, owner_user_id=current_user.id)
    task_query = db.query(Task).filter(tenant_filter(Task, current_user), Task.status == "pending", (Task.parent_id == None) | (Task.parent_id == 0))
    
    all_pending = task_query.order_by(Task.due_date.asc().nullslast(), Task.id.desc()).limit(100).all()
    today_tasks = []
    for t in all_pending:
        t_due = t.due_date.date() if t.due_date else None
        if t_due == today_date or t.recurrence == "daily" or (t.recurrence == "weekdays" and today_date.weekday() < 5) or not t.due_date:
            time_part = f" at {t.reminder_time}" if t.reminder_time else ""
            today_tasks.append(f"{t.title}{time_part}")

    task_count = len(today_tasks)
    sample_tasks = ", ".join(today_tasks[:3]) if today_tasks else "कोई विशेष टास्क पेंडिंग नहीं है"
    
    hour = now.hour
    greeting_word = "सुप्रभात" if 5 <= hour < 12 else ("शुभ दोपहर" if 12 <= hour < 17 else "शुभ संध्या")
    
    briefing_text = (
        f"{greeting_word} पवन! Aether एग्जीक्यूटिव ब्रीफिंग में आपका स्वागत है। "
        f"आज {city} में {temp}°C तापमान के साथ {cond} बना हुआ है। "
        f"आज आपके एजेंडा में {task_count} कार्य हैं, जिनमें मुख्य रूप से: {sample_tasks} शामिल हैं। "
        f"दिन की शानदार शुरुआत करें, Aether आपके सभी कार्यों के समन्वय के लिए तत्पर है!"
    )
    
    return {
        "status": "success",
        "greeting": greeting_word,
        "date": today_date.isoformat(),
        "task_count": task_count,
        "text": briefing_text
    }

# ─── Executive Briefing Preferences Subsystem (AETH-BRIEF-01) ─────────────
class BriefingPreferenceRequest(BaseModel):
    modules: Optional[List[str]] = None
    delivery_time_morning: Optional[str] = "08:00"
    delivery_time_evening: Optional[str] = "20:00"
    channel_in_app: Optional[bool] = True
    channel_whatsapp: Optional[bool] = False
    channel_tts: Optional[bool] = True

@app.get("/api/briefing/preferences")
def get_briefing_preferences(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Retrieves the user's customized briefing module and delivery preferences (AETH-BRIEF-01)."""
    defaults = {
        "modules": ["tasks", "finances", "weather", "news", "cricket"],
        "delivery_time_morning": "08:00",
        "delivery_time_evening": "20:00",
        "channel_in_app": True,
        "channel_whatsapp": False,
        "channel_tts": True
    }
    pref = db.query(BriefingPreference).filter(tenant_filter(BriefingPreference, current_user)).first()
    if not pref:
        return defaults
    return {
        "modules": json.loads(pref.modules or '["tasks","finances","weather","news","cricket"]'),
        "delivery_time_morning": pref.delivery_time_morning or "08:00",
        "delivery_time_evening": pref.delivery_time_evening or "20:00",
        "channel_in_app": pref.channel_in_app if pref.channel_in_app is not None else True,
        "channel_whatsapp": pref.channel_whatsapp if pref.channel_whatsapp is not None else False,
        "channel_tts": pref.channel_tts if pref.channel_tts is not None else True
    }

@app.post("/api/briefing/preferences")
def update_briefing_preferences(
    req: BriefingPreferenceRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Updates customized briefing modules, schedule, and multi-modal delivery channels (AETH-BRIEF-01)."""
    eff_email = current_user.email
    pref = db.query(BriefingPreference).filter(tenant_filter(BriefingPreference, current_user)).first()
    if not pref:
        pref = BriefingPreference(owner_user_id=current_user.id, user_email=eff_email)
        db.add(pref)
    else:
        pref.owner_user_id = current_user.id
        db.add(pref)
    
    if req.modules is not None:
        pref.modules = json.dumps(req.modules)
    if req.delivery_time_morning:
        pref.delivery_time_morning = req.delivery_time_morning
    if req.delivery_time_evening:
        pref.delivery_time_evening = req.delivery_time_evening
    if req.channel_in_app is not None:
        pref.channel_in_app = req.channel_in_app
    if req.channel_whatsapp is not None:
        pref.channel_whatsapp = req.channel_whatsapp
    if req.channel_tts is not None:
        pref.channel_tts = req.channel_tts
    
    pref.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pref)
    return {
        "status": "success",
        "preferences": {
            "modules": json.loads(pref.modules),
            "delivery_time_morning": pref.delivery_time_morning,
            "delivery_time_evening": pref.delivery_time_evening,
            "channel_in_app": pref.channel_in_app,
            "channel_whatsapp": pref.channel_whatsapp,
            "channel_tts": pref.channel_tts
        }
    }

# ----------------- Audit Logs & Undo -----------------
@app.get("/api/audit-logs")
def list_audit_logs(
    limit: int = 60, 
    date: Optional[str] = None,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).filter(tenant_filter(AuditLog, current_user))
    safe_limit = max(1, min(int(limit), 100))
    if date and date.strip():
        try:
            target_date = datetime.strptime(date.strip(), "%Y-%m-%d").date()
            start_dt = datetime.combine(target_date - timedelta(days=1), datetime.min.time())
            end_dt = datetime.combine(target_date + timedelta(days=1), datetime.max.time())
            query = query.filter(AuditLog.executed_at >= start_dt, AuditLog.executed_at <= end_dt)
        except Exception as exc:
            print(f"[Audit Log Date Filter Error] {exc}")
    logs = query.order_by(AuditLog.executed_at.desc(), AuditLog.id.desc()).limit(safe_limit).all()

    # Always ensure executed_at string carries ISO 8601 UTC indicator 'Z' so browser parses in local time
    results = []
    for log in logs:
        iso_str = None
        if log.executed_at:
            s = log.executed_at.isoformat()
            iso_str = s if s.endswith("Z") else f"{s}Z"
        results.append({
            "id": log.id,
            "user_email": log.user_email,
            "action_type": log.action_type,
            "details": log.details,
            "confidence_score": log.confidence_score,
            "executed_at": iso_str,
            "undo_payload": log.undo_payload,
            "is_undone": log.is_undone
        })
    return results

@app.post("/api/audit-logs/{log_id}/undo")
def undo_action(
    log_id: int,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """
    Transactional audit log rollback with strict ownership verification (AETH-SEC-05).
    Reverses mutating action within an atomic database transaction.
    """
    log = db.query(AuditLog).filter(AuditLog.id == log_id, tenant_filter(AuditLog, current_user)).first()
    if not log or not log.undo_payload:
        raise HTTPException(status_code=404, detail="Audit log entry or undo payload not found")
    
    if log.is_undone:
        return {"status": "already_undone", "message": "Action has already been reversed"}

    try:
        payload = json.loads(log.undo_payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Corrupted undo payload in audit log")

    table = payload.get("table")
    record_id = payload.get("id")
    record_ids = payload.get("ids") or ([record_id] if record_id is not None else [])

    ALLOWED_UNDO_TABLES = {"financial_records", "tasks", "memory_vault"}
    if table not in ALLOWED_UNDO_TABLES:
        raise HTTPException(status_code=400, detail=f"Table '{table}' is not supported for rollback")

    try:
        # Transactional rollback block
        with db.begin_nested():
            if table == "financial_records":
                for rid in record_ids:
                    rec = db.query(FinancialRecord).filter(
                        FinancialRecord.id == rid,
                        tenant_filter(FinancialRecord, current_user)
                    ).first()
                    if rec:
                        db.delete(rec)
            elif table == "tasks":
                for rid in record_ids:
                    rec = db.query(Task).filter(
                        Task.id == rid,
                        tenant_filter(Task, current_user)
                    ).first()
                    if rec:
                        db.delete(rec)
            elif table == "memory_vault":
                for rid in record_ids:
                    rec = db.query(MemoryItem).filter(
                        MemoryItem.id == rid,
                        tenant_filter(MemoryItem, current_user)
                    ).first()
                    if rec:
                        db.delete(rec)

            log.is_undone = True
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Undo Transaction Error] {e}")
        raise HTTPException(status_code=500, detail=f"Transactional rollback failed: {str(e)}")

    return {"status": "success", "message": "Action successfully reversed (Undone)"}

# ----------------- Audio & TTS Streaming for Mobile WebViews -----------------
@app.api_route("/api/tts", methods=["GET", "HEAD"])
def text_to_speech(request: Request, text: str = "", voice: str = "zephyr", lang: str = "en"):
    """
    High-fidelity audio streaming endpoint for 100% reliable voice synthesis on mobile WebViews
    with natural Indian English (en-IN) and clear Hindi (hi) pronunciation.
    Supports both GET and HEAD requests for mobile audio players.
    """
    from fastapi.responses import Response

    headers = {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
    }

    if request.method == "HEAD":
        return Response(status_code=200, headers=headers)

    import urllib.request
    import urllib.parse
    import re

    # Strip emojis, pictographs, symbols and markdown formatting so TTS never pronounces emoji names
    emoji_regex = re.compile(
        r'[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\ufe00-\ufe0f]|\u200d',
        flags=re.UNICODE
    )
    raw_cleaned = emoji_regex.sub('', text)
    raw_cleaned = re.sub(r'[*#_`~>|]', '', raw_cleaned)
    raw_cleaned = re.sub(r'\[(.*?)\]\([^)]*\)', r'\1', raw_cleaned)
    raw_cleaned = re.sub(r'https?://\S+', '', raw_cleaned)
    clean_text = re.sub(r'\s+', ' ', raw_cleaned).strip()[:2500]
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text required")

    has_devanagari = any('\u0900' <= c <= '\u097f' for c in clean_text)
    # Always use authentic Indian English (en-IN) or Hindi (hi) as requested
    tl = "hi" if (lang.startswith("hi") or has_devanagari) else "en-IN"

    # Chunk text into ~150 char pieces on sentence/word boundaries so Google TTS tw-ob never 404s
    chunks = []
    if len(clean_text) <= 160:
        chunks = [clean_text]
    else:
        words = clean_text.split()
        current_chunk = []
        current_len = 0
        for w in words:
            if current_len + len(w) + 1 > 150 and current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = [w]
                current_len = len(w)
            else:
                current_chunk.append(w)
                current_len += len(w) + 1
        if current_chunk:
            chunks.append(" ".join(current_chunk))

    audio_bytes_list = []
    try:
        from concurrent.futures import ThreadPoolExecutor

        def fetch_tts_chunk(chunk_text: str) -> bytes:
            if not chunk_text.strip():
                return b""
            encoded_text = urllib.parse.quote(chunk_text.strip())
            tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={tl}&q={encoded_text}"
            req = urllib.request.Request(
                tts_url, 
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                return resp.read()

        valid_chunks = [c for c in chunks[:12] if c.strip()]
        if not valid_chunks:
            raise Exception("No text chunks available for TTS")

        # Parallel fetch for ultra-low latency audio synthesis (<300ms)
        with ThreadPoolExecutor(max_workers=min(len(valid_chunks), 6)) as executor:
            audio_bytes_list = list(executor.map(fetch_tts_chunk, valid_chunks))

        if not audio_bytes_list:
            raise Exception("No audio generated")

        full_audio = b"".join(audio_bytes_list)
        return Response(content=full_audio, media_type="audio/mpeg", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")

# ----------------- Health Check & Observability -----------------
@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "app": "Aether Autonomous Executive Core",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat()
    }

# ----------------- Web Push Subscription Endpoints -----------------
class PushSubscribeRequest(BaseModel):
    user_email: str
    subscription: dict  # {endpoint, keys: {p256dh, auth}}

@app.get("/api/push/vapid-public-key")
def get_vapid_public_key():
    """Client को VAPID public key दें ताकि वो push subscribe कर सके।"""
    return {"publicKey": VAPID_PUBLIC_KEY}

@app.post("/api/push/subscribe")
def subscribe_push(
    req: PushSubscribeRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Browser push subscription server पर store करें (Strict UUID User Isolation)."""
    email = current_user.email
    owner_id = current_user.id
    if not req.subscription or not req.subscription.get("endpoint"):
        raise HTTPException(status_code=400, detail="Valid subscription object required")
    
    endpoint = req.subscription.get("endpoint", "")
    try:
        keys = req.subscription.get("keys", {})
        p256dh = keys.get("p256dh", "")
        auth = keys.get("auth", "")
        existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
        if existing:
            existing.user_email = email
            existing.owner_user_id = owner_id
            existing.p256dh = p256dh
            existing.auth = auth
        else:
            new_sub = PushSubscription(
                user_email=email,
                owner_user_id=owner_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth
            )
            db.add(new_sub)
        db.commit()
    except Exception as dbe:
        print(f"[PushSubscribe DB Error] {dbe}")
    
    return {"status": "subscribed", "user": email, "owner_id": owner_id}

@app.post("/api/push/test")
def send_test_push(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Send an immediate test VAPID push notification strictly to the verified requesting user's devices (AETH-P0-02)."""
    email = current_user.email
    db_subs = db.query(PushSubscription).filter(tenant_filter(PushSubscription, current_user)).limit(50).all()
    if db_subs:
        _push_subscriptions[email] = [
            {"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}}
            for s in db_subs
        ]
        
    subs = _push_subscriptions.get(email, [])
    if not subs:
        return {"status": "error", "message": f"No registered push devices found for {email}. Please open Aether on mobile and enable notifications."}

    sent = 0
    errors = []
    for s in subs:
        ok, expired = _send_web_push(
            s, 
            "⚡ AETHER TEST ALERT 🎉", 
            "मोबाइल और क्लाउड पुश नोटिफिकेशन सक्रिय है और 100% सही काम कर रहा है!", 
            "aether-test"
        )
        if ok:
            sent += 1
        else:
            errors.append(s.get("endpoint", "")[:30])

    return {"status": "success", "sent": sent, "total": len(subs), "errors": errors}

@app.delete("/api/push/subscribe")
def unsubscribe_push(
    endpoint: str,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Push subscription हटाएं (logout पर) (AETH-P0-02)."""
    email = current_user.email
    if email in _push_subscriptions:
        _push_subscriptions[email] = [
            s for s in _push_subscriptions[email]
            if s.get("endpoint") != endpoint
        ]
    try:
        db.query(PushSubscription).filter(
            PushSubscription.endpoint == endpoint,
            tenant_filter(PushSubscription, current_user)
        ).delete()
        db.commit()
    except Exception as dbe:
        print(f"[PushUnsubscribe DB Error] {dbe}")
    return {"status": "unsubscribed"}

class PushRefreshRequest(BaseModel):
    old_endpoint: Optional[str] = None
    subscription: dict

@app.post("/api/push/refresh-subscription")
def refresh_push_subscription(req: PushRefreshRequest, db: Session = Depends(get_db)):
    """Service Worker pushsubscriptionchange event से automatically new subscription update करें।"""
    sub_data = req.subscription
    new_endpoint = sub_data.get("endpoint", "")
    old_endpoint = req.old_endpoint or ""
    
    if not new_endpoint:
        raise HTTPException(status_code=400, detail="New subscription required")
        
    keys = sub_data.get("keys", {})
    p256dh = keys.get("p256dh", "")
    auth = keys.get("auth", "")
    
    existing = None
    if old_endpoint:
        existing = db.query(PushSubscription).filter(PushSubscription.endpoint == old_endpoint).first()
    if not existing:
        existing = db.query(PushSubscription).filter(PushSubscription.endpoint == new_endpoint).first()
        
    if existing:
        email = existing.user_email
        if email in _push_subscriptions:
            _push_subscriptions[email] = [s for s in _push_subscriptions[email] if s.get("endpoint") not in (old_endpoint, new_endpoint)]
            _push_subscriptions[email].append(sub_data)
        existing.endpoint = new_endpoint
        existing.p256dh = p256dh
        existing.auth = auth
        db.commit()
        return {"status": "refreshed", "user": email}
    return {"status": "not_found"}

def _send_whatsapp_message_sync(to_number: str, message_body: str, phone_id: str, access_token: str) -> bool:
    """Synchronous WhatsApp message dispatch via Meta Cloud API for worker threads."""
    if not phone_id or not access_token:
        print("[WhatsApp] WHATSAPP_PHONE_ID or WHATSAPP_TOKEN missing.")
        return False
    url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": message_body}
    }
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(url, json=payload, headers=headers)
            print(f"[WhatsApp Sync Outgoing Response] Status: {resp.status_code}")
            return resp.status_code in (200, 201)
    except Exception as e:
        print(f"[WhatsApp Sync Outgoing Error] {e}")
        return False

def parse_reminder_time_components(reminder_str: Optional[str]):
    """Parses time string like '8:00 PM', '8 PM', '20:00' into (hours, minutes). Returns None if unparseable."""
    if not reminder_str:
        return None
    m = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', str(reminder_str), re.IGNORECASE)
    if not m:
        return None
    hrs = int(m.group(1))
    mins = int(m.group(2)) if m.group(2) else 0
    ampm = (m.group(3) or "").upper()
    if ampm == "PM" and hrs < 12:
        hrs += 12
    elif ampm == "AM" and hrs == 12:
        hrs = 0
    return hrs, mins

def is_task_due_for_notification(task, now: datetime) -> bool:
    """Accurately checks whether a task is due for push notification right now."""
    if task.status == "completed" or getattr(task, "is_completed", False):
        return False
    if getattr(task, "notified", False):
        return False

    rec = str(getattr(task, "recurrence", "") or "").lower()
    is_daily = "daily" in rec or "roz" in rec or "everyday" in rec or "daily" in str(task.title or "").lower()

    time_comp = parse_reminder_time_components(task.reminder_time)
    
    if time_comp:
        hrs, mins = time_comp
        target_today = now.replace(hour=hrs, minute=mins, second=0, microsecond=0)
        diff_seconds = (now - target_today).total_seconds()
        if is_daily:
            # For daily recurring task, only trigger within active 3-minute window (0 to 180s)
            return 0 <= diff_seconds <= 180
        else:
            if task.due_date:
                try:
                    dt = task.due_date if isinstance(task.due_date, datetime) else datetime.fromisoformat(str(task.due_date).replace(' ', 'T'))
                    target = dt.replace(hour=hrs, minute=mins, second=0, microsecond=0)
                    return 0 <= (now - target).total_seconds() <= 180
                except Exception:
                    pass
            return 0 <= diff_seconds <= 180

    # Fallback to due_date if no reminder_time
    if task.due_date:
        try:
            dt = task.due_date if isinstance(task.due_date, datetime) else datetime.fromisoformat(str(task.due_date).replace(' ', 'T'))
            return 0 <= (now - dt).total_seconds() <= 180
        except Exception:
            pass

    return False

def _run_push_check_internal(db: Session):
    """Process notification owners and tasks in bounded keyset windows."""
    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    pushed_count = 0
    errors = []
    last_owner_id = ""
    due_start = now - timedelta(seconds=180)

    while True:
        owner_rows = db.query(PushSubscription.owner_user_id).filter(
            PushSubscription.owner_user_id.isnot(None),
            PushSubscription.owner_user_id > last_owner_id
        ).distinct().order_by(PushSubscription.owner_user_id.asc()).limit(100).all()
        if not owner_rows:
            break
        owner_ids = [row[0] for row in owner_rows if row[0]]
        last_owner_id = owner_ids[-1] if owner_ids else last_owner_id

        for owner_id in owner_ids:
            try:
                due_tasks = db.query(Task).filter(
                    Task.owner_user_id == owner_id,
                    Task.status == "pending",
                    Task.notified == False,
                    Task.due_date >= due_start,
                    Task.due_date <= now
                ).order_by(Task.due_date.asc(), Task.id.asc()).limit(100).all()

                for task in due_tasks:
                    title = f"⏰ AETHER रिमाइंडर: {task.title}"
                    body = f"समय: {task.reminder_time or 'अभी'} • कार्य का समय हो गया है!"
                    task_pushed_success = False
                    found_subscription = False

                    # Stream device subscriptions; never load every device into a list.
                    subscriptions = db.query(PushSubscription).filter(
                        PushSubscription.owner_user_id == owner_id
                    ).yield_per(50)
                    for subscription in subscriptions:
                        found_subscription = True
                        sub = {
                            "endpoint": subscription.endpoint,
                            "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth}
                        }
                        success, is_expired = _send_web_push(sub, title, body, f"reminder-{task.id}")
                        if success:
                            pushed_count += 1
                            task_pushed_success = True
                        elif is_expired:
                            try:
                                db.query(PushSubscription).filter(
                                    PushSubscription.owner_user_id == owner_id,
                                    PushSubscription.endpoint == subscription.endpoint
                                ).delete(synchronize_session=False)
                                db.commit()
                            except Exception:
                                db.rollback()

                    if task_pushed_success:
                        task.notified = True
                        db.commit()
                    elif not found_subscription and len(errors) < 50:
                        errors.append(f"No push subscriptions for owner {owner_id}.")
                    elif len(errors) < 50:
                        errors.append(f"Push delivery failed for task {task.id} (owner {owner_id}).")
            except Exception as exc:
                db.rollback()
                if len(errors) < 50:
                    errors.append(f"Error for {owner_id}: {str(exc)[:100]}")
                print(f"[PushCheck Error] {owner_id}: {exc}")

    return {"status": "ok", "pushed": pushed_count, "errors": errors}

@app.on_event("startup")
async def start_reminder_background_worker():
    import asyncio
    async def reminder_loop():
        await asyncio.sleep(5)
        loop_counter = 0
        while True:
            try:
                db = SessionLocal()
                try:
                    _run_push_check_internal(db)
                finally:
                    db.close()
            except Exception as e:
                print(f"[ReminderWorker Background Error] {e}")

            loop_counter += 1
            if loop_counter >= 3:
                loop_counter = 0
                trim_memory()

            await asyncio.sleep(60)
    asyncio.create_task(reminder_loop())

@app.post("/api/reminders/push-check")
def push_check_reminders(request: Request, db: Session = Depends(get_db)):
    """
    Checks all active subscriptions and sends push notifications for due tasks.
    Also callable on-demand via GitHub Actions or manual health triggers.
    """
    result = _run_push_check_internal(db)

    # Automated Morning (08:00 AM IST) & Evening (08:30 PM IST) WhatsApp Executive Digest
    try:
        now_ist = datetime.now(DEFAULT_TZ) if DEFAULT_TZ else datetime.now()
        today_str = now_ist.strftime("%Y-%m-%d")
        wa_token = os.environ.get("WHATSAPP_TOKEN", "").strip()
        wa_phone_id = os.environ.get("WHATSAPP_PHONE_ID", "").strip()

        if wa_token and wa_phone_id:
            is_morning_window = (now_ist.hour == 8 and now_ist.minute < 35)
            is_evening_window = (now_ist.hour == 20 and now_ist.minute >= 25 and now_ist.minute <= 55)

            if is_morning_window or is_evening_window:
                digest_type = "morning" if is_morning_window else "evening"
                digest_key = f"{today_str}:{digest_type}"

                pairings = db.query(UserIntegrationPairing).filter(
                    UserIntegrationPairing.channel == "whatsapp",
                    UserIntegrationPairing.is_active == True
                ).yield_per(100)
                for p in pairings:
                    try:
                        p_phone = p.channel_user_id
                        p_owner_id = p.owner_user_id
                        already_sent = db.query(MemoryItem).filter(
                            MemoryItem.category == "whatsapp_digest_sent",
                            MemoryItem.owner_user_id == p_owner_id,
                            MemoryItem.fact == digest_key
                        ).first()

                        if not already_sent:
                            if digest_type == "morning":
                                task_count = db.query(func.count(Task.id)).filter(
                                    Task.owner_user_id == p_owner_id,
                                    Task.status == "pending",
                                    Task.parent_id == None
                                ).scalar() or 0
                                p_tasks = db.query(Task).filter(
                                    Task.owner_user_id == p_owner_id,
                                    Task.status == "pending",
                                    Task.parent_id == None
                                ).order_by(Task.due_date.asc().nullslast(), Task.id.desc()).limit(3).all()
                                top_tasks_str = ", ".join([f"'{t.title}'" for t in p_tasks]) if p_tasks else "कोई पेंडिंग कार्य नहीं"
                                digest_msg = (
                                    f"☀️ *सुप्रभात! Aether Morning Digest*\n\n"
                                    f"🎯 *आज के कार्य ({task_count})*: {top_tasks_str}\n\n"
                                    f"दिन की शानदार शुरुआत करें! कोई भी नया काम या खर्च दर्ज करने के लिए सीधे यहाँ रिप्लाई करें। 🚀"
                                )
                            else:
                                comp_count = db.query(Task).filter(Task.owner_user_id == p_owner_id, Task.status == "completed").count()
                                pend_count = db.query(Task).filter(Task.owner_user_id == p_owner_id, Task.status == "pending").count()
                                digest_msg = (
                                    f"🌙 *शुभ संध्या! Aether Day Wrap-up*\n\n"
                                    f"📊 *आज की प्रगति*:\n"
                                    f"• पूरे हुए कार्य: ✅ {comp_count}\n"
                                    f"• शेष कार्य: ⏳ {pend_count}\n\n"
                                    f"क्या शेष कार्यों को कल के लिए आगे बढ़ाना है? बस मुझे यहाँ बता दें।"
                                )

                            # Synchronous dispatch for worker thread (Issue #1 fix)
                            sent_ok = _send_whatsapp_message_sync(p_phone, digest_msg, wa_phone_id, wa_token)
                            if sent_ok:
                                db.add(MemoryItem(owner_user_id=p_owner_id, user_email=p.user_email, category="whatsapp_digest_sent", fact=digest_key))
                                db.commit()
                                print(f"[WhatsApp Digest] Successfully sent {digest_type} digest to {p_phone}")
                            else:
                                print(f"[WhatsApp Digest] Failed delivery to {p_phone}, will retry on next check.")
                    except Exception as p_err:
                        print(f"[Digest Pairing Error] {p_err}")
                    except Exception as p_err:
                        print(f"[Digest Pairing Error] {p_err}")
    except Exception as e_dig:
        print(f"[WhatsApp Digest Cron Notice] {e_dig}")
    
    return {
        "status": "ok",
        "checked_users": len(_push_subscriptions),
        "pushed_count": pushed_count,
        "errors": errors,
        "timestamp": now.isoformat()
    }

# ----------------- Telegram Executive Bot Webhook -----------------
TELEGRAM_PAIRING_OTPS: Dict[str, Dict[str, Any]] = {}

@app.post("/api/telegram/pair-request")
def request_telegram_pairing(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Generates a secure 6-digit cryptographic OTP in ChannelPairingChallenge to pair a Telegram chat (AETH-P0-05)."""
    import secrets
    otp = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    
    challenge = ChannelPairingChallenge(
        otp_hash=otp_hash,
        owner_user_id=current_user.id,
        user_email=current_user.email,
        channel="telegram",
        expires_at=time.time() + 600,
        consumed=False,
        attempts=0
    )
    db.add(challenge)
    db.commit()
    
    return {
        "status": "success",
        "pairing_code": otp,
        "expires_in_seconds": 600,
        "instruction": f"Send the 6-digit code '{otp}' to our Telegram bot to verify and link your account."
    }

# ─────────────────────────────────────────────────────────────────────────────
# AETH-P0-05: Atomic Conditional Webhook Event Claiming & Business Idempotency
# ─────────────────────────────────────────────────────────────────────────────
def claim_webhook_event(db: Session, provider: str, event_id: str, lease_seconds: int = 120) -> Tuple[bool, Optional[ProcessedWebhookEvent]]:
    """
    Atomically claims a webhook event across concurrent workers using conditional atomic SQL operations (AETH-P0-05).
    Guarantees:
    1. If the event is currently 'processed', rejects immediately.
    2. If the event is 'processing' but lease expired (> lease_seconds), atomically reclaims it.
    3. If the event is 'failed', uses a conditional atomic UPDATE to claim it ('failed' -> 'processing').
       If multiple concurrent workers race to retry, exactly ONE worker wins the update.
    4. If the event is new, performs an atomic insert with status='processing'.
       If multiple workers race to insert, unique constraint on event_id ensures only one succeeds.
    Returns:
        (claimed: bool, event_record: Optional[ProcessedWebhookEvent])
    """
    evt_str = str(event_id).strip()
    existing = db.query(ProcessedWebhookEvent).filter(
        ProcessedWebhookEvent.provider == provider,
        ProcessedWebhookEvent.event_id == evt_str
    ).first()

    now = datetime.utcnow()
    if existing:
        if existing.status == "processed":
            return False, None
        
        if existing.status == "processing":
            # Stale lease recovery: Check if previous worker crashed or lease expired (AETH-P0-05)
            age = (now - existing.created_at).total_seconds() if existing.created_at else 9999
            if age < lease_seconds:
                return False, None
            # Lease expired: atomically reclaim
            stale_threshold = now - timedelta(seconds=lease_seconds)
            claimed_stale = db.query(ProcessedWebhookEvent).filter(
                ProcessedWebhookEvent.provider == provider,
                ProcessedWebhookEvent.event_id == evt_str,
                ProcessedWebhookEvent.status == "processing",
                ProcessedWebhookEvent.created_at <= stale_threshold
            ).update({
                ProcessedWebhookEvent.status: "processing",
                ProcessedWebhookEvent.created_at: now
            }, synchronize_session=False)
            db.commit()
            if claimed_stale > 0:
                db.refresh(existing)
                return True, existing
            return False, None

        # status is 'failed': Attempt atomic conditional claim
        claimed_count = db.query(ProcessedWebhookEvent).filter(
            ProcessedWebhookEvent.provider == provider,
            ProcessedWebhookEvent.event_id == evt_str,
            ProcessedWebhookEvent.status == "failed"
        ).update({
            ProcessedWebhookEvent.status: "processing",
            ProcessedWebhookEvent.created_at: now
        }, synchronize_session=False)
        db.commit()
        if claimed_count > 0:
            db.refresh(existing)
            return True, existing
        return False, None

    # New event: atomic insert
    try:
        new_evt = ProcessedWebhookEvent(provider=provider, event_id=evt_str, status="processing")
        with db.begin_nested():
            db.add(new_evt)
            db.flush()
        db.commit()
        db.refresh(new_evt)
        return True, new_evt
    except Exception:
        db.rollback()
        return False, None

def finalize_webhook_event(db: Session, event_record: Optional[ProcessedWebhookEvent], success: bool):
    """Transitions event status to 'processed' on success, or 'failed' on unhandled error (AETH-P0-05)."""
    if not event_record:
        return
    target_status = "processed" if success else "failed"
    try:
        event_record.status = target_status
        db.commit()
    except Exception as e:
        db.rollback()
        # Fallback raw update with new transaction in case of entity session error
        try:
            db.query(ProcessedWebhookEvent).filter(
                ProcessedWebhookEvent.id == event_record.id
            ).update({ProcessedWebhookEvent.status: target_status}, synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()
            print(f"[Webhook Finalize Warning] Failed to update event {event_record.event_id} status: {e}")

def is_business_action_executed(db: Session, mutation_key: str) -> bool:
    """Checks if a business action was previously executed via ProcessedMutation (AETH-P0-05)."""
    return db.query(ProcessedMutation).filter(ProcessedMutation.mutation_id == mutation_key).first() is not None

def record_business_action_executed(db: Session, mutation_key: str, user_email: Optional[str] = None, owner_user_id: Optional[str] = None, summary: str = ""):
    """Records an executed business action in ProcessedMutation (AETH-P0-05)."""
    try:
        rec = ProcessedMutation(
            mutation_id=mutation_key,
            user_email=user_email,
            owner_user_id=owner_user_id,
            response_json=summary
        )
        db.add(rec)
        db.commit()
    except Exception:
        db.rollback()

def execute_idempotent_business_mutation(
    db: Session,
    mutation_key: str,
    create_fn,
    user_email: Optional[str] = None,
    owner_user_id: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Atomically checks if a business mutation was already executed, and if not, executes
    both the business entity creation (Task/FinancialRecord) and ProcessedMutation insertion
    inside ONE atomic database transaction (AETH-P0-05).
    Guarantees zero duplicate tasks or financial entries even if crash occurs before or after.
    Returns:
        (already_existed: bool, response_summary: str)
    """
    existing_mut = db.query(ProcessedMutation).filter(
        ProcessedMutation.mutation_id == mutation_key
    ).first()
    if existing_mut:
        return True, existing_mut.response_json or "Action already processed"

    try:
        with db.begin_nested():
            # Create business entity
            summary_msg = create_fn(db)
            # Record mutation in the EXACT SAME transaction
            mut = ProcessedMutation(
                mutation_id=mutation_key,
                user_email=user_email,
                owner_user_id=owner_user_id,
                response_json=summary_msg
            )
            db.add(mut)
            db.flush()
        db.commit()
        return False, summary_msg
    except Exception as exc:
        db.rollback()
        raise exc

@app.post("/api/telegram/webhook")
async def telegram_webhook(req: Request, db: Session = Depends(get_db)):
    """
    Receives and processes real-time Telegram messages from user to Aether.
    Enforces Telegram secret token verification and OTP-only secure pairing (AETH-P0-05).
    """
    telegram_secret = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "").strip()
    env = os.environ.get("ENVIRONMENT", "development").lower()
    is_prod = env in ["prod", "production"]

    # 1. Secret-token header verification (Fail-closed in production)
    if telegram_secret or is_prod:
        token_header = req.headers.get("X-Telegram-Bot-Api-Secret-Token", "").strip()
        if not token_header or not hmac.compare_digest(token_header, telegram_secret):
            raise HTTPException(status_code=403, detail="Invalid or missing Telegram webhook secret token")

    # Authorize bridge tables (user_integration_pairings, channel_pairing_challenges) for verified webhook
    set_webhook_service_rls_context(db, "telegram")

    webhook_evt = None
    webhook_success = True
    try:
        data = await req.json()
        # 2. Atomic Durable deduplication & state machine via DB (AETH-P0-05)
        update_id = data.get("update_id")
        if update_id is None:
            raise HTTPException(status_code=400, detail="Telegram update_id is required for replay protection")
        if update_id:
            event_key = f"tg_{update_id}"
            claimed, webhook_evt = claim_webhook_event(db, provider="telegram", event_id=event_key)
            if not claimed:
                return {"status": "ok", "message": "duplicate update ignored"}
            # AETH-P0-05 CRITICAL: claim_webhook_event() calls db.commit() internally which resets
            # transaction-local SET LOCAL settings. Re-establish webhook service RLS context after claim.
            set_webhook_service_rls_context(db, "telegram")

        message = data.get("message") or data.get("edited_message")
        if not message:
            return {"status": "ignored"}

        chat_id = message.get("chat", {}).get("id")
        text = (message.get("text") or "").strip()
        from_user = message.get("from", {})
        first_name = from_user.get("first_name", "Operator")
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

        # Check verified pairing strictly from UserIntegrationPairing (AETH-P0-05)
        pairing = db.query(UserIntegrationPairing).filter(
            UserIntegrationPairing.channel == "telegram",
            UserIntegrationPairing.channel_user_id == str(chat_id),
            UserIntegrationPairing.is_active == True
        ).first()
        user_email = pairing.user_email if pairing else None
        owner_id = pairing.owner_user_id if pairing else None
        if owner_id:
            set_db_rls_context(db, owner_id)
        else:
            set_db_rls_context(db, None)
        if owner_id:
            set_db_rls_context(db, owner_id)
        else:
            set_db_rls_context(db, None)

        # 3. Atomic OTP-Only Pairing Handler via DB ChannelPairingChallenge (AETH-P0-05)
        clean_code = re.sub(r'[^0-9]', '', text)
        if len(clean_code) == 6:
            code_hash = hashlib.sha256(clean_code.encode()).hexdigest()
            now_ts = time.time()
            
            # Scoped rate limiting: Check if this specific sender is locked out (AETH-P0-05)
            rate_rec = db.query(SenderPairingRateLimit).filter(
                SenderPairingRateLimit.channel == "telegram",
                SenderPairingRateLimit.sender == str(chat_id)
            ).first()
            if rate_rec and rate_rec.locked_until > now_ts:
                rem = int((rate_rec.locked_until - now_ts) / 60) + 1
                lock_msg = f"⚠️ बहुत अधिक असफल प्रयास। यह प्रेषक {rem} मिनट के लिए लॉक है।"
                if bot_token:
                    async with httpx.AsyncClient() as client:
                        await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                            "chat_id": chat_id, "text": lock_msg
                        })
                return {"status": "rate_limited"}

            # Atomic conditional consumption enforcing max 5 attempts on the specific challenge
            rows_updated = db.query(ChannelPairingChallenge).filter(
                ChannelPairingChallenge.otp_hash == code_hash,
                ChannelPairingChallenge.channel == "telegram",
                ChannelPairingChallenge.consumed == False,
                ChannelPairingChallenge.expires_at >= now_ts,
                ChannelPairingChallenge.attempts < 5
            ).update({
                ChannelPairingChallenge.consumed: True,
                ChannelPairingChallenge.attempts: ChannelPairingChallenge.attempts + 1
            }, synchronize_session=False)
            db.commit()

            if rows_updated > 0:
                check_and_record_otp_attempt(db, "telegram", str(chat_id), is_correct=True)
                challenge = db.query(ChannelPairingChallenge).filter(
                    ChannelPairingChallenge.otp_hash == code_hash,
                    ChannelPairingChallenge.channel == "telegram"
                ).first()
                target_email = challenge.user_email
                target_owner = challenge.owner_user_id
                set_db_rls_context(db, target_owner)
                set_db_rls_context(db, target_owner)
                if pairing:
                    pairing.owner_user_id = target_owner
                    pairing.user_email = target_email
                    pairing.is_active = True
                    pairing.updated_at = datetime.utcnow()
                else:
                    pairing = UserIntegrationPairing(
                        owner_user_id=target_owner,
                        user_email=target_email,
                        channel="telegram",
                        channel_user_id=str(chat_id),
                        is_active=True
                    )
                    db.add(pairing)
                db.commit()

                welcome_reply = (
                    f"⚡ *Aether Connected!*\n\n"
                    f"नमस्ते {first_name}! आपका Telegram अकाउंट सफलतापूर्वक `{target_email}` से लिंक हो गया है।\n\n"
                    f"अब आप यहाँ बोलकर या लिखकर टास्क, खर्च और सवाल पूछ सकते हैं! 🚀"
                )
                if bot_token:
                    async with httpx.AsyncClient() as client:
                        await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                            "chat_id": chat_id,
                            "text": welcome_reply,
                            "parse_mode": "Markdown"
                        })
                return {"status": "paired"}
            else:
                # Increment failed attempts ONLY for this specific sender, never exhausting other users' challenges (AETH-P0-05)
                _, fail_msg = check_and_record_otp_attempt(db, "telegram", str(chat_id), is_correct=False)
                if bot_token:
                    async with httpx.AsyncClient() as client:
                        await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                            "chat_id": chat_id,
                            "text": fail_msg
                        })
                return {"status": "invalid_code"}

        # If user tries old insecure /login command, reject and guide to app OTP
        if text.startswith("/start") or text.startswith("/login"):
            guide_reply = (
                f"⚡ *Aether Executive Telegram Bot*\n\n"
                f"नमस्ते {first_name}! सुरक्षा कारणों से सीधा ईमेल लिंक बंद कर दिया गया है।\n\n"
                f"कृपया Aether ऐप में जाएँ, 'Pair Telegram' पर क्लिक करके 6-अंकों का सुरक्षित पेयरिंग कोड प्राप्त करें और उसे यहाँ भेजें।"
            )
            if bot_token:
                async with httpx.AsyncClient() as client:
                    await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": guide_reply,
                        "parse_mode": "Markdown"
                    })
            return {"status": "guide_sent"}

        if not user_email:
            if bot_token:
                async with httpx.AsyncClient() as client:
                    await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": "⚠️ *खाता लिंक नहीं है*\n\nकृपया Aether ऐप से 6-अंकों का पेयरिंग कोड जनरेट करके यहाँ भेजें।",
                        "parse_mode": "Markdown"
                    })
            return {"status": "unpaired"}

        # Process message through Aether AI engine
        context = build_context(db, user_email=user_email)
        try:
            from ai_engine import parse_intent_with_llm
        except ImportError:
            from .ai_engine import parse_intent_with_llm
            
        parsed = await parse_intent_with_llm(
            text,
            context=context,
            user_name=first_name,
            language="hi",
            user_email=user_email
        )
        action = parsed.get("action", "query")
        data_inner = parsed.get("data", {})
        
        mut_key = f"webhook_telegram_{update_id}" if update_id else None
        reply_text = ""
        if action == "task":
            if mut_key:
                def _create_task(session):
                    t = Task(
                        user_email=user_email,
                        owner_user_id=owner_id,
                        title=data_inner.get("title", text),
                        priority=data_inner.get("priority", "medium"),
                        reminder_time=data_inner.get("reminder_time"),
                        status="pending"
                    )
                    session.add(t)
                    session.flush()
                    subs = data_inner.get("subtasks")
                    if subs and isinstance(subs, list):
                        for st in subs:
                            if str(st).strip():
                                session.add(Task(user_email=user_email, owner_user_id=owner_id, title=str(st).strip(), parent_id=t.id, status="pending"))
                    return f"⏰ *टास्क दर्ज किया गया!*\n\n• **कार्य**: {t.title}\n• **समय**: {t.reminder_time or 'Anytime'}\n• **प्राथमिकता**: {t.priority.upper()}"

                already, msg = execute_idempotent_business_mutation(db, mut_key, _create_task, user_email, owner_id)
                if already:
                    reply_text = f"⏰ *टास्क पहले ही दर्ज है!*\n\n• **कार्य**: {data_inner.get('title', text)}"
                else:
                    reply_text = msg
            else:
                t = Task(
                    user_email=user_email,
                    owner_user_id=owner_id,
                    title=data_inner.get("title", text),
                    priority=data_inner.get("priority", "medium"),
                    reminder_time=data_inner.get("reminder_time"),
                    status="pending"
                )
                db.add(t)
                db.commit()
                db.refresh(t)
                subs = data_inner.get("subtasks")
                if subs and isinstance(subs, list):
                    for st in subs:
                        if str(st).strip():
                            db.add(Task(user_email=user_email, owner_user_id=owner_id, title=str(st).strip(), parent_id=t.id, status="pending"))
                    db.commit()
                reply_text = f"⏰ *टास्क दर्ज किया गया!*\n\n• **कार्य**: {t.title}\n• **समय**: {t.reminder_time or 'Anytime'}\n• **प्राथमिकता**: {t.priority.upper()}"
        elif action == "expense":
            if mut_key:
                def _create_expense(session):
                    rec = FinancialRecord(
                        user_email=user_email,
                        owner_user_id=owner_id,
                        type="expense",
                        category=data_inner.get("category", "general"),
                        amount=data_inner.get("amount", 0.0),
                        currency="INR",
                        payment_mode=data_inner.get("payment_mode", "upi"),
                        note=data_inner.get("note", text)
                    )
                    session.add(rec)
                    session.flush()
                    return f"🧾 *खर्च दर्ज किया गया!*\n\n• **राशि**: ₹{rec.amount:,.2f}\n• **श्रेणी**: {rec.category.title()}\n• **विवरण**: {rec.note}"

                already, msg = execute_idempotent_business_mutation(db, mut_key, _create_expense, user_email, owner_id)
                if already:
                    reply_text = f"🧾 *खर्च पहले ही दर्ज है!*\n\n• **राशि**: ₹{data_inner.get('amount', 0.0):,.2f}"
                else:
                    reply_text = msg
            else:
                rec = FinancialRecord(
                    user_email=user_email,
                    owner_user_id=owner_id,
                    type="expense",
                    category=data_inner.get("category", "general"),
                    amount=data_inner.get("amount", 0.0),
                    currency="INR",
                    payment_mode=data_inner.get("payment_mode", "upi"),
                    note=data_inner.get("note", text)
                )
                db.add(rec)
                db.commit()
                reply_text = f"🧾 *खर्च दर्ज किया गया!*\n\n• **राशि**: ₹{rec.amount:,.2f}\n• **श्रेणी**: {rec.category.title()}\n• **विवरण**: {rec.note}"
        else:
            reply_text = data_inner.get("response") or "प्रतिक्रिया संसाधित की गई।"

        if bot_token:
            async with httpx.AsyncClient() as client:
                await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": reply_text,
                    "parse_mode": "Markdown"
                })
        return {"status": "ok"}
    except HTTPException:
        webhook_success = False
        raise
    except Exception as e:
        webhook_success = False
        print(f"[Telegram Webhook Error] {e}")
        return {"status": "error", "detail": str(e)}
    finally:
        if webhook_evt:
            finalize_webhook_event(db, webhook_evt, success=webhook_success)

# ----------------- WhatsApp Executive Assistant Webhook (Meta Cloud API & Twilio) -----------------
async def _send_whatsapp_message(
    to_number: str,
    message_body: str,
    phone_id: str,
    access_token: str,
    attachment_url: Optional[str] = None,
    attachment_type: Optional[str] = "image",
    attachment_name: Optional[str] = None
) -> dict:
    """Sends outgoing message via Meta WhatsApp Cloud API with text or media attachment support."""
    if not phone_id or not access_token:
        print("[WhatsApp] WHATSAPP_PHONE_ID or WHATSAPP_TOKEN missing in environment variables (Running in simulation mode).")
        return {"status": "simulated", "id": f"sim_{int(time.time()*1000)}"}
    url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    if attachment_url and attachment_url.startswith("http"):
        if attachment_type == "document":
            payload = {
                "messaging_product": "whatsapp",
                "to": to_number,
                "type": "document",
                "document": {
                    "link": attachment_url,
                    "caption": message_body,
                    "filename": attachment_name or "document.pdf"
                }
            }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "to": to_number,
                "type": "image",
                "image": {
                    "link": attachment_url,
                    "caption": message_body
                }
            }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"body": message_body}
        }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=12)
            print(f"[WhatsApp Outgoing Response] Status: {resp.status_code}, Body: {resp.text}")
            if resp.status_code in [200, 201]:
                data = resp.json()
                msg_id = data.get("messages", [{}])[0].get("id")
                return {"status": "success", "id": msg_id}
            return {"status": "error", "detail": resp.text}
    except Exception as e:
        print(f"[WhatsApp Outgoing Error] {e}")
        return {"status": "error", "detail": str(e)}

@app.get("/api/whatsapp/sync-waba")
async def sync_whatsapp_waba():
    """
    Retired insecure setup endpoint.

    The former handler performed account pairing without authentication/OTP,
    embedded a personal phone/email, and sent a live WhatsApp message on GET.
    Use the authenticated OTP pairing flow and configure WABA subscriptions
    out-of-band in the Meta developer console instead.
    """
    raise HTTPException(
        status_code=410,
        detail="This legacy endpoint is disabled. Use the authenticated WhatsApp pairing flow."
    )


@app.post("/api/whatsapp/send-digest")
async def trigger_whatsapp_digest(
    time_of_day: str = "morning",
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Manually triggers sending the Morning or Evening WhatsApp Executive Digest (AETH-P0-02)."""
    token = os.environ.get("WHATSAPP_TOKEN", "").strip()
    phone_id = os.environ.get("WHATSAPP_PHONE_ID", "1432995866556035").strip()

    pairing = db.query(UserIntegrationPairing).filter(
        UserIntegrationPairing.channel == "whatsapp",
        UserIntegrationPairing.owner_user_id == current_user.id,
        UserIntegrationPairing.is_active == True
    ).first()
    if not pairing:
        raise HTTPException(status_code=400, detail="WhatsApp pairing not found for active user account")
    
    user_phone = pairing.channel_user_id

    if time_of_day == "morning":
        pending_task_count = db.query(func.count(Task.id)).filter(
            Task.owner_user_id == current_user.id, Task.status == "pending", Task.parent_id == None
        ).scalar() or 0
        p_tasks = db.query(Task).filter(
            Task.owner_user_id == current_user.id, Task.status == "pending", Task.parent_id == None
        ).order_by(Task.due_date.asc().nullslast(), Task.id.desc()).limit(3).all()
        top_tasks = ", ".join([f"'{t.title}'" for t in p_tasks]) if p_tasks else "कोई पेंडिंग कार्य नहीं"
        digest_msg = (
            f"☀️ *सुप्रभात! Aether Morning Digest*\n\n"
            f"🎯 *आज के कार्य ({pending_task_count})*: {top_tasks}\n\n"
            f"दिन की शानदार शुरुआत करें! कोई भी नया काम या खर्च दर्ज करने के लिए सीधे यहाँ रिप्लाई करें। 🚀"
        )
    else:
        comp_count = db.query(Task).filter(Task.owner_user_id == current_user.id, Task.status == "completed").count()
        pend_count = db.query(Task).filter(Task.owner_user_id == current_user.id, Task.status == "pending").count()
        digest_msg = (
            f"🌙 *शुभ संध्या! Aether Day Wrap-up*\n\n"
            f"📊 *आज की प्रगति*:\n"
            f"• पूरे हुए कार्य: ✅ {comp_count}\n"
            f"• शेष कार्य: ⏳ {pend_count}\n\n"
            f"क्या शेष कार्यों को कल के लिए आगे बढ़ाना है? बस मुझे यहाँ बता दें।"
        )
    
    await _send_whatsapp_message(user_phone, digest_msg, phone_id, token)
    return {"status": "success", "sent_to": user_phone, "type": time_of_day}

# ----------------- WhatsApp In-App Messenger & Live Activity API -----------------
class WhatsAppDirectSendRequest(BaseModel):
    to_phone: str
    message: Optional[str] = ""
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = "image"
    user_email: Optional[str] = None  # Ignored; identity is always derived from the verified JWT.
    approval_id: Optional[str] = None

class WhatsAppSimulateIncomingRequest(BaseModel):
    from_phone: Optional[str] = "918741838653"
    sender_name: Optional[str] = "Client / Contact"
    message: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    user_email: Optional[str] = None

@app.get("/api/whatsapp/messages")
def get_whatsapp_messages(
    current_user: UserIdentity = Depends(get_current_user_identity),
    phone: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetches WhatsApp messages with strict UUID tenant isolation (AETH-P0-02)."""
    query = db.query(WhatsAppMessage).filter(tenant_filter(WhatsAppMessage, current_user))
    if phone:
        clean_phone = re.sub(r'[^0-9]', '', phone)
        query = query.filter(WhatsAppMessage.phone_number.like(f"%{clean_phone[-10:]}%"))
    messages = query.order_by(WhatsAppMessage.created_at.asc()).limit(150).all()

    if not messages:
        # Seed default interactive conversation for first-time onboarding
        now = datetime.utcnow()
        default_phone = "918741838653"
        seed1 = WhatsAppMessage(
            user_email=current_user.email,
            owner_user_id=current_user.id,
            direction="outbound",
            phone_number=default_phone,
            sender_name="Pawan Dixit (Aether)",
            message_text="Hello! Sharing the latest executive project updates and visual report from Aether.",
            status="read",
            created_at=now - timedelta(hours=2),
            activity_data=json.dumps([
                {"event": "dispatched", "time": (now - timedelta(hours=2)).isoformat(), "note": "Sent via Meta Cloud API"},
                {"event": "delivered", "time": (now - timedelta(hours=1, minutes=59)).isoformat(), "note": "Delivered to recipient device (double tick)"},
                {"event": "read", "time": (now - timedelta(hours=1, minutes=45)).isoformat(), "note": "Read by recipient (blue tick)"}
            ])
        )
        seed2 = WhatsAppMessage(
            user_email=current_user.email,
            owner_user_id=current_user.id,
            direction="inbound",
            phone_number=default_phone,
            sender_name="Rohit Sharma",
            message_text="Looks great Pawan! The delivery numbers and system response times are very solid. When is the next demo?",
            status="received",
            created_at=now - timedelta(hours=1, minutes=30),
            activity_data=json.dumps([
                {"event": "received", "time": (now - timedelta(hours=1, minutes=30)).isoformat(), "note": "Inbound reply received via WhatsApp webhook"}
            ])
        )
        seed3 = WhatsAppMessage(
            user_email=current_user.email,
            owner_user_id=current_user.id,
            direction="outbound",
            phone_number=default_phone,
            sender_name="Pawan Dixit (Aether)",
            message_text="Demo is scheduled for tomorrow at 11:00 AM. Here is the visual card:",
            attachment_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
            attachment_name="Aether_Executive_Insight.png",
            attachment_type="image",
            status="delivered",
            created_at=now - timedelta(minutes=20),
            activity_data=json.dumps([
                {"event": "dispatched", "time": (now - timedelta(minutes=20)).isoformat(), "note": "Media dispatched to recipient"},
                {"event": "delivered", "time": (now - timedelta(minutes=19)).isoformat(), "note": "Delivered to device with double tick"}
            ])
        )
        db.add_all([seed1, seed2, seed3])
        db.commit()
        messages = [seed1, seed2, seed3]

    result_list = []
    total_sent = 0
    total_received = 0
    for m in messages:
        if m.direction == "outbound":
            total_sent += 1
        else:
            total_received += 1
        act = []
        if m.activity_data:
            try:
                act = json.loads(m.activity_data)
            except Exception:
                pass
        result_list.append({
            "id": m.id,
            "direction": m.direction,
            "phone_number": m.phone_number,
            "sender_name": m.sender_name or m.phone_number,
            "message_text": m.message_text or "",
            "attachment_url": m.attachment_url,
            "attachment_name": m.attachment_name,
            "attachment_type": m.attachment_type,
            "status": m.status,
            "activity": act,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })

    return {
        "status": "success",
        "messages": result_list,
        "stats": {
            "total_sent": total_sent,
            "total_received": total_received,
            "delivery_rate": "99.8%",
            "active_contacts": len(set(m.phone_number for m in messages))
        }
    }

def _normalize_whatsapp_direct_send(req: WhatsAppDirectSendRequest) -> Dict[str, Any]:
    """Build the exact canonical payload that must be approved before dispatch."""
    raw_phone = re.sub(r"[^0-9]", "", (req.to_phone or "").strip())
    if len(raw_phone) == 10:
        clean_phone = f"91{raw_phone}"
    elif 8 <= len(raw_phone) <= 15:
        clean_phone = raw_phone
    else:
        raise HTTPException(status_code=422, detail="A valid destination phone number is required")

    message = (req.message or "").strip()
    attachment_url = (req.attachment_url or "").strip() or None
    attachment_type = (req.attachment_type or "image").strip().lower()
    if not message and not attachment_url:
        raise HTTPException(status_code=422, detail="Message text or an attachment is required")
    if attachment_type not in {"image", "document"}:
        raise HTTPException(status_code=422, detail="Unsupported attachment type")
    if attachment_url:
        from urllib.parse import urlparse
        parsed = urlparse(attachment_url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise HTTPException(status_code=422, detail="Attachments must use an HTTPS URL")

    return {
        "to_phone": clean_phone,
        "message": message,
        "attachment_url": attachment_url,
        "attachment_name": (req.attachment_name or "").strip() or None,
        "attachment_type": attachment_type,
    }


@app.post("/api/whatsapp/send/prepare")
def prepare_whatsapp_direct_send(
    req: WhatsAppDirectSendRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Create a short-lived, user-bound approval for the exact WhatsApp recipient and content."""
    from agent.governance import ActionApprovalManager

    approved_payload = _normalize_whatsapp_direct_send(req)
    approval = ActionApprovalManager.create_approval_request(
        tool_name="send_whatsapp",
        params=approved_payload,
        user_email=current_user.email,
        owner_user_id=current_user.id,
        db=db,
    )
    return {
        "status": "approval_required",
        "approval_id": approval["action_id"],
        "expires_at": approval["expires_at"],
        "recipient": approved_payload["to_phone"],
        "message": approved_payload["message"],
        "attachment": approved_payload["attachment_name"] or bool(approved_payload["attachment_url"]),
        "confirmation_required": True,
    }


@app.post("/api/whatsapp/send")
async def send_whatsapp_direct(
    req: WhatsAppDirectSendRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Dispatch only after consuming a one-time approval bound to this user and exact payload."""
    from agent.governance import ActionApprovalManager

    if not req.approval_id:
        raise HTTPException(status_code=403, detail="Explicit WhatsApp send approval is required")
    approved_payload = _normalize_whatsapp_direct_send(req)
    authorized, reason = ActionApprovalManager.verify_and_consume(
        action_id=req.approval_id,
        tool_name="send_whatsapp",
        params=approved_payload,
        user_email=current_user.email,
        owner_user_id=current_user.id,
        db=db,
    )
    if not authorized:
        raise HTTPException(status_code=403, detail=reason)

    token = os.environ.get("WHATSAPP_TOKEN", "").strip()
    phone_id = os.environ.get("WHATSAPP_PHONE_ID", "").strip()
    if not token or not phone_id:
        raise HTTPException(status_code=503, detail="WhatsApp delivery is not configured")

    dispatch_res = await _send_whatsapp_message(
        to_number=approved_payload["to_phone"],
        message_body=approved_payload["message"],
        phone_id=phone_id,
        access_token=token,
        attachment_url=approved_payload["attachment_url"],
        attachment_type=approved_payload["attachment_type"],
        attachment_name=approved_payload["attachment_name"],
    )
    if not isinstance(dispatch_res, dict) or dispatch_res.get("status") != "success":
        raise HTTPException(status_code=502, detail="WhatsApp provider did not accept the message")

    now = datetime.utcnow()
    activity_events = [
        {"event": "created", "timestamp": now.isoformat(), "note": "Approved message composed inside Aether"},
        {"event": "dispatched", "timestamp": now.isoformat(), "note": "Accepted by Meta Cloud API"},
    ]
    new_msg = WhatsAppMessage(
        owner_user_id=current_user.id,
        user_email=current_user.email,
        direction="outbound",
        phone_number=approved_payload["to_phone"],
        sender_name="Aether",
        message_text=approved_payload["message"],
        attachment_url=approved_payload["attachment_url"],
        attachment_name=approved_payload["attachment_name"],
        attachment_type=approved_payload["attachment_type"],
        status="sent",
        waba_message_id=dispatch_res.get("id"),
        activity_data=json.dumps(activity_events),
        created_at=now,
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    return {
        "status": "success",
        "message": {
            "id": new_msg.id,
            "direction": new_msg.direction,
            "phone_number": new_msg.phone_number,
            "message_text": new_msg.message_text,
            "status": new_msg.status,
            "waba_message_id": new_msg.waba_message_id,
        },
    }

@app.post("/api/whatsapp/simulate-incoming")
def simulate_whatsapp_incoming(
    req: WhatsAppSimulateIncomingRequest,
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Simulates receiving an inbound WhatsApp message for in-app testing."""
    eff_email = get_effective_email(user_email or req.user_email) or DEFAULT_OWNER_EMAIL
    clean_phone = re.sub(r'[^0-9]', '', req.from_phone or "918741838653")
    now_iso = datetime.utcnow().isoformat()
    activity_events = [
        {"event": "received", "timestamp": now_iso, "note": f"Inbound message received from +{clean_phone}"}
    ]
    inbound_msg = WhatsAppMessage(
        user_email=eff_email,
        direction="inbound",
        phone_number=clean_phone,
        sender_name=req.sender_name or f"+{clean_phone}",
        message_text=req.message,
        attachment_url=req.attachment_url,
        attachment_name=req.attachment_name,
        attachment_type="image" if req.attachment_url else None,
        status="received",
        activity_data=json.dumps(activity_events),
        created_at=datetime.utcnow()
    )
    db.add(inbound_msg)
    db.commit()
    db.refresh(inbound_msg)
    return {
        "status": "success",
        "message": {
            "id": inbound_msg.id,
            "direction": "inbound",
            "phone_number": inbound_msg.phone_number,
            "sender_name": inbound_msg.sender_name,
            "message_text": inbound_msg.message_text,
            "attachment_url": inbound_msg.attachment_url,
            "attachment_name": inbound_msg.attachment_name,
            "attachment_type": inbound_msg.attachment_type,
            "status": inbound_msg.status,
            "activity": activity_events,
            "created_at": inbound_msg.created_at.isoformat()
        }
    }

@app.get("/api/whatsapp/webhook")
def whatsapp_verify(request: Request):
    """Meta WhatsApp Webhook Verification Handshake."""
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    expected_token = os.environ.get("WHATSAPP_VERIFY_TOKEN", "aether_secure_token")
    if mode == "subscribe" and token == expected_token:
        try:
            return int(challenge)
        except (ValueError, TypeError):
            return challenge
    raise HTTPException(status_code=403, detail="Verification token mismatch")

# ─── WhatsApp Webhook & Phone Pairing Subsystem (AETH-SEC-06) ─────────────
PHONE_PAIRING_OTPS: Dict[str, Dict[str, Any]] = {}
PAIRED_PHONE_NUMBERS: Dict[str, str] = {} # { phone_clean: user_email }

@app.post("/api/whatsapp/pair-request")
def request_phone_pairing(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Generates a cryptographically secure 6-digit OTP in ChannelPairingChallenge to pair WhatsApp (AETH-P0-05)."""
    import secrets
    otp = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    
    challenge = ChannelPairingChallenge(
        otp_hash=otp_hash,
        owner_user_id=current_user.id,
        user_email=current_user.email,
        channel="whatsapp",
        expires_at=time.time() + 600,
        consumed=False,
        attempts=0
    )
    db.add(challenge)
    db.commit()
    
    return {
        "status": "success",
        "pairing_code": otp,
        "expires_in_seconds": 600,
        "instruction": f"Send the code '{otp}' to our WhatsApp bot from your mobile to link your account securely."
    }

@app.post("/api/whatsapp/webhook")
async def whatsapp_incoming(req: Request, db: Session = Depends(get_db)):
    """
    Receives and processes incoming WhatsApp messages from Meta Cloud API.
    Enforces HMAC-SHA256 signature verification, durable DB deduplication,
    and OTP-only pairing (AETH-P0-05). Direct email pairing is eliminated.
    """
    whatsapp_secret = os.environ.get("WHATSAPP_APP_SECRET", "").strip()
    env = os.environ.get("ENVIRONMENT", "development").lower()
    is_prod = env in ["prod", "production"]
    raw_body = await req.body()

    # An empty app secret is not a valid signature key. Never accept an attacker-computable empty-key HMAC.
    if is_prod and not whatsapp_secret:
        raise HTTPException(status_code=503, detail="WhatsApp webhook verification is not configured")
    # 1. Cryptographic signature verification against Meta app secret (Mandatory in production)
    if whatsapp_secret or is_prod:
        hub_sig = req.headers.get("X-Hub-Signature-256", "").strip()
        if not hub_sig or not hub_sig.startswith("sha256="):
            raise HTTPException(status_code=403, detail="Missing or invalid X-Hub-Signature-256 header")
        expected_sig = "sha256=" + hmac.new(whatsapp_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(hub_sig, expected_sig):
            raise HTTPException(status_code=403, detail="WhatsApp webhook signature mismatch")

    # Authorize bridge tables (user_integration_pairings, channel_pairing_challenges) for verified webhook
    set_webhook_service_rls_context(db, "whatsapp")

    webhook_evt = None
    webhook_success = True
    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})

        # Handle Delivery & Read Receipt Status Webhooks
        statuses = value.get("statuses", [])
        if statuses:
            for s in statuses:
                w_id = s.get("id")
                st = s.get("status")  # "delivered", "read", "sent", "failed"
                if w_id and st:
                    matched = db.query(WhatsAppMessage).filter(WhatsAppMessage.waba_message_id == w_id).first()
                    if matched:
                        matched.status = st
                        try:
                            act = json.loads(matched.activity_data or "[]")
                            act.append({"event": st, "timestamp": datetime.utcnow().isoformat(), "note": f"Status updated to {st}"})
                            matched.activity_data = json.dumps(act)
                        except Exception:
                            pass
                        db.commit()
            return {"status": "ok", "message": "statuses processed"}

        messages = value.get("messages", [])
        if not messages:
            return {"status": "ok", "message": "no incoming messages"}

        msg = messages[0]
        msg_id = msg.get("id")
        if not isinstance(msg_id, str) or not msg_id.strip():
            raise HTTPException(status_code=400, detail="WhatsApp message ID is required for replay protection")

        # 2. Atomic Deduplication & Retry-Safe State Machine via ProcessedWebhookEvent table (AETH-P0-05)
        webhook_evt = None
        if msg_id:
            claimed, webhook_evt = claim_webhook_event(db, provider="whatsapp", event_id=str(msg_id))
            if not claimed:
                print(f"[WhatsApp Webhook] Duplicate/in-flight message received ({msg_id}) — ignoring to prevent duplicate response.")
                return {"status": "ok", "message": "duplicate ignored"}
            # AETH-P0-05 CRITICAL: claim_webhook_event() calls db.commit() internally which resets
            # transaction-local SET LOCAL settings. Re-establish webhook service RLS context after claim.
            set_webhook_service_rls_context(db, "whatsapp")

        sender = msg.get("from")  # e.g., '919876543210'
        msg_type = msg.get("type")
        user_text = ""

        if msg_type == "text":
            user_text = msg.get("text", {}).get("body", "").strip()
        else:
            user_text = "Hello Aether"

        wa_token = os.environ.get("WHATSAPP_TOKEN", "").strip()
        wa_phone_id = os.environ.get("WHATSAPP_PHONE_ID", "").strip()

        # 3. Atomic OTP consumption via ChannelPairingChallenge with per-sender rate limiting (AETH-P0-05)
        clean_code = re.sub(r'[^0-9]', '', user_text)
        if len(clean_code) == 6:
            code_hash = hashlib.sha256(clean_code.encode()).hexdigest()
            now_ts = time.time()

            # Scoped rate limiting: Check if this specific sender is locked out (AETH-P0-05)
            rate_rec = db.query(SenderPairingRateLimit).filter(
                SenderPairingRateLimit.channel == "whatsapp",
                SenderPairingRateLimit.sender == str(sender)
            ).first()
            if rate_rec and rate_rec.locked_until > now_ts:
                rem = int((rate_rec.locked_until - now_ts) / 60) + 1
                try:
                    await _send_whatsapp_message(
                        sender,
                        f"⚠️ बहुत अधिक असफल प्रयास। यह नंबर {rem} मिनट के लिए अस्थायी रूप से लॉक है।",
                        wa_phone_id,
                        wa_token
                    )
                except Exception:
                    pass
                return {"status": "ok", "message": "sender locked out"}

            rows_updated = db.query(ChannelPairingChallenge).filter(
                ChannelPairingChallenge.otp_hash == code_hash,
                ChannelPairingChallenge.channel == "whatsapp",
                ChannelPairingChallenge.consumed == False,
                ChannelPairingChallenge.expires_at >= now_ts,
                ChannelPairingChallenge.attempts < 5
            ).update({
                ChannelPairingChallenge.consumed: True,
                ChannelPairingChallenge.attempts: ChannelPairingChallenge.attempts + 1
            }, synchronize_session=False)
            db.commit()

            if rows_updated > 0:
                check_and_record_otp_attempt(db, "whatsapp", str(sender), is_correct=True)
                challenge = db.query(ChannelPairingChallenge).filter(
                    ChannelPairingChallenge.otp_hash == code_hash,
                    ChannelPairingChallenge.channel == "whatsapp"
                ).first()
                paired_user_email = challenge.user_email
                paired_owner_id = challenge.owner_user_id
                set_db_rls_context(db, paired_owner_id)

                # Persist verified pairing in UserIntegrationPairing table
                existing = db.query(UserIntegrationPairing).filter(
                    UserIntegrationPairing.channel == "whatsapp",
                    UserIntegrationPairing.channel_user_id == str(sender)
                ).first()
                if existing:
                    existing.owner_user_id = paired_owner_id
                    existing.user_email = paired_user_email
                    existing.is_active = True
                    existing.updated_at = datetime.utcnow()
                else:
                    db.add(UserIntegrationPairing(
                        owner_user_id=paired_owner_id,
                        user_email=paired_user_email,
                        channel="whatsapp",
                        channel_user_id=str(sender),
                        is_active=True
                    ))
                db.commit()

                try:
                    await _send_whatsapp_message(
                        sender,
                        f"✅ Security Verified! Your phone (+{sender}) is now securely linked to your Aether account ({paired_user_email}).",
                        wa_phone_id,
                        wa_token
                    )
                except Exception:
                    pass
                return {"status": "ok", "message": "phone successfully paired"}
            else:
                # Increment failed attempts ONLY for this specific sender, never exhausting other users' challenges (AETH-P0-05)
                _, fail_msg = check_and_record_otp_attempt(db, "whatsapp", str(sender), is_correct=False)
                try:
                    await _send_whatsapp_message(sender, fail_msg, wa_phone_id, wa_token)
                except Exception:
                    pass
                return {"status": "ok", "message": "invalid_code"}

        # 4. Check verified pairing strictly from UserIntegrationPairing (AETH-P0-05)
        verified_pairing = db.query(UserIntegrationPairing).filter(
            UserIntegrationPairing.channel == "whatsapp",
            UserIntegrationPairing.channel_user_id == str(sender),
            UserIntegrationPairing.is_active == True
        ).first()

        user_email = verified_pairing.user_email if verified_pairing else None
        owner_id = verified_pairing.owner_user_id if verified_pairing else None
        if owner_id:
            set_db_rls_context(db, owner_id)
        else:
            set_db_rls_context(db, None)

        # 5. Insecure email commands are rejected and guided to OTP
        if user_text.lower().startswith("/login") or user_text.lower().startswith("/start"):
            reply_text = (
                f"⚡ *Aether WhatsApp Executive*\n\n"
                f"सुरक्षा कारणों से सीधा ईमेल लिंक बंद कर दिया गया है।\n\n"
                f"कृपया Aether ऐप में जाएँ, 'Pair WhatsApp' पर क्लिक करके 6-अंकों का सुरक्षित पेयरिंग कोड प्राप्त करें और उसे यहाँ भेजें।"
            )
            await _send_whatsapp_message(sender, reply_text, wa_phone_id, wa_token)
            return {"status": "guide_sent"}

        # Record inbound message in WhatsAppMessage table for In-App Live Messenger
        try:
            inbound_entry = WhatsAppMessage(
                user_email=user_email or "unpaired_contact",
                owner_user_id=verified_pairing.owner_user_id if verified_pairing else None,
                direction="inbound",
                phone_number=sender,
                sender_name=f"+{sender}",
                message_text=user_text,
                status="received",
                waba_message_id=msg_id,
                activity_data=json.dumps([{"event": "received", "timestamp": datetime.utcnow().isoformat(), "note": f"Inbound message from +{sender}"}])
            )
            db.add(inbound_entry)
            db.commit()
        except Exception as e_in:
            print(f"[WhatsApp Inbound Save Error] {e_in}")

        if not user_email:
            # SENDER IS AN UNPAIRED EXTERNAL CONTACT (Friend, Client, Colleague)
            # AETH-P0-05: NEVER expose personal tasks, finances, or memories of operator to an unpaired sender!
            safe_context = {
                "tasks": [],
                "user_name": "Aether Assistant"
            }
            from ai_engine import generate_external_contact_reply
            result = await generate_external_contact_reply(
                sender_identifier=sender,
                message_text=user_text,
                operator_name="Aether Assistant",
                operator_context=safe_context,
                language="auto"
            )
            reply = result.get("reply", "नमस्ते! मुझे आपका संदेश प्राप्त हुआ है।")
            await _send_whatsapp_message(sender, reply, wa_phone_id, wa_token)
            return {"status": "processed", "type": "external_contact"}
            
            # Record notification & follow-up task for Pawan!
            try:
                # 1. Log in Pawan's Unified Chat History
                db.add(ChatMessage(user_email=operator_email, role="user", content=f"📩 [External WhatsApp from +{sender}]: {user_text}", action_type="external_msg"))
                db.add(ChatMessage(user_email=operator_email, role="aether", content=f"🤖 [Aether Executive Auto-Reply to +{sender}]:\n{reply_text}", action_type="external_reply"))
                
                # 2. Add an actionable task in Pawan's list so he never forgets
                new_t = Task(
                    user_email=operator_email,
                    title=f"Follow up with +{sender}: {user_text[:50]}",
                    priority="medium",
                    status="pending"
                )
                db.add(new_t)
                db.commit()
                
                # 3. If operator's WhatsApp number is paired, ping Pawan with an alert!
                if operator_phone and operator_phone != sender:
                    pawan_alert = (
                        f"📩 *New WhatsApp Message from Friend/Contact!*\n\n"
                        f"• *From*: `+{sender}`\n"
                        f"• *Message*: \"{user_text}\"\n"
                        f"• *Aether Auto-Replied*: \"{reply_text}\"\n\n"
                        f"✅ आपके एजेंडा में फॉलोअप टास्क जोड़ दिया गया है।"
                    )
                    asyncio.create_task(_send_whatsapp_message(operator_phone, pawan_alert, wa_phone_id, wa_token))
            except Exception as e_log:
                print(f"[Aether External Auto-Responder Error] {e_log}")
            
            return {"status": "external_reply_sent"}

        # Process through Aether AI engine
        context = build_context(db, user_email=user_email, owner_user_id=owner_id)
        try:
            from ai_engine import parse_intent_with_llm
        except ImportError:
            from .ai_engine import parse_intent_with_llm

        display_user_name = "Pawan Dixit"
        parsed = await parse_intent_with_llm(
            user_text,
            context=context,
            user_name=display_user_name,
            language="auto",
            user_email=user_email
        )
        action = parsed.get("action", "query")
        data_inner = parsed.get("data", {})

        mut_key = f"webhook_whatsapp_{msg_id}" if msg_id else None
        reply_text = ""
        if action == "task":
            multi = data_inner.get("multi_tasks")
            if multi and isinstance(multi, list) and len(multi) > 1:
                if mut_key:
                    def _create_multi_tasks(session):
                        created = []
                        for item in multi:
                            title = item.get("title", "").strip()
                            if title:
                                t = Task(
                                    user_email=user_email,
                                    owner_user_id=owner_id,
                                    title=title,
                                    priority=item.get("priority", "medium"),
                                    reminder_time=item.get("reminder_time"),
                                    status="pending"
                                )
                                session.add(t)
                                created.append(t)
                        session.flush()
                        task_lines = "\n".join([f"• *{ct.title}* ({ct.reminder_time or 'Anytime'})" for ct in created])
                        return f"⏰ *{len(created)} टास्क दर्ज किए गए!*\n\n{task_lines}\n\nसभी रिमाइंडर्स आपके एजेंडा में सिंक हो चुके हैं।"

                    already, msg = execute_idempotent_business_mutation(db, mut_key, _create_multi_tasks, user_email, owner_id)
                    if already:
                        reply_text = f"⏰ *टास्क पहले ही दर्ज हैं!*\n\n{len(multi)} कार्य आपके एजेंडा में पहले से मौजूद हैं।"
                    else:
                        reply_text = msg
                else:
                    created_tasks = []
                    for item in multi:
                        title = item.get("title", "").strip()
                        if title:
                            t = Task(
                                user_email=user_email,
                                owner_user_id=owner_id,
                                title=title,
                                priority=item.get("priority", "medium"),
                                reminder_time=item.get("reminder_time"),
                                status="pending"
                            )
                            db.add(t)
                            created_tasks.append(t)
                    db.commit()
                    task_lines = "\n".join([f"• *{ct.title}* ({ct.reminder_time or 'Anytime'})" for ct in created_tasks])
                    reply_text = f"⏰ *{len(created_tasks)} टास्क दर्ज किए गए!*\n\n{task_lines}\n\nसभी रिमाइंडर्स आपके एजेंडा में सिंक हो चुके हैं।"
            else:
                if mut_key:
                    def _create_single_task(session):
                        t = Task(
                            user_email=user_email,
                            owner_user_id=owner_id,
                            title=data_inner.get("title", user_text),
                            priority=data_inner.get("priority", "medium"),
                            reminder_time=data_inner.get("reminder_time"),
                            status="pending"
                        )
                        session.add(t)
                        session.flush()
                        subs = data_inner.get("subtasks")
                        if subs and isinstance(subs, list):
                            for st in subs:
                                if str(st).strip():
                                    session.add(Task(user_email=user_email, owner_user_id=owner_id, title=str(st).strip(), parent_id=t.id, status="pending"))
                        return f"⏰ *टास्क दर्ज किया गया!*\n\n• *कार्य*: {t.title}\n• *समय*: {t.reminder_time or 'Anytime'}\n• *प्राथमिकता*: {t.priority.upper()}"

                    already, msg = execute_idempotent_business_mutation(db, mut_key, _create_single_task, user_email, owner_id)
                    if already:
                        reply_text = f"⏰ *टास्क पहले ही दर्ज है!*\n\n• *कार्य*: {data_inner.get('title', user_text)}"
                    else:
                        reply_text = msg
                else:
                    t = Task(
                        user_email=user_email,
                        owner_user_id=owner_id,
                        title=data_inner.get("title", user_text),
                        priority=data_inner.get("priority", "medium"),
                        reminder_time=data_inner.get("reminder_time"),
                        status="pending"
                    )
                    db.add(t)
                    db.commit()
                    db.refresh(t)
                    subs = data_inner.get("subtasks")
                    if subs and isinstance(subs, list):
                        for st in subs:
                            if str(st).strip():
                                db.add(Task(user_email=user_email, owner_user_id=owner_id, title=str(st).strip(), parent_id=t.id, status="pending"))
                        db.commit()
                    reply_text = f"⏰ *टास्क दर्ज किया गया!*\n\n• *कार्य*: {t.title}\n• *समय*: {t.reminder_time or 'Anytime'}\n• *प्राथमिकता*: {t.priority.upper()}"
        elif action in ["expense", "income"]:
            rec_type = "expense" if action == "expense" else "income"
            if mut_key:
                def _create_financial_rec(session):
                    rec = FinancialRecord(
                        user_email=user_email,
                        owner_user_id=owner_id,
                        type=rec_type,
                        category=data_inner.get("category", "general"),
                        amount=data_inner.get("amount", 0.0),
                        currency="INR",
                        payment_mode=data_inner.get("payment_mode", "upi"),
                        note=data_inner.get("note", user_text)
                    )
                    session.add(rec)
                    session.flush()
                    if rec_type == "expense":
                        return f"🧾 *खर्च दर्ज किया गया!*\n\n• *राशि*: ₹{rec.amount:,.2f}\n• *श्रेणी*: {rec.category.title()}\n• *मोड*: {rec.payment_mode.upper()}\n• *विवरण*: {rec.note}"
                    else:
                        return f"💰 *आय दर्ज की गई!*\n\n• *राशि*: +₹{rec.amount:,.2f}\n• *श्रेणी*: {rec.category.title()}\n• *विवरण*: {rec.note}"

                already, msg = execute_idempotent_business_mutation(db, mut_key, _create_financial_rec, user_email, owner_id)
                if already:
                    reply_text = f"🧾 *खर्च/आय पहले ही दर्ज है!*\n\n• *राशि*: ₹{data_inner.get('amount', 0.0):,.2f}"
                else:
                    reply_text = msg
            else:
                rec = FinancialRecord(
                    user_email=user_email,
                    owner_user_id=owner_id,
                    type=rec_type,
                    category=data_inner.get("category", "general"),
                    amount=data_inner.get("amount", 0.0),
                    currency="INR",
                    payment_mode=data_inner.get("payment_mode", "upi"),
                    note=data_inner.get("note", user_text)
                )
                db.add(rec)
                db.commit()
                if rec_type == "expense":
                    reply_text = f"🧾 *खर्च दर्ज किया गया!*\n\n• *राशि*: ₹{rec.amount:,.2f}\n• *श्रेणी*: {rec.category.title()}\n• *मोड*: {rec.payment_mode.upper()}\n• *विवरण*: {rec.note}"
                else:
                    reply_text = f"💰 *आय दर्ज की गई!*\n\n• *राशि*: +₹{rec.amount:,.2f}\n• *श्रेणी*: {rec.category.title()}\n• *विवरण*: {rec.note}"
        elif action == "youtube":
            q = data_inner.get("query")
            if not q or q == user_text:
                clean_yt = re.sub(r'(?i)\b(can you|could you|please|kripya|play|open|suno|sunao|chalao|chala do|chala|bajao|baja do|gana|gaana|song|songs|video|bhajan|kholo|karo|dekho)\b', '', user_text)
                clean_yt = re.sub(r'(?i)\b(on|in|par|pe|me|se)\s+youtube\b', '', clean_yt)
                clean_yt = re.sub(r'(?i)\byoutube\b', '', clean_yt)
                clean_yt = re.sub(r'(?i)\b(ka|ke|ki|for)\b\s*$', '', clean_yt).strip()
                q = re.sub(r'\s+', ' ', clean_yt).strip(' :-.,') or "Trending"
            try:
                from ai_engine import resolve_youtube_playback
            except ImportError:
                from .ai_engine import resolve_youtube_playback
            yt_info = resolve_youtube_playback(q)
            watch_url = yt_info.get("watch_url") or data_inner.get("url") or f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(q)}"
            reply_text = (
                f"🎬 *Playing on YouTube:*\n« {q} »\n\n"
                f"▶️ *Tap to Watch & Play Now:*\n{watch_url}\n\n"
                f"Enjoy the video! 🎵"
            )
        else:
            reply_text = data_inner.get("response") or "प्रतिक्रिया संसाधित की गई।"

        # Record WhatsApp conversation into unified Chat History for Aether App
        try:
            db.add(ChatMessage(user_email=user_email, owner_user_id=owner_id, role="user", content=f"📱 {user_text}", action_type=action))
            db.add(ChatMessage(user_email=user_email, owner_user_id=owner_id, role="aether", content=reply_text, action_type=action, action_data=json.dumps(data_inner) if data_inner else None))
            db.commit()
        except Exception as e_chat:
            print(f"[WhatsApp ChatMessage Sync Error] {e_chat}")

        await _send_whatsapp_message(sender, reply_text, wa_phone_id, wa_token)
        return {"status": "ok"}
    except HTTPException:
        webhook_success = False
        raise
    except Exception as e:
        webhook_success = False
        print(f"[WhatsApp Webhook Error] {e}")
        return {"status": "error", "detail": str(e)}
    finally:
        if webhook_evt:
            finalize_webhook_event(db, webhook_evt, success=webhook_success)

# ----------------- Twilio WhatsApp Sandbox Webhook Support -----------------
@app.post("/api/whatsapp/twilio")
async def twilio_whatsapp_webhook(req: Request, db: Session = Depends(get_db)):
    """Receives and processes incoming WhatsApp messages from Twilio with signature validation (AETH-P0-05)."""
    twilio_auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    env = os.environ.get("ENVIRONMENT", "production").lower()
    is_prod = env in ["prod", "production"]

    form = await req.form()
    form_dict = {k: str(v) for k, v in form.items()}

    # An empty auth token makes the expected HMAC publicly computable; fail closed when absent.
    if is_prod and not twilio_auth_token:
        raise HTTPException(status_code=503, detail="Twilio webhook verification is not configured")
    # Cryptographic Twilio signature verification with reverse-proxy canonical URL (AETH-P0-05)
    if twilio_auth_token or is_prod:
        sig_header = req.headers.get("X-Twilio-Signature", "").strip()
        if not sig_header:
            raise HTTPException(status_code=403, detail="Missing X-Twilio-Signature header")

        proto = req.headers.get("X-Forwarded-Proto", req.url.scheme)
        host = req.headers.get("X-Forwarded-Host", req.url.netloc)
        canonical_url = f"{proto}://{host}{req.url.path}"

        s = canonical_url
        for k in sorted(form_dict.keys()):
            s += k + form_dict[k]
        computed_sig = base64.b64encode(hmac.new(twilio_auth_token.encode("utf-8"), s.encode("utf-8"), hashlib.sha1).digest()).decode("utf-8")

        if not hmac.compare_digest(sig_header, computed_sig):
            s_raw = str(req.url)
            for k in sorted(form_dict.keys()):
                s_raw += k + form_dict[k]
            computed_raw = base64.b64encode(hmac.new(twilio_auth_token.encode("utf-8"), s_raw.encode("utf-8"), hashlib.sha1).digest()).decode("utf-8")
            if not hmac.compare_digest(sig_header, computed_raw):
                raise HTTPException(status_code=403, detail="Twilio webhook signature verification failed")

    # Authorize bridge tables (user_integration_pairings, channel_pairing_challenges) for verified webhook
    set_webhook_service_rls_context(db, "whatsapp")

    # Atomic event deduplication and retry state machine for Twilio (AETH-P0-05)
    msg_sid = form.get("MessageSid") or form.get("SmsMessageSid") or form.get("SmsSid")
    if not msg_sid or not str(msg_sid).strip():
        raise HTTPException(status_code=400, detail="Twilio MessageSid is required for replay protection")
    twilio_evt = None
    webhook_success = True
    if msg_sid:
        claimed, twilio_evt = claim_webhook_event(db, provider="twilio", event_id=str(msg_sid))
        if not claimed:
            print(f"[Twilio Webhook] Duplicate delivery ignored: {msg_sid}")
            return Response(content="<Response></Response>", media_type="application/xml")
        # AETH-P0-05 CRITICAL: claim_webhook_event() calls db.commit() internally which resets
        # transaction-local SET LOCAL settings. Re-establish webhook service RLS context after claim.
        set_webhook_service_rls_context(db, "whatsapp")

    try:
        sender_full = form.get("From", "")  # e.g. "whatsapp:+919876543210"
        sender = sender_full.replace("whatsapp:", "").strip()
        body = form.get("Body", "").strip()

        # Check verified pairing from UserIntegrationPairing (AETH-P0-05)
        pairing = db.query(UserIntegrationPairing).filter(
            UserIntegrationPairing.channel == "whatsapp",
            UserIntegrationPairing.channel_user_id == str(sender),
            UserIntegrationPairing.is_active == True
        ).first()
        user_email = pairing.user_email if pairing else None
        owner_id = pairing.owner_user_id if pairing else None
        if owner_id:
            set_db_rls_context(db, owner_id)
        else:
            set_db_rls_context(db, None)

        # Check 6-digit OTP pairing atomically with per-sender rate limiting (AETH-P0-05)
        clean_code = re.sub(r'[^0-9]', '', body)
        if len(clean_code) == 6:
            code_hash = hashlib.sha256(clean_code.encode()).hexdigest()
            now_ts = time.time()

            # Scoped rate limiting: Check if this specific sender is locked out (AETH-P0-05)
            rate_rec = db.query(SenderPairingRateLimit).filter(
                SenderPairingRateLimit.channel == "whatsapp",
                SenderPairingRateLimit.sender == str(sender)
            ).first()
            if rate_rec and rate_rec.locked_until > now_ts:
                rem = int((rate_rec.locked_until - now_ts) / 60) + 1
                reply = f"⚠️ बहुत अधिक असफल प्रयास। यह नंबर {rem} मिनट के लिए लॉक है।"
                return Response(content=f"<Response><Message>{reply}</Message></Response>", media_type="application/xml")

            rows_updated = db.query(ChannelPairingChallenge).filter(
                ChannelPairingChallenge.otp_hash == code_hash,
                ChannelPairingChallenge.channel == "whatsapp",
                ChannelPairingChallenge.consumed == False,
                ChannelPairingChallenge.expires_at >= now_ts,
                ChannelPairingChallenge.attempts < 5
            ).update({
                ChannelPairingChallenge.consumed: True,
                ChannelPairingChallenge.attempts: ChannelPairingChallenge.attempts + 1
            }, synchronize_session=False)
            db.commit()

            if rows_updated > 0:
                check_and_record_otp_attempt(db, "whatsapp", str(sender), is_correct=True)
                challenge = db.query(ChannelPairingChallenge).filter(
                    ChannelPairingChallenge.otp_hash == code_hash,
                    ChannelPairingChallenge.channel == "whatsapp"
                ).first()
                target_email = challenge.user_email
                target_owner = challenge.owner_user_id
                set_db_rls_context(db, target_owner)
                if pairing:
                    pairing.owner_user_id = target_owner
                    pairing.user_email = target_email
                    pairing.is_active = True
                    pairing.updated_at = datetime.utcnow()
                else:
                    pairing = UserIntegrationPairing(
                        owner_user_id=target_owner,
                        user_email=target_email,
                        channel="whatsapp",
                        channel_user_id=str(sender),
                        is_active=True
                    )
                    db.add(pairing)
                db.commit()
                reply = f"✅ Aether WhatsApp Linked with {target_email}! Ab aap reminders aur kharch direct WhatsApp par bhej sakte hain."
                return Response(content=f"<Response><Message>{reply}</Message></Response>", media_type="application/xml")
            else:
                # Increment failed attempts ONLY for this specific sender, never exhausting other users' challenges (AETH-P0-05)
                _, fail_msg = check_and_record_otp_attempt(db, "whatsapp", str(sender), is_correct=False)
                return Response(content=f"<Response><Message>{fail_msg}</Message></Response>", media_type="application/xml")

        if body.lower().startswith("/login") or body.lower().startswith("/start"):
            reply = "⚡ Aether WhatsApp: सुरक्षा कारणों से सीधा ईमेल लिंक बंद कर दिया गया है। कृपया Aether ऐप से 6-अंकों का पेयरिंग कोड प्राप्त करें और उसे यहाँ भेजें।"
            return Response(content=f"<Response><Message>{reply}</Message></Response>", media_type="application/xml")
        elif not user_email:
            reply = "⚠️ खाता लिंक नहीं है। कृपया Aether ऐप में जाकर 'Pair WhatsApp' पर टैप करके 6-अंकों का कोड जनरेट करें और यहाँ भेजें।"
            return Response(content=f"<Response><Message>{reply}</Message></Response>", media_type="application/xml")
        else:
            from ai_engine import parse_intent_with_llm
            context = build_context(db, user_email=user_email, owner_user_id=owner_id)
            parsed = await parse_intent_with_llm(
                body,
                context=context,
                user_name="Pawan Dixit",
                language="auto",
                user_email=user_email
            )
            action = parsed.get("action", "query")
            data_inner = parsed.get("data", {})
            mut_key = f"webhook_twilio_{msg_sid}" if msg_sid else None
            if action == "task":
                if mut_key:
                    def _create_twilio_task(session):
                        t = Task(user_email=user_email, owner_user_id=owner_id, title=data_inner.get("title", body), reminder_time=data_inner.get("reminder_time"), status="pending")
                        session.add(t)
                        session.flush()
                        return f"⏰ Task saved: {t.title} (Time: {t.reminder_time or 'Anytime'})"

                    already, msg = execute_idempotent_business_mutation(db, mut_key, _create_twilio_task, user_email, owner_id)
                    if already:
                        reply = f"⏰ Task saved: {data_inner.get('title', body)}"
                    else:
                        reply = msg
                else:
                    t = Task(user_email=user_email, owner_user_id=owner_id, title=data_inner.get("title", body), reminder_time=data_inner.get("reminder_time"), status="pending")
                    db.add(t)
                    db.commit()
                    reply = f"⏰ Task saved: {t.title} (Time: {t.reminder_time or 'Anytime'})"
            elif action == "expense":
                if mut_key:
                    def _create_twilio_expense(session):
                        rec = FinancialRecord(user_email=user_email, owner_user_id=owner_id, type="expense", category=data_inner.get("category", "general"), amount=data_inner.get("amount", 0.0), currency="INR", note=data_inner.get("note", body))
                        session.add(rec)
                        session.flush()
                        return f"🧾 Kharch saved: ₹{rec.amount:,.2f} ({rec.category})"

                    already, msg = execute_idempotent_business_mutation(db, mut_key, _create_twilio_expense, user_email, owner_id)
                    if already:
                        reply = f"🧾 Kharch saved: ₹{data_inner.get('amount', 0.0):,.2f} ({data_inner.get('category', 'general')})"
                    else:
                        reply = msg
                else:
                    rec = FinancialRecord(user_email=user_email, owner_user_id=owner_id, type="expense", category=data_inner.get("category", "general"), amount=data_inner.get("amount", 0.0), currency="INR", note=data_inner.get("note", body))
                    db.add(rec)
                    db.commit()
                    reply = f"🧾 Kharch saved: ₹{rec.amount:,.2f} ({rec.category})"
            elif action == "youtube":
                q = data_inner.get("query")
                if not q or q == body:
                    clean_yt = re.sub(r'(?i)\b(can you|could you|please|kripya|play|open|suno|sunao|chalao|chala do|chala|bajao|baja do|gana|gaana|song|songs|video|bhajan|kholo|karo|dekho)\b', '', body)
                    clean_yt = re.sub(r'(?i)\b(on|in|par|pe|me|se)\s+youtube\b', '', clean_yt)
                    clean_yt = re.sub(r'(?i)\byoutube\b', '', clean_yt)
                    clean_yt = re.sub(r'(?i)\b(ka|ke|ki|for)\b\s*$', '', clean_yt).strip()
                    q = re.sub(r'\s+', ' ', clean_yt).strip(' :-.,') or "Trending"
                try:
                    from ai_engine import resolve_youtube_playback
                except ImportError:
                    from .ai_engine import resolve_youtube_playback
                yt_info = resolve_youtube_playback(q)
                watch_url = yt_info.get("watch_url") or data_inner.get("url") or f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(q)}"
                reply = (
                    f"🎬 *Playing on YouTube:*\n« {q} »\n\n"
                    f"▶️ *Tap to Watch & Play Now:*\n{watch_url}\n\n"
                    f"Enjoy the video! 🎵"
                )
            else:
                reply = data_inner.get("response", "Done.")

        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{reply}</Message></Response>'
        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        webhook_success = False
        print(f"[Twilio WA Error] {e}")
        return Response(content='<Response><Message>Error processing</Message></Response>', media_type="application/xml")
    finally:
        if twilio_evt:
            finalize_webhook_event(db, twilio_evt, success=webhook_success)

# ----------------- Play Store Account Deletion, Routines & Docs Q&A -----------------
@app.delete("/api/account/data")
def delete_account_data(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Permanently deletes all server-side user data (Play Store account/data deletion compliance) (AETH-P0-02)."""
    deleted = {}
    for model_cls, label in [
        (Task, "tasks"),
        (FinancialRecord, "financial_records"),
        (MemoryItem, "memory_vault"),
        (AuditLog, "audit_logs"),
        (PushSubscription, "push_subscriptions"),
        (ScheduledJob, "scheduled_jobs"),
        (ChatSession, "chat_sessions"),
        (ChatMessage, "chat_messages"),
        (TaskDateCompletion, "task_date_completions"),
        (WhatsAppMessage, "whatsapp_messages"),
        (ProcessedMutation, "processed_mutations"),
        (BriefingPreference, "briefing_preferences"),
        (UserIntegrationPairing, "user_integration_pairings"),
        (ChannelPairingChallenge, "channel_pairing_challenges"),
    ]:
        deleted[label] = db.query(model_cls).filter(model_cls.owner_user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"status": "deleted", "owner_user_id": current_user.id, "deleted": deleted}

class RoutineCreateRequest(BaseModel):
    title: str
    schedule_time: str = "21:30"
    prompt: str
    recurrence: str = "daily"

@app.get("/api/routines")
def list_routines(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    jobs = db.query(ScheduledJob).filter(
        tenant_filter(ScheduledJob, current_user),
        ScheduledJob.job_type == "routine"
    ).order_by(ScheduledJob.created_at.desc(), ScheduledJob.id.desc()).limit(100).all()
    results = []
    for j in jobs:
        try:
            payload = json.loads(j.payload_json or "{}")
        except Exception:
            payload = {}
        results.append({
            "id": j.id,
            "title": payload.get("title", "Routine"),
            "schedule_time": payload.get("schedule_time", "21:30"),
            "prompt": payload.get("prompt", ""),
            "recurrence": j.recurrence or "daily",
            "status": j.status,
            "scheduled_at": j.scheduled_at.isoformat() if j.scheduled_at else None
        })
    return results

@app.post("/api/routines")
def create_routine(
    req: RoutineCreateRequest,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    job = ScheduledJob(
        owner_user_id=current_user.id,
        user_email=current_user.email,
        job_type="routine",
        payload_json=json.dumps({
            "title": req.title.strip(),
            "schedule_time": req.schedule_time.strip(),
            "prompt": req.prompt.strip()
        }),
        scheduled_at=now,
        recurrence=req.recurrence.strip() or "daily",
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"status": "created", "id": job.id, "title": req.title.strip()}

@app.delete("/api/routines/{job_id}")
def delete_routine(
    job_id: int,
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    job = db.query(ScheduledJob).filter(
        ScheduledJob.id == job_id,
        tenant_filter(ScheduledJob, current_user),
        ScheduledJob.job_type == "routine"
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Routine not found")
    db.delete(job)
    db.commit()
    return {"status": "deleted", "id": job_id}

class DocumentParseBase64Request(BaseModel):
    filename: str
    base64_data: str

@app.post("/api/documents/parse")
async def parse_document_file(
    file: UploadFile = File(...),
    user_email: Optional[str] = Depends(get_user_email)
):
    """
    Accepts any uploaded document (PDF, DOCX, DOC, TXT, MD, CSV, JSON, RTF, TSV, LOG, etc.)
    and returns extracted clean text, word count, page count, and metadata.
    """
    try:
        content_bytes = await file.read()
        res = extract_text_from_file(file.filename or "document.txt", content_bytes)
        return {
            "success": res.get("success", False),
            "filename": res.get("filename"),
            "extension": res.get("extension"),
            "pages": res.get("pages", 1),
            "word_count": res.get("word_count", 0),
            "character_count": res.get("character_count", 0),
            "text": res.get("text", ""),
            "preview": (res.get("text") or "")[:400],
            "error": res.get("error")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

@app.post("/api/documents/parse-base64")
async def parse_document_base64(
    req: DocumentParseBase64Request,
    user_email: Optional[str] = Depends(get_user_email)
):
    try:
        raw_b64 = req.base64_data
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        content_bytes = base64.b64decode(raw_b64)
        res = extract_text_from_file(req.filename or "document.txt", content_bytes)
        return {
            "success": res.get("success", False),
            "filename": res.get("filename"),
            "extension": res.get("extension"),
            "pages": res.get("pages", 1),
            "word_count": res.get("word_count", 0),
            "character_count": res.get("character_count", 0),
            "text": res.get("text", ""),
            "preview": (res.get("text") or "")[:400],
            "error": res.get("error")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse base64 document: {str(e)}")

class DocsAskRequest(BaseModel):
    question: str
    document_text: str
    api_key: Optional[str] = None
    openai_key: Optional[str] = None

@app.post("/api/docs/ask")
async def ask_personal_document(
    req: DocsAskRequest,
    user_email: Optional[str] = Depends(get_user_email)
):
    """Answers questions grounded in user-supplied document/note text with multi-LLM support."""
    q = req.question.strip()
    doc = req.document_text.strip()
    if not q or not doc:
        raise HTTPException(status_code=400, detail="Both question and document_text are required")

    key = (req.api_key or req.openai_key or os.environ.get("GEMINI_API_KEY", "") or os.environ.get("OPENROUTER_API_KEY", "")).strip()

    doc_context = doc[:28000]
    sys_instruction = (
        "You are Aether's document intelligence specialist. Answer the user's question accurately and concisely based strictly on the provided document text. "
        "Support both English and Hindi. If the answer cannot be found in the document, state that clearly without guessing."
    )
    user_prompt = f"Document Content:\n{doc_context}\n\nUser Question: {q}"

    # 1. OpenRouter / OpenAI Key support
    if key and (key.startswith("sk-") or key.startswith("sk-or-")):
        endpoint = "https://openrouter.ai/api/v1/chat/completions" if key.startswith("sk-or-") else "https://api.openai.com/v1/chat/completions"
        candidate_models = (
            ["google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"]
            if key.startswith("sk-or-")
            else ["gpt-4o-mini", "gpt-3.5-turbo"]
        )
        try:
            async with httpx.AsyncClient(timeout=18.0) as client:
                for mod in candidate_models:
                    try:
                        resp = await client.post(
                            endpoint,
                            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                            json={
                                "model": mod,
                                "messages": [
                                    {"role": "system", "content": sys_instruction},
                                    {"role": "user", "content": user_prompt}
                                ],
                                "temperature": 0.2
                            }
                        )
                        if resp.status_code == 200:
                            ans = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                            if ans:
                                return {"answer": ans, "source": f"llm_{mod}"}
                    except Exception as mod_err:
                        print(f"[Docs Q&A LLM {mod} err] {mod_err}")
        except Exception as e:
            print(f"[Docs Q&A OpenRouter Fallback] {e}")

    # 2. Native Gemini API key support
    if key and not key.startswith("sk-"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            resp = model.generate_content(f"{sys_instruction}\n\n{user_prompt}")
            if resp and getattr(resp, "text", None):
                return {"answer": resp.text.strip(), "source": "gemini"}
        except Exception as e:
            print(f"[Docs Q&A Gemini Fallback] {e}")

    # 3. Deterministic keyword-sentence extractive fallback when offline / no key
    q_words = {w.lower().strip("?.,!") for w in q.split() if len(w) > 2}
    sentences = [s.strip() for s in re.split(r'(?<=[.!?।])\s+|\n+', doc) if s.strip()]
    scored = sorted(
        sentences,
        key=lambda s: sum(1 for w in q_words if w in s.lower()),
        reverse=True
    )
    top_matches = [s for s in scored[:4] if sum(1 for w in q_words if w in s.lower()) > 0]
    answer = " ".join(top_matches) if top_matches else "No matching information found in the provided document."
    return {"answer": answer, "source": "extractive"}

@app.get("/api/digest/weekly")
def get_weekly_digest(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    """Compute the weekly digest with database aggregates, never full-table ORM loads."""
    since = datetime.utcnow() - timedelta(days=7)
    weekly_expense = float(db.query(func.coalesce(func.sum(FinancialRecord.amount), 0.0)).filter(
        tenant_filter(FinancialRecord, current_user),
        FinancialRecord.type == "expense",
        FinancialRecord.date >= since
    ).scalar() or 0.0)
    top_category_row = db.query(
        FinancialRecord.category,
        func.sum(FinancialRecord.amount).label("total")
    ).filter(
        tenant_filter(FinancialRecord, current_user),
        FinancialRecord.type == "expense",
        FinancialRecord.date >= since
    ).group_by(FinancialRecord.category).order_by(func.sum(FinancialRecord.amount).desc()).first()
    top_category = (top_category_row[0] or "general").lower() if top_category_row else "none"

    status_counts = dict(db.query(Task.status, func.count(Task.id)).filter(
        tenant_filter(Task, current_user)
    ).group_by(Task.status).all())
    tasks_completed = int(status_counts.get("completed", 0))
    tasks_pending = sum(int(count) for status, count in status_counts.items() if status != "completed")

    summary = (
        f"Last 7 days: You spent ₹{weekly_expense:,.0f} (top category: {top_category}). "
        f"You have completed {tasks_completed} task(s) with {tasks_pending} pending."
    )
    return {
        "weekly_expense": weekly_expense, "top_category": top_category,
        "tasks_completed": tasks_completed, "tasks_pending": tasks_pending,
        "summary": summary
    }

class ChatStreamRequest(BaseModel):
    prompt: str
    document_text: Optional[str] = None
    api_key: Optional[str] = None

@app.post("/api/chat/stream")
async def stream_chat_response(
    req: ChatStreamRequest,
    user_email: Optional[str] = Depends(get_user_email)
):
    """Streams assistant output over Server-Sent Events (SSE) for real-time typing."""
    from fastapi.responses import StreamingResponse

    async def event_generator():
        q = req.prompt.strip()
        key = (req.api_key or os.environ.get("GEMINI_API_KEY", "")).strip()
        if key and not key.startswith("sk-"):
            try:
                import google.generativeai as genai
                genai.configure(api_key=key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(q, stream=True)
                for chunk in response:
                    text = getattr(chunk, "text", "")
                    if text:
                        yield f"data: {json.dumps({'chunk': text})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
                return
            except Exception as e:
                yield f"data: {json.dumps({'chunk': f'Stream fallback: {str(e)}'})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
                return
        yield f"data: {json.dumps({'chunk': 'Streaming ready. Provide a Gemini API key to stream tokens.'})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ----------------- Social Media Suite Endpoints -----------------
class SocialAdaptRequest(BaseModel):
    content: str
    platforms: Optional[List[str]] = None

def _call_gemini_json_sync(prompt: str) -> dict:
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip()
    if not gemini_key:
        return {}
    models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    for m in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3}
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        raw_text = "".join([p.get("text", "") for p in parts]).strip()
                        if "```json" in raw_text:
                            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                        elif "```" in raw_text:
                            raw_text = raw_text.split("```")[1].split("```")[0].strip()
                        return json.loads(raw_text)
        except Exception:
            continue
    return {}

def _call_gemini_text_sync(prompt: str) -> str:
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip()
    if not gemini_key:
        return ""
    models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    for m in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.4}
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        return "".join([p.get("text", "") for p in parts]).strip()
        except Exception:
            continue
    return ""

@app.post("/api/social/adapt-post")
async def adapt_social_post(
    req: SocialAdaptRequest,
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    base_text = (req.content or "").strip()
    if not base_text:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    prompt = f"""You are Aether's master social media strategist. Adapt the following announcement or thought into tailored posts for 7 distinct social media platforms.

Original Content:
"{base_text}"

Return STRICT JSON with these exact keys:
{{
  "x": "<Short punchy tweet under 260 characters with 2-3 relevant hashtags>",
  "linkedin": "<Professional thought leadership post with compelling hook, whitespace, bullet points if helpful, discussion question, and 3 professional hashtags>",
  "instagram": "<Engaging caption with visual tone, storytelling, emojis, and a block of popular hashtags>",
  "facebook": "<Warm, community-focused update for friends and followers with a call to share thoughts>",
  "telegram": "<Crisp broadcast announcement formatted in Markdown (*bold*, _italic_), with key takeaways and bullet points>",
  "whatsapp": "<Formatted message with *bold* headers and clean layout suited for quick reading>",
  "reddit": "<Thoughtful discussion starter formatted with Markdown, including title idea and community discussion prompt>"
}}"""

    adapted_result = _call_gemini_json_sync(prompt)

    if not adapted_result:
        snippet = base_text[:220]
        adapted_result = {
            "x": f"{snippet}\n\n#update #innovation",
            "linkedin": f"🚀 Key Takeaway:\n\n{base_text}\n\nWhat are your thoughts on this? Let's connect in the comments below.\n\n#growth #leadership #innovation",
            "instagram": f"✨ {base_text}\n\n.\n.\n.\n#explore #trending #dailyupdate #mindset",
            "facebook": f"📢 Quick update with everyone:\n\n{base_text}\n\nWhat do you all think?",
            "telegram": f"⚡ *Aether Broadcast*\n\n{base_text}\n\n🔗 Stay tuned for more!",
            "whatsapp": f"⚡ *Aether Notice*\n\n{base_text}\n\n_Sent via Aether AI_",
            "reddit": f"**Discussion**: {base_text[:80]}...\n\n{base_text}\n\nLooking forward to hearing the community's perspective!"
        }

    return {"status": "success", "adapted": adapted_result}

class YouTubeSummarizeRequest(BaseModel):
    url: str

@app.post("/api/social/youtube-summarize")
async def summarize_youtube_video(
    req: YouTubeSummarizeRequest,
    user_email: Optional[str] = Depends(get_user_email)
):
    url = (req.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="YouTube URL required")

    video_title = "YouTube Video"
    try:
        import urllib.request
        oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(url)}&format=json"
        req_oe = urllib.request.Request(oembed_url, headers={"User-Agent": "Aether/1.0"})
        with urllib.request.urlopen(req_oe, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            video_title = data.get("title", video_title)
    except Exception as e_oe:
        print(f"[YouTube oEmbed Notice] {e_oe}")

    yt_prompt = f"""You are Aether's executive video intelligence agent. The user wants a comprehensive summary of this YouTube video:
URL: {url}
Title: {video_title}

Provide:
1. 📌 Core Thesis (1-2 sentences)
2. 💡 3-5 Key Insights & Takeaways (Bullet points)
3. 🎯 Actionable Advice or Conclusions
4. ⏱️ Recommended target audience

Keep it high-value, crisp, and executive-ready."""

    summary_text = _call_gemini_text_sync(yt_prompt)

    if not summary_text:
        summary_text = f"📌 Core Topic: Analysis of {video_title}\n\n💡 Key Points:\n• High-impact coverage of the subject matter.\n• Actionable workflows and real-world demonstrations.\n• Relevant insights for builders and creators.\n\n🎯 Recommendation: Worth watching for practical techniques."

    return {
        "status": "success",
        "title": video_title,
        "url": url,
        "summary": summary_text
    }

# ----------------- Advanced Social Hub AI Endpoints -----------------
class ViralHookRequest(BaseModel):
    content: str
    platform: Optional[str] = "linkedin"

@app.post("/api/social/viral-hooks")
async def generate_viral_hooks(
    req: ViralHookRequest,
    user_email: Optional[str] = Depends(get_user_email)
):
    base_text = (req.content or "").strip()
    if not base_text:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    prompt = f"""You are Aether's master viral copywriter and retention strategist.
Analyze this social media draft and produce 3 high-converting opening hooks, a viral score (1-10), and viral rationale.

Draft Content:
"{base_text}"

Return STRICT JSON:
{{
  "viral_score": 8.7,
  "score_label": "High Viral Potential 🚀",
  "reason": "<1 sentence explanation on why this topic resonates>",
  "hooks": [
    {{
      "type": "curiosity",
      "label": "🔍 Curiosity Gap",
      "text": "<Hook that sparks curiosity and challenges common beliefs>"
    }},
    {{
      "type": "proof",
      "label": "📊 Data & Proof",
      "text": "<Hook stating concrete results, numbers, or specific lessons>"
    }},
    {{
      "type": "story",
      "label": "📖 Personal Story",
      "text": "<Hook that starts in media res with an authentic emotional or professional moment>"
    }}
  ],
  "best_time": "Tuesday & Thursday 8:30 AM - 10:00 AM IST",
  "hashtags": ["#leadership", "#innovation", "#growth", "#productivity"]
}}"""

    result = _call_gemini_json_sync(prompt)

    if not result or not result.get("hooks"):
        first_few = base_text[:60]
        result = {
            "viral_score": 8.4,
            "score_label": "Strong Potential ⚡",
            "reason": "Clear professional focus with high community resonance.",
            "hooks": [
                {
                    "type": "curiosity",
                    "label": "🔍 Curiosity Gap",
                    "text": f"Most people approach this the hard way. Here is what actually worked for {first_few}:"
                },
                {
                    "type": "proof",
                    "label": "📊 Data & Proof",
                    "text": f"3 key rules that 10x'd our output when working on {first_few}:"
                },
                {
                    "type": "story",
                    "label": "📖 Personal Story",
                    "text": f"6 months ago, I was completely stuck on this. Here is the mental shift that changed everything:"
                }
            ],
            "best_time": "Weekdays 8:30 AM - 11:00 AM IST",
            "hashtags": ["#growth", "#mindset", "#productivity", "#leadership"]
        }

    return {"status": "success", "analysis": result}


@app.get("/api/social/ghostwriter-thought")
async def get_ghostwriter_thought(
    niche: Optional[str] = "tech_leadership",
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    recent_tasks = db.query(Task).filter(tenant_filter(Task, current_user)).order_by(Task.created_at.desc()).limit(3).all()
    task_context = ", ".join([t.title for t in recent_tasks]) if recent_tasks else "building intelligent autonomous software systems"

    prompt = f"""You are Aether's Executive Ghostwriter for modern founders, developers, and operators.
Create 1 high-impact thought for today.
Context/Interests: {task_context}
Niche: {niche}

Return STRICT JSON:
{{
  "topic": "<Short title of thought, e.g. The compounding effect of small systems>",
  "hook": "<Punchy opening line>",
  "thought_body": "<Crisp 3-4 sentence insight with whitespace and actionable takeaway>",
  "linkedin_post": "<Full ready-to-post LinkedIn update with hook, body, takeaway, question, and 3 hashtags>",
  "tweet": "<Punchy tweet under 240 chars with 2 hashtags>",
  "category": "Mindset & Execution"
}}"""

    thought_result = _call_gemini_json_sync(prompt)

    if not thought_result:
        thought_result = {
            "topic": "Systems Over Motivation",
            "hook": "Motivation gets you started. Automated systems keep you going.",
            "thought_body": "The biggest difference between overwhelmed operators and calm leaders isn't talent—it's having workflows that run predictably even on low-energy days. Simplify your daily inputs and protect your cognitive bandwidth.",
            "linkedin_post": "Motivation gets you started. Automated systems keep you going.\n\nThe biggest difference between overwhelmed operators and calm leaders isn't talent—it's having workflows that run predictably even on low-energy days.\n\n3 rules I follow:\n1. Automate repetitive captures immediately.\n2. Keep active priorities to under 3 per day.\n3. Protect uninterrupted focus hours.\n\nWhat systems keep you focused? Let's connect below.\n\n#leadership #productivity #systems",
            "tweet": "Motivation gets you started. Automated systems keep you going. Protect your cognitive bandwidth by building predictable routines. ⚡ #mindset #leadership",
            "category": "Execution"
        }

    return {"status": "success", "thought": thought_result}


class VideoRepurposeRequest(BaseModel):
    title: str
    summary: str

@app.post("/api/social/repurpose-video")
async def repurpose_video_content(
    req: VideoRepurposeRequest,
    user_email: Optional[str] = Depends(get_user_email)
):
    title = (req.title or "Video Insights").strip()
    summary = (req.summary or "").strip()
    if not summary:
        raise HTTPException(status_code=400, detail="Summary required")

    prompt = f"""You are Aether's content repurposing master.
Take this video summary and convert it into:
1. A 5-tweet viral Twitter thread (labeled 1/5 through 5/5)
2. A 30-second Short/Reel voiceover script (Hook, Body, Call to Action)

Title: {title}
Summary: {summary}

Return STRICT JSON:
{{
  "thread": [
    "1/5: <Hook tweet>",
    "2/5: <Key point 1>",
    "3/5: <Key point 2>",
    "4/5: <Key point 3>",
    "5/5: <Takeaway and Retweet request>"
  ],
  "reel_script": {{
    "hook": "<0-3s attention grabber>",
    "body": "<4-24s fast-paced value point>",
    "cta": "<25-30s follow / share call to action>"
  }}
}}"""

    result = _call_gemini_json_sync(prompt)

    if not result:
        result = {
            "thread": [
                f"1/5: Most people miss the real lesson behind « {title[:50]} ». Here's the executive breakdown: 🧵👇",
                "2/5: Lesson 1: Execution speed matters far more than theoretical perfection.",
                "3/5: Lesson 2: Automate low-leverage tasks so you can focus on high-impact strategy.",
                "4/5: Lesson 3: Consistency compounds over 6-12 months into undeniable results.",
                "5/5: That's the breakdown! If you found this valuable, follow @Aether for daily executive AI workflows. 🔄"
            ],
            "reel_script": {
                "hook": f"Stop scrolling if you want to understand « {title[:45]} » in under 30 seconds.",
                "body": "Here are the top 3 takeaways: First, simplify your approach. Second, build repeatable systems. Third, track your metrics weekly.",
                "cta": "Double tap if this resonates and save this reel for later!"
            }
        }

    return {"status": "success", "repurposed": result}


class SocialEngagementTrackRequest(BaseModel):
    title: str
    content: str
    platform: str
    likes: Optional[int] = 0
    comments: Optional[int] = 0
    views: Optional[int] = 0
    top_comment: Optional[str] = None
    url: Optional[str] = None

@app.get("/api/social/engagement")
def get_social_engagement_posts(
    current_user: UserIdentity = Depends(get_current_user_identity),
    db: Session = Depends(get_db)
):
    items = db.query(MemoryItem).filter(
        tenant_filter(MemoryItem, current_user),
        MemoryItem.category == "social_post_engagement"
    ).order_by(MemoryItem.created_at.desc()).limit(20).all()

    posts = []
    for item in items:
        try:
            data = json.loads(item.fact)
            data["id"] = item.id
            data["created_at"] = item.created_at.isoformat() if item.created_at else None
            posts.append(data)
        except Exception:
            continue

    if not posts:
        # Default realistic seed posts for first-time onboarding
        posts = [
            {
                "id": "seed-1",
                "title": "Autonomous AI Assistants in 2026",
                "platform": "linkedin",
                "likes": 142,
                "comments": 28,
                "views": 4820,
                "top_comment": "Loved the breakdown on local memory vs cloud latency! Very practical.",
                "url": "https://linkedin.com",
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": "seed-2",
                "title": "5 Workflows that saved 10h/week",
                "platform": "x",
                "likes": 89,
                "comments": 14,
                "views": 2910,
                "top_comment": "Thread bookmarking this right now 🔥",
                "url": "https://x.com",
                "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()
            },
            {
                "id": "seed-3",
                "title": "Aether Executive Core Launch Update",
                "platform": "telegram",
                "likes": 64,
                "comments": 9,
                "views": 1150,
                "top_comment": "Smooth release! Really enjoying the live voice talk.",
                "url": "https://t.me",
                "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
            }
        ]

    return {"status": "success", "posts": posts}

@app.post("/api/social/engagement/track")
def track_social_engagement_post(
    req: SocialEngagementTrackRequest,
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    eff_email = get_effective_email(user_email) or DEFAULT_OWNER_EMAIL
    post_payload = {
        "title": req.title.strip()[:100],
        "content": req.content.strip()[:400],
        "platform": req.platform.lower(),
        "likes": req.likes or 0,
        "comments": req.comments or 0,
        "views": req.views or 0,
        "top_comment": req.top_comment or "Great insight!",
        "url": req.url or ""
    }
    item = MemoryItem(
        user_email=eff_email,
        category="social_post_engagement",
        fact=json.dumps(post_payload),
        confidence=1.0
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"status": "success", "id": item.id, "post": post_payload}

# ----------------- Static Frontend Hosting (Single-Service Cloud Deployment) -----------------
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "desktop", "dist")
if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            if "assets/" in full_path:
                return FileResponse(file_path, headers={"Cache-Control": "public, max-age=31536000, immutable"})
            return FileResponse(file_path)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(
                index_file,
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        return {"message": "Aether Executive Core API running. Build frontend for UI."}
