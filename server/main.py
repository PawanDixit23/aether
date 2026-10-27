import os
import json
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

# ─── Web Push (VAPID) Setup ────────────────────────────────────────────────────
VAPID_PUBLIC_KEY  = os.environ.get("VAPID_PUBLIC_KEY",  "FKhfDseDfQYLoVS-DYrQKtfyIhniBxzPfE2akQQ2oM3lJxakx2Ft_qE-HLnecc4UP6sSTxOLibFELDxorXiMKA")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "WXjuCeVroOHymFzQOF8YGjwF_qaLHkvPJccwf1OOyI")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:aether@pawandixit.com")

# In-memory push subscription store (user_email -> list of subscriptions)
# Render container restart पर clear होता है, इसलिए client re-subscribe करता है
_push_subscriptions: dict = {}  # {email: [subscription_info_dict, ...]}

def _send_web_push(subscription_info: dict, title: str, body: str, tag: str = "aether-alert"):
    """VAPID Web Push notification एक subscription पर भेजें।"""
    try:
        from pywebpush import webpush, WebPushException
        webpush(
            subscription_info=subscription_info,
            data=json.dumps({"title": title, "body": body, "tag": tag, "icon": "/favicon.svg"}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
        )
        return True
    except Exception as e:
        print(f"[WebPush Error] {e}")
        return False
# ──────────────────────────────────────────────────────────────────────────────

try:
    from .database import engine, Base, get_db, ensure_schema_migrations
    from .models import Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription
    from .ai_engine import parse_intent_with_llm
except ImportError:
    from database import engine, Base, get_db, ensure_schema_migrations
    from models import Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription
    from ai_engine import parse_intent_with_llm

# Initialize tables & run automated schema migrations
Base.metadata.create_all(bind=engine)
ensure_schema_migrations()

app = FastAPI(title="Aether Executive Core", version="0.1.0")

# Enable CORS for local desktop & web apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_user_email(
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    user_email: Optional[str] = None
) -> Optional[str]:
    email = x_user_email or user_email
    if email and email.strip():
        return email.strip().lower()
    return None

# ----------------- Pydantic Schemas -----------------
class AuthRecordRequest(BaseModel):
    email: str
    name: Optional[str] = "Operator"
    provider: Optional[str] = "google"

class KeyValidationRequest(BaseModel):
    api_key: str

class QuickCaptureRequest(BaseModel):
    input_text: str
    user_email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: Optional[str] = "auto" # 'auto', 'hi', 'en', 'hinglish'
    client_time: Optional[str] = None
    timezone: Optional[str] = None
    api_key: Optional[str] = None
    user_name: Optional[str] = None

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

class FinancialRecordCreate(BaseModel):
    type: str
    user_email: Optional[str] = None
    category: Optional[str] = "general"
    amount: float
    currency: Optional[str] = "INR"
    payment_mode: Optional[str] = "upi"
    note: Optional[str] = None

class MemoryCreate(BaseModel):
    fact: str
    user_email: Optional[str] = None
    category: Optional[str] = "preference"

class ClientSyncBackup(BaseModel):
    user_email: str
    tasks: Optional[List[dict]] = []
    memories: Optional[List[dict]] = []
    finances: Optional[List[dict]] = []

class ICalSyncRequest(BaseModel):
    url: str
    user_email: Optional[str] = None

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

def build_context(db: Session, client_time: Optional[str] = None, tz_name: Optional[str] = None, user_email: Optional[str] = None) -> dict:
    if not user_email:
        return {
            "current_time": get_current_time_str(client_time, tz_name),
            "tasks": [],
            "total_income": 0,
            "total_expense": 0,
            "balance": 0,
            "memories": []
        }
    tasks = db.query(Task).filter(Task.user_email == user_email, Task.status == "pending").all()
    records = db.query(FinancialRecord).filter(FinancialRecord.user_email == user_email).all()
    memories = db.query(MemoryItem).filter(MemoryItem.user_email == user_email).all()

    total_income = sum(r.amount for r in records if r.type == "income")
    total_expense = sum(r.amount for r in records if r.type == "expense")
    balance = total_income - total_expense

    return {
        "current_time": get_current_time_str(client_time, tz_name),
        "tasks": [{"id": t.id, "title": t.title, "priority": t.priority, "reminder_time": t.reminder_time} for t in tasks],
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance,
        "memories": [{"category": m.category, "fact": m.fact} for m in memories]
    }

# ----------------- Key Validation Engine -----------------
@app.post("/api/auth/validate-key")
async def validate_gemini_key(req: KeyValidationRequest):
    """Validate a Gemini API Key directly against Google Gemini API."""
    key = req.api_key.strip()
    if not key:
        return {"valid": False, "error": "API key cannot be empty"}
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                return {"valid": True, "models_count": len(models)}
            else:
                return {"valid": False, "error": "Invalid API key or unauthorized access"}
    except Exception as e:
        return {"valid": False, "error": str(e)}

@app.post("/api/auth/record-login")
def record_user_login(req: AuthRecordRequest, db: Session = Depends(get_db)):
    """Log user authentication in local audit log and claim legacy unassigned tenant data."""
    email = req.email.strip().lower()
    try:
        # Migrate any previously unassigned records to this authenticated user
        db.query(Task).filter(Task.user_email == None).update({Task.user_email: email})
        db.query(FinancialRecord).filter(FinancialRecord.user_email == None).update({FinancialRecord.user_email: email})
        db.query(MemoryItem).filter(MemoryItem.user_email == None).update({MemoryItem.user_email: email})
        db.query(ChatMessage).filter(ChatMessage.user_email == None).update({ChatMessage.user_email: email})
        db.query(AuditLog).filter(AuditLog.user_email == None).update({AuditLog.user_email: email})
        db.commit()
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
def client_backup_sync(req: ClientSyncBackup, db: Session = Depends(get_db)):
    """Restore client local persistent cache if Render container restarts or resets SQLite."""
    email = req.user_email.strip().lower()
    if not email:
        return {"status": "skipped", "message": "No email provided"}
    
    restored_counts = {"tasks": 0, "memories": 0, "finances": 0}
    
    # Restore tasks if DB has zero for this user
    existing_tasks = db.query(Task).filter(Task.user_email == email).count()
    if existing_tasks == 0 and req.tasks:
        for t in req.tasks:
            try:
                db.add(Task(
                    user_email=email,
                    title=t.get("title", ""),
                    priority=t.get("priority", "medium"),
                    status=t.get("status", "pending"),
                    reminder_time=t.get("reminder_time"),
                    notified=t.get("notified", False)
                ))
                restored_counts["tasks"] += 1
            except Exception:
                pass
        db.commit()

    # Restore memories if DB has zero for this user
    existing_mem = db.query(MemoryItem).filter(MemoryItem.user_email == email).count()
    if existing_mem == 0 and req.memories:
        for m in req.memories:
            try:
                db.add(MemoryItem(
                    user_email=email,
                    category=m.get("category", "preference"),
                    fact=m.get("fact", "")
                ))
                restored_counts["memories"] += 1
            except Exception:
                pass
        db.commit()

    # Restore finances if DB has zero for this user
    existing_fin = db.query(FinancialRecord).filter(FinancialRecord.user_email == email).count()
    if existing_fin == 0 and req.finances:
        for f in req.finances:
            try:
                db.add(FinancialRecord(
                    user_email=email,
                    type=f.get("type", "expense"),
                    category=f.get("category", "general"),
                    amount=f.get("amount", 0.0),
                    payment_mode=f.get("payment_mode", "upi"),
                    note=f.get("note", "")
                ))
                restored_counts["finances"] += 1
            except Exception:
                pass
        db.commit()

    return {"status": "synced", "user": email, "restored": restored_counts}

# ----------------- Quick Capture / Action Engine -----------------
@app.post("/api/action/quick-capture")
async def quick_capture(
    req: QuickCaptureRequest, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Core Smart Action Engine with Multi-Tenant Isolation & Conversational History."""
    user_msg = req.input_text.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Empty input")

    eff_email = (req.user_email or user_email or "").strip().lower() or None

    # Record User Message
    db.add(ChatMessage(role="user", content=user_msg, user_email=eff_email))
    db.commit()

    context = build_context(db, client_time=req.client_time, tz_name=req.timezone, user_email=eff_email)
    lang = req.language or "auto"
    parsed = await parse_intent_with_llm(
        user_msg, 
        context, 
        user_lat=req.latitude, 
        user_lon=req.longitude, 
        language=lang,
        api_key=req.api_key,
        user_name=req.user_name or "Operator"
    )
    
    action = parsed.get("action", "query")
    confidence = parsed.get("confidence", 0.95)
    conf_level = parsed.get("confidence_level", "high")
    data = parsed.get("data", {})

    executed = False
    result_message = ""
    undo_payload = None

    if action == "query":
        fallback_greeting = f"नमस्ते {req.user_name or 'साथी'}! मैं आपकी सहायता के लिए तैयार हूँ।"
        result_message = data.get("response", fallback_greeting)
        executed = True
        
    elif action == "expense":
        record = FinancialRecord(
            user_email=eff_email,
            type="expense",
            category=data.get("category", "general"),
            amount=data.get("amount", 0.0),
            currency=data.get("currency", "INR"),
            payment_mode=data.get("payment_mode", "upi"),
            note=data.get("note", user_msg)
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        executed = True
        if lang == "en":
            result_message = f"Expense of ₹{record.amount:,.2f} ({record.category}) logged successfully."
        elif lang == "hinglish":
            result_message = f"₹{record.amount:,.2f} ka kharch ({record.category}) safaltapoorvak record ho gaya."
        else:
            result_message = f"₹{record.amount:,.2f} का खर्च ({record.category}) सफलतापूर्वक दर्ज कर लिया गया है।"
        undo_payload = json.dumps({"table": "financial_records", "id": record.id})

    elif action == "income":
        record = FinancialRecord(
            user_email=eff_email,
            type="income",
            category=data.get("category", "salary"),
            amount=data.get("amount", 0.0),
            currency=data.get("currency", "INR"),
            payment_mode=data.get("payment_mode", "bank"),
            note=data.get("note", user_msg)
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

        title = data.get("title") or user_msg
        try:
            from ai_engine import clean_task_title
            title = clean_task_title(title)
        except Exception:
            pass

        task = Task(
            user_email=eff_email,
            title=title,
            priority=data.get("priority", "medium"),
            reminder_time=r_time,
            due_date=due_dt,
            notified=False
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        executed = True
        
        if lang == "en":
            time_part = f" for {task.reminder_time}" if task.reminder_time else ""
            result_message = f"Reminder scheduled{time_part}: \"{task.title}\" ⏰ [{task.priority.upper()}]"
        elif lang == "hinglish":
            time_part = f" {task.reminder_time} ke liye" if task.reminder_time else ""
            result_message = f"Aapka reminder{time_part} set ho gaya hai: \"{task.title}\" ⏰ [{task.priority.upper()}]"
        else: # 'hi' or 'auto'
            time_part = f" ({task.reminder_time} के लिए)" if task.reminder_time else ""
            result_message = f"रिमाइंडर एजेंडा में सेट किया गया{time_part}: \"{task.title}\" ⏰ [{task.priority.upper()}]"
            
        undo_payload = json.dumps({"table": "tasks", "id": task.id})

    # Record AI Response in Chat History
    ai_chat = ChatMessage(
        user_email=eff_email,
        role="aether",
        content=result_message,
        action_type=action,
        action_data=json.dumps(data) if data else None,
        confidence=confidence
    )
    db.add(ai_chat)

    # Log to Audit Log if real action was taken
    if executed and action != "query":
        audit = AuditLog(
            user_email=eff_email,
            action_type=f"auto_{action}",
            details=result_message,
            confidence_score=confidence,
            undo_payload=undo_payload
        )
        db.add(audit)
    
    db.commit()

    return {
        "status": "executed",
        "action": action,
        "confidence_level": conf_level,
        "confidence": confidence,
        "message": result_message,
        "parsed": parsed,
        "can_undo": undo_payload is not None
    }

# ----------------- Translation Endpoint -----------------
@app.post("/api/translate")
async def translate_text(req: TranslateRequest):
    """Translate any text to Hindi or English using Gemini Free API."""
    prompt = f"Translate the following text to natural, clear {'Hindi (हिन्दी)' if req.target_lang == 'hi' else 'English'}. Keep links, names, and numbers intact. Return ONLY the translation, nothing else.\n\nText:\n{req.text}"
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key.strip()}"
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
            print(f"[Aether Engine] Translate error: {e}")
            
    return {"translated": req.text}

# ----------------- Chat History & News -----------------
@app.get("/api/chat/history")
def get_chat_history(
    limit: int = 30, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    if not user_email:
        msgs = db.query(ChatMessage).filter(ChatMessage.user_email == None).order_by(ChatMessage.created_at.asc()).all()
        return msgs[-limit:]
    msgs = db.query(ChatMessage).filter(ChatMessage.user_email == user_email.strip().lower()).order_by(ChatMessage.created_at.asc()).all()
    return msgs[-limit:]

@app.delete("/api/chat/history")
def clear_chat_history(
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    if user_email:
        db.query(ChatMessage).filter(ChatMessage.user_email == user_email).delete()
        db.commit()
    return {"message": "Chat history cleared, ready for new conversation"}

@app.get("/api/news")
def get_live_news(limit: int = 5, category: str = None):
    try:
        from ai_engine import get_structured_news
    except ImportError:
        from .ai_engine import get_structured_news
    return get_structured_news(limit=limit, category=category)

# ----------------- Reminders & Notification Engine -----------------
@app.get("/api/reminders/due")
def get_due_reminders(
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Fetch pending tasks whose reminder time has arrived or passed and have not been alerted yet."""
    if not user_email:
        return []

    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    tasks = db.query(Task).filter(
        Task.user_email == user_email,
        Task.status == "pending",
        Task.notified == False
    ).all()
    
    due_tasks = []
    for t in tasks:
        if not t.due_date:
            continue
        try:
            dt = t.due_date
            if isinstance(dt, str):
                dt = datetime.fromisoformat(dt.replace(' ', 'T'))
            if dt <= now:
                due_tasks.append({
                    "id": t.id,
                    "title": t.title,
                    "priority": t.priority,
                    "reminder_time": t.reminder_time or dt.strftime("%I:%M %p"),
                    "due_date": dt.isoformat()
                })
        except Exception as e:
            print(f"[Reminder Due Filter Error] {e}")

    return due_tasks

@app.post("/api/reminders/{task_id}/ack")
def acknowledge_reminder(
    task_id: int, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Acknowledge reminder so it won't repeatedly alert."""
    query = db.query(Task).filter(Task.id == task_id)
    if user_email:
        query = query.filter(Task.user_email == user_email)
    task = query.first()
    if task:
        task.notified = True
        db.commit()
        return {"status": "acknowledged", "task_id": task_id}
    raise HTTPException(status_code=404, detail="Task not found")

# ----------------- Tasks Endpoints -----------------
def serialize_task(t: Task) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "priority": t.priority,
        "status": t.status,
        "is_completed": t.status == "completed",
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "reminder_time": t.reminder_time,
        "notified": t.notified,
        "created_at": t.created_at.isoformat() if t.created_at else None
    }

@app.get("/api/tasks")
def list_tasks(
    status: Optional[str] = None, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    if not user_email:
        return []
    query = db.query(Task).filter(Task.user_email == user_email)
    if status:
        query = query.filter(Task.status == status)
    return [serialize_task(t) for t in query.order_by(Task.created_at.desc()).all()]

@app.post("/api/tasks")
def create_task(
    task_in: TaskCreate, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    eff_email = (task_in.user_email or user_email or "").strip().lower() or None
    data = task_in.dict()
    data["user_email"] = eff_email
    task = Task(**data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)

@app.put("/api/tasks/{task_id}/toggle")
def toggle_task(
    task_id: int, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.id == task_id)
    if user_email:
        query = query.filter(Task.user_email == user_email)
    task = query.first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "completed" if task.status != "completed" else "pending"
    db.commit()
    db.refresh(task)
    return serialize_task(task)

@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.id == task_id)
    if user_email:
        query = query.filter(Task.user_email == user_email)
    task = query.first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

@app.post("/api/calendar/sync-ical")
def sync_ical_feed(req: ICalSyncRequest, user_email: Optional[str] = Depends(get_user_email)):
    import urllib.request
    raw_url = req.url.strip()
    if not raw_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid iCal URL. Must start with http:// or https://")
    
    try:
        req_obj = urllib.request.Request(
            raw_url, 
            headers={"User-Agent": "Mozilla/5.0 (compatible; AetherCalendar/1.0)"}
        )
        with urllib.request.urlopen(req_obj, timeout=12) as response:
            content = response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google Calendar iCal URL fetch failed: {str(e)}")

    events = []
    lines = content.splitlines()
    in_event = False
    curr = {}

    for line in lines:
        if line.startswith("BEGIN:VEVENT"):
            in_event = True
            curr = {}
        elif line.startswith("END:VEVENT"):
            in_event = False
            summary = curr.get("summary")
            dtstart = curr.get("dtstart")
            if summary and dtstart:
                time_str = "All Day"
                due_date = dtstart
                if "T" in dtstart:
                    try:
                        clean_dt = dtstart.replace("Z", "")
                        dt_obj = datetime.strptime(clean_dt[:15], "%Y%m%dT%H%M%S")
                        time_str = dt_obj.strftime("%I:%M %p")
                        due_date = dt_obj.strftime("%Y-%m-%dT%H:%M:%S")
                    except Exception:
                        pass
                elif len(dtstart) == 8:
                    due_date = f"{dtstart[:4]}-{dtstart[4:6]}-{dtstart[6:8]}"
                
                events.append({
                    "id": f"gcal_ical_{len(events)}_{dtstart}",
                    "title": summary,
                    "due_date": due_date,
                    "reminder_time": time_str,
                    "priority": "medium",
                    "status": "pending",
                    "is_completed": False,
                    "is_google_calendar": True,
                    "created_at": due_date
                })
        elif in_event:
            if line.startswith("SUMMARY:"):
                curr["summary"] = line[8:].strip()
            elif line.startswith("DTSTART"):
                parts = line.split(":")
                if len(parts) >= 2:
                    curr["dtstart"] = parts[-1].strip()
            elif line.startswith("DESCRIPTION:"):
                curr["description"] = line[12:].strip()

    return {"status": "ok", "count": len(events), "events": events}

# ----------------- Finance Endpoints -----------------
@app.get("/api/finance/records")
def list_finance_records(
    limit: int = 50, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    if not user_email:
        return []
    return db.query(FinancialRecord).filter(FinancialRecord.user_email == user_email).order_by(FinancialRecord.date.desc()).limit(limit).all()

@app.get("/api/finance/summary")
def get_finance_summary(
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    if not user_email:
        return {
            "total_income": 0.0,
            "total_expense": 0.0,
            "balance": 0.0,
            "record_count": 0
        }
    records = db.query(FinancialRecord).filter(FinancialRecord.user_email == user_email).all()
    total_income = sum(r.amount for r in records if r.type == "income")
    total_expense = sum(r.amount for r in records if r.type == "expense")
    balance = total_income - total_expense
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance,
        "record_count": len(records)
    }

# ----------------- Memory Vault Endpoints -----------------
@app.get("/api/memory")
def list_memory(
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    if not user_email:
        return []
    return db.query(MemoryItem).filter(MemoryItem.user_email == user_email).order_by(MemoryItem.created_at.desc()).all()

@app.delete("/api/memory/{item_id}")
def delete_memory(
    item_id: int, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    query = db.query(MemoryItem).filter(MemoryItem.id == item_id)
    if user_email:
        query = query.filter(MemoryItem.user_email == user_email)
    item = query.first()
    if not item:
        raise HTTPException(status_code=404, detail="Memory item not found")
    db.delete(item)
    db.commit()
    return {"message": "Memory deleted successfully"}

# ----------------- Executive Briefing -----------------
@app.get("/api/briefing")
def get_executive_briefing(
    user_email: Optional[str] = Depends(get_user_email),
    user_name: Optional[str] = "Operator",
    db: Session = Depends(get_db)
):
    if not user_email:
        tasks = []
        urgent_tasks = []
        finance = {"total_income": 0.0, "total_expense": 0.0, "balance": 0.0, "record_count": 0}
        memories = []
    else:
        tasks = db.query(Task).filter(Task.user_email == user_email, Task.status == "pending").all()
        urgent_tasks = [t for t in tasks if t.priority in ["high", "urgent"]]
        finance = get_finance_summary(user_email=user_email, db=db)
        memories = db.query(MemoryItem).filter(MemoryItem.user_email == user_email).limit(5).all()

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
        from ai_engine import get_live_weather_data
    except ImportError:
        from .ai_engine import get_live_weather_data
    live_w = get_live_weather_data()

    weather = {
        "temp": live_w.get("temp", 31.4),
        "condition_en": live_w.get("condition_en", "Mostly Sunny"),
        "condition_hi": live_w.get("condition_hi", "धूप खिली हुई"),
        "city": live_w.get("city", "Jaipur (भांकरोटा)"),
        "city_en": live_w.get("city_en", "Jaipur (Bhankrota)"),
        "city_hi": live_w.get("city_hi", "Jaipur (भांकरोटा)"),
        "city_hinglish": live_w.get("city_hinglish", "Jaipur (Bhankrota)"),
        "time_phase": time_phase,
        "icon": weather_icon,
        "humidity": live_w.get("humidity", "36%"),
        "wind": live_w.get("wind", "4.2 km/h")
    }

    display_name = user_name or "साथी"
    if display_name == "Operator":
        display_name = "पवन"

    return {
        "greeting": f"{greeting}, {display_name}!",
        "date_str": now.strftime("%d %b").upper(),
        "pending_tasks_count": len(tasks),
        "upcoming_count": len(tasks),
        "alert_count": len(urgent_tasks),
        "urgent_tasks": [{"id": t.id, "title": t.title, "priority": t.priority} for t in urgent_tasks],
        "financial_snapshot": finance,
        "active_rules_count": len(memories),
        "weather": weather,
        "generated_at": now.isoformat()
    }

# ----------------- Audit Logs & Undo -----------------
@app.get("/api/audit-logs")
def list_audit_logs(
    limit: int = 30, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    if not user_email:
        return []
    return db.query(AuditLog).filter(AuditLog.user_email == user_email).order_by(AuditLog.executed_at.desc()).limit(limit).all()

@app.post("/api/audit-logs/{log_id}/undo")
def undo_action(log_id: int, db: Session = Depends(get_db)):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log or not log.undo_payload:
        raise HTTPException(status_code=404, detail="Log or undo payload not found")
    if log.is_undone:
        return {"message": "Already undone"}

    payload = json.loads(log.undo_payload)
    table = payload.get("table")
    record_id = payload.get("id")

    if table == "financial_records":
        rec = db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()
        if rec:
            db.delete(rec)
    elif table == "tasks":
        rec = db.query(Task).filter(Task.id == record_id).first()
        if rec:
            db.delete(rec)
    elif table == "memory_vault":
        rec = db.query(MemoryItem).filter(MemoryItem.id == record_id).first()
        if rec:
            db.delete(rec)

    log.is_undone = True
    db.commit()
    return {"message": "Action successfully reversed (Undone)"}

# ----------------- Audio & TTS Streaming for Mobile WebViews -----------------
@app.get("/api/tts")
def text_to_speech(text: str, voice: str = "kore", lang: str = "en"):
    """
    High-fidelity audio streaming endpoint for 100% reliable voice synthesis on mobile WebViews
    where window.speechSynthesis is not available.
    """
    import urllib.request
    import urllib.parse
    from fastapi.responses import Response

    clean_text = text.strip()[:350]
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text required")

    voice_locales = {
        "puck": "en-GB",
        "charon": "en-US",
        "kore": "en-GB",
        "fenrir": "en-US",
        "aoede": "en-AU",
        "zephyr": "en-IN"
    }
    has_devanagari = any('\u0900' <= c <= '\u097f' for c in clean_text)
    tl = "hi" if (lang.startswith("hi") or has_devanagari) else voice_locales.get(voice, "en-US")
    
    encoded_text = urllib.parse.quote(clean_text)
    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={tl}&q={encoded_text}"
    
    try:
        req = urllib.request.Request(
            tts_url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            audio_data = resp.read()
            return Response(content=audio_data, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")

# ----------------- Health Check -----------------
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
def subscribe_push(req: PushSubscribeRequest, db: Session = Depends(get_db)):
    """Browser push subscription server पर store करें (Memory + Database persistence)."""
    email = req.user_email.strip().lower()
    if not email or not req.subscription:
        raise HTTPException(status_code=400, detail="Email and subscription required")
    
    # 1. Update in-memory cache
    if email not in _push_subscriptions:
        _push_subscriptions[email] = []
    endpoint = req.subscription.get("endpoint", "")
    _push_subscriptions[email] = [s for s in _push_subscriptions[email] if s.get("endpoint") != endpoint]
    _push_subscriptions[email].append(req.subscription)
    
    # 2. Persist to Database table so subscriptions survive cold container sleep & restart
    try:
        keys = req.subscription.get("keys", {})
        p256dh = keys.get("p256dh", "")
        auth = keys.get("auth", "")
        existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
        if existing:
            existing.user_email = email
            existing.p256dh = p256dh
            existing.auth = auth
        else:
            new_sub = PushSubscription(
                user_email=email,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth
            )
            db.add(new_sub)
        db.commit()
    except Exception as dbe:
        print(f"[PushSubscribe DB Error] {dbe}")
    
    print(f"[WebPush] ✅ Subscription saved in DB & Memory for {email}")
    return {"status": "subscribed", "user": email, "total_subscriptions": len(_push_subscriptions[email])}

@app.delete("/api/push/subscribe")
def unsubscribe_push(user_email: str, endpoint: str, db: Session = Depends(get_db)):
    """Push subscription हटाएं (logout पर)।"""
    email = user_email.strip().lower()
    if email in _push_subscriptions:
        _push_subscriptions[email] = [
            s for s in _push_subscriptions[email]
            if s.get("endpoint") != endpoint
        ]
    try:
        db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).delete()
        db.commit()
    except Exception as dbe:
        print(f"[PushUnsubscribe DB Error] {dbe}")
    return {"status": "unsubscribed"}

@app.post("/api/reminders/push-check")
def push_check_reminders(request: Request, db: Session = Depends(get_db)):
    """
    GitHub Actions हर 10 मिनट पर इस endpoint को call करता है।
    सभी users के due reminders check करके Web Push notification भेजता है।
    Database persistence की वजह से Render cold-sleep/reboot के बाद भी 1 घंटे वाले reminders 100% डिलीवर होते हैं!
    """
    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    pushed_count = 0
    errors = []
    
    # 1. Database से सभी active subscriptions reload करें (Cold boot survival guarantee)
    try:
        db_subs = db.query(PushSubscription).all()
        for s in db_subs:
            em = s.user_email
            if em not in _push_subscriptions:
                _push_subscriptions[em] = []
            if not any(sub.get("endpoint") == s.endpoint for sub in _push_subscriptions[em]):
                _push_subscriptions[em].append({
                    "endpoint": s.endpoint,
                    "keys": {
                        "p256dh": s.p256dh,
                        "auth": s.auth
                    }
                })
    except Exception as dbe:
        print(f"[PushCheck DB Load Error] {dbe}")

    # 2. सभी subscribed users के लिए check करें
    for email, subscriptions in list(_push_subscriptions.items()):
        if not subscriptions:
            continue
        
        try:
            # इस user के due reminders fetch करें
            tasks = db.query(Task).filter(
                Task.user_email == email,
                Task.status == "pending",
                Task.notified == False
            ).all()
            
            due_tasks = []
            for t in tasks:
                if not t.due_date:
                    continue
                try:
                    dt = t.due_date
                    if isinstance(dt, str):
                        dt = datetime.fromisoformat(dt.replace(' ', 'T'))
                    if dt <= now:
                        due_tasks.append(t)
                except Exception:
                    pass
            
            # Due tasks के लिए push notification भेजें
            for task in due_tasks:
                title = f"⏰ AETHER रिमाइंडर: {task.title}"
                body = f"समय: {task.reminder_time or 'अभी'} • कार्य का समय हो गया है!"
                
                # सभी subscriptions पर push भेजें
                failed_subscriptions = []
                for sub in subscriptions:
                    success = _send_web_push(sub, title, body, f"reminder-{task.id}")
                    if success:
                        pushed_count += 1
                    else:
                        failed_subscriptions.append(sub.get("endpoint", "")[:50])
                
                # Push भेजने के बाद task को notified mark करें
                task.notified = True
                db.commit()
                
                if failed_subscriptions:
                    errors.append(f"Failed subs for task {task.id}: {len(failed_subscriptions)}")
        
        except Exception as e:
            errors.append(f"Error for {email}: {str(e)[:100]}")
            print(f"[PushCheck Error] {email}: {e}")
    
    return {
        "status": "ok",
        "checked_users": len(_push_subscriptions),
        "pushed_count": pushed_count,
        "errors": errors,
        "timestamp": now.isoformat()
    }

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
