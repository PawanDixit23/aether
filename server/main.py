import os
import sys

# Ensure server module directory is in sys.path regardless of execution root
_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
if _SERVER_DIR not in sys.path:
    sys.path.insert(0, _SERVER_DIR)

import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
import httpx
import re
import traceback

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
    from database import engine, Base, get_db, ensure_schema_migrations
    from models import Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription
    from ai_engine import parse_intent_with_llm
except ImportError:
    try:
        from server.database import engine, Base, get_db, ensure_schema_migrations
        from server.models import Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription
        from server.ai_engine import parse_intent_with_llm
    except ImportError:
        from .database import engine, Base, get_db, ensure_schema_migrations
        from .models import Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage, PushSubscription
        from .ai_engine import parse_intent_with_llm

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
    input_text: str = ""
    image_data: Optional[str] = None
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
    recurrence: Optional[str] = None
    parent_id: Optional[int] = None
    subtasks: Optional[List[str]] = None

class TaskReschedule(BaseModel):
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

def build_context(db: Session, client_time: Optional[str] = None, tz_name: Optional[str] = None, user_email: Optional[str] = None, exclude_chat_id: Optional[int] = None) -> dict:
    if not user_email:
        return {
            "current_time": get_current_time_str(client_time, tz_name),
            "tasks": [],
            "total_income": 0,
            "total_expense": 0,
            "balance": 0,
            "memories": [],
            "recent_chat": []
        }
    tasks = db.query(Task).filter(Task.user_email == user_email, Task.status == "pending").all()
    records = db.query(FinancialRecord).filter(FinancialRecord.user_email == user_email).all()
    memories = db.query(MemoryItem).filter(MemoryItem.user_email == user_email).all()

    # Fetch last 8 messages for conversational context
    chat_q = db.query(ChatMessage).filter(ChatMessage.user_email == user_email)
    if exclude_chat_id:
        chat_q = chat_q.filter(ChatMessage.id != exclude_chat_id)
    recent_msgs = chat_q.order_by(ChatMessage.id.desc()).limit(8).all()
    recent_msgs = list(reversed(recent_msgs))
    recent_chat = [
        {"role": ("User" if m.role == "user" else "Aether"), "content": m.content}
        for m in recent_msgs
    ]

    total_income = sum(float(r.amount or 0.0) for r in records if r.type == "income")
    total_expense = sum(float(r.amount or 0.0) for r in records if r.type == "expense")
    balance = total_income - total_expense

    return {
        "current_time": get_current_time_str(client_time, tz_name),
        "tasks": [{"id": t.id, "title": str(t.title or "Task"), "priority": str(t.priority or "medium"), "reminder_time": t.reminder_time} for t in tasks],
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance,
        "memories": [{"category": str(m.category or "general"), "fact": str(m.fact or "")} for m in memories],
        "recent_chat": recent_chat
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
        db.query(Task).filter((Task.user_email == None) | (Task.user_email == "") | (Task.user_email == "operator@aether.ai")).update({Task.user_email: email})
        db.query(FinancialRecord).filter((FinancialRecord.user_email == None) | (FinancialRecord.user_email == "") | (FinancialRecord.user_email == "operator@aether.ai")).update({FinancialRecord.user_email: email})
        db.query(MemoryItem).filter((MemoryItem.user_email == None) | (MemoryItem.user_email == "") | (MemoryItem.user_email == "operator@aether.ai")).update({MemoryItem.user_email: email})
        db.query(ChatMessage).filter((ChatMessage.user_email == None) | (ChatMessage.user_email == "") | (ChatMessage.user_email == "operator@aether.ai")).update({ChatMessage.user_email: email})
        db.query(AuditLog).filter((AuditLog.user_email == None) | (AuditLog.user_email == "") | (AuditLog.user_email == "operator@aether.ai")).update({AuditLog.user_email: email})
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
    """Intelligently restore and merge client persistent cache into the database with zero duplication."""
    email = req.user_email.strip().lower()
    if not email:
        return {"status": "skipped", "message": "No email provided"}
    
    restored_counts = {"tasks": 0, "memories": 0, "finances": 0}
    
    # Existing task titles for this user to avoid duplicate insertions
    existing_tasks = db.query(Task).filter(Task.user_email == email).all()
    existing_titles = {t.title.strip().lower() for t in existing_tasks if t.title}
    
    if req.tasks:
        for t in req.tasks:
            try:
                title = (t.get("title") or "").strip()
                if not title or title.lower() in existing_titles:
                    continue

                due_dt = None
                if t.get("due_date"):
                    try:
                        clean_due = str(t["due_date"]).replace("Z", "").replace(" ", "T")
                        due_dt = datetime.fromisoformat(clean_due)
                    except Exception:
                        pass

                created_dt = None
                if t.get("created_at"):
                    try:
                        clean_created = str(t["created_at"]).replace("Z", "").replace(" ", "T")
                        created_dt = datetime.fromisoformat(clean_created)
                    except Exception:
                        pass

                db.add(Task(
                    user_email=email,
                    title=title,
                    priority=t.get("priority", "medium"),
                    status=t.get("status", "pending"),
                    reminder_time=t.get("reminder_time"),
                    due_date=due_dt,
                    created_at=created_dt or datetime.utcnow(),
                    notified=t.get("notified", False)
                ))
                existing_titles.add(title.lower())
                restored_counts["tasks"] += 1
            except Exception:
                pass
        db.commit()

    # Existing memories for this user
    existing_mems = db.query(MemoryItem).filter(MemoryItem.user_email == email).all()
    existing_facts = {m.fact.strip().lower() for m in existing_mems if m.fact}
    if req.memories:
        for m in req.memories:
            try:
                fact_text = (m.get("fact") or m.get("content") or "").strip()
                if not fact_text or fact_text.lower() in existing_facts:
                    continue

                db.add(MemoryItem(
                    user_email=email,
                    category=m.get("category", "preference"),
                    fact=fact_text
                ))
                existing_facts.add(fact_text.lower())
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
    try:
        return await _execute_quick_capture(req, user_email, db)
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
    user_email: Optional[str],
    db: Session
):
    user_msg = (req.input_text or "").strip()
    if not user_msg and not req.image_data:
        raise HTTPException(status_code=400, detail="Empty input")
    if not user_msg and req.image_data:
        user_msg = "कृपया इस फ़ोटो का विश्लेषण करें (यदि यह बिल/रसीद/खर्च है तो राशि और विवरण दर्ज करें, अन्यथा सामान्य जानकारी दें)।"

    eff_email = (req.user_email or user_email or "").strip().lower() or None

    # Record User Message
    db_content = f"📸 {user_msg}" if req.image_data and not user_msg.startswith("📸") else user_msg
    user_chat = ChatMessage(role="user", content=db_content, user_email=eff_email)
    db.add(user_chat)
    db.commit()
    db.refresh(user_chat)

    context = build_context(db, client_time=req.client_time, tz_name=req.timezone, user_email=eff_email, exclude_chat_id=user_chat.id)
    lang = req.language or "auto"
    parsed = await parse_intent_with_llm(
        user_msg, 
        context, 
        user_lat=req.latitude, 
        user_lon=req.longitude, 
        language=lang,
        api_key=req.api_key,
        user_name=req.user_name or "Operator",
        image_data=req.image_data
    )
    
    action = parsed.get("action", "query")
    confidence = parsed.get("confidence", 0.95)
    conf_level = parsed.get("confidence_level", "high")
    data = parsed.get("data", {})

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
        executed = True
        
    elif action == "expense":
        merchant_or_note = data.get("note") or user_msg
        record = FinancialRecord(
            user_email=eff_email,
            type="expense",
            category=data.get("category", "general"),
            amount=data.get("amount", 0.0),
            currency=data.get("currency", "INR"),
            payment_mode=data.get("payment_mode", "upi"),
            note=merchant_or_note
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        executed = True
        
        is_scanned_receipt = bool(req.image_data)
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
        
        # Monthly Category Budget Check & Smart Alert
        try:
            m_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            c_spend = db.query(func.sum(FinancialRecord.amount)).filter(
                FinancialRecord.user_email == eff_email,
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
            result_message = f"⏰ **{len(created_tasks)} कार्य एजेंडा में दर्ज किए गए:**\n\n" + "\n".join(lines) + "\n\nसभी रिमाइंडर्स निर्धारित समय पर एक्टिव रहेंगे! ✅"
            undo_payload = json.dumps({"table": "tasks", "ids": [ct.id for ct in created_tasks]})
            
            try:
                ai_chat = ChatMessage(
                    user_email=eff_email,
                    role="assistant",
                    content=result_message,
                    action_type=action,
                    action_data=json.dumps(data) if data else None,
                    confidence=confidence
                )
                db.add(ai_chat)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"[Multi-task Chat Record Note] {e}")
            return {
                "status": "success",
                "action": action,
                "result": result_message,
                "data": data,
                "confidence": confidence,
                "undo_payload": undo_payload
            }

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
            import re
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

    # Record AI Response in Chat History (resilient to schema constraints)
    try:
        ai_chat = ChatMessage(
            user_email=eff_email,
            role="assistant",
            content=result_message or "कार्य पूरा किया गया।",
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
    except Exception as chat_db_err:
        db.rollback()
        print(f"[Aether Chat Record Note] {chat_db_err}")

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
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={gemini_key.strip()}"
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

# ----------------- Location Detection -----------------
@app.get("/api/location/detect")
def detect_user_location(request: Request):
    """Detect client geographic location from client IP header."""
    client_ip = ""
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        client_ip = xff.split(",")[0].strip()
    
    # If no public client IP or local, return default India location
    if not client_ip or client_ip.startswith("127.") or client_ip.startswith("10.") or client_ip.startswith("192.168."):
        return {
            "status": "success",
            "city": "Jaipur",
            "region": "Rajasthan",
            "latitude": 26.9136,
            "longitude": 75.7858,
            "display_name": "Jaipur, Rajasthan"
        }
    
    try:
        req = urllib.request.Request(f"http://ip-api.com/json/{client_ip}", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if data.get("status") == "success":
                city = data.get("city", "Jaipur")
                region = data.get("regionName", "Rajasthan")
                # Safety: If geo service returned Singapore or foreign datacenter IP, default to Jaipur
                if "singapore" in city.lower() or "singapore" in region.lower():
                    city = "Jaipur"
                    region = "Rajasthan"
                return {
                    "status": "success",
                    "city": city,
                    "region": region,
                    "latitude": data.get("lat", 26.9136),
                    "longitude": data.get("lon", 75.7858),
                    "display_name": f"{city}, {region}"
                }
    except Exception as e:
        print(f"[Aether Engine] IP Location lookup error: {e}")
    
    return {
        "status": "success",
        "city": "Jaipur",
        "region": "Rajasthan",
        "latitude": 26.9136,
        "longitude": 75.7858,
        "display_name": "Jaipur, Rajasthan"
    }

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
def get_next_weekday(dt: datetime) -> datetime:
    next_day = dt + timedelta(days=1)
    while next_day.weekday() >= 5: # 5=Sat, 6=Sun
        next_day += timedelta(days=1)
    return next_day

def auto_advance_recurring_tasks(db: Session, user_email: Optional[str] = None):
    """Automatically rolls recurring tasks (daily, weekdays, weekly) forward if their scheduled date is in the past."""
    try:
        now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
        today = now.date()
        query = db.query(Task).filter(Task.recurrence != None)
        if user_email:
            query = query.filter(Task.user_email == user_email)
        rec_tasks = query.all()
        updated = False
        for dt in rec_tasks:
            if not dt.due_date:
                continue
            due_dt = dt.due_date
            if isinstance(due_dt, str):
                due_dt = datetime.fromisoformat(due_dt.replace(' ', 'T'))
            # If due date is in the past (yesterday or earlier), roll forward
            if due_dt.date() < today:
                if dt.recurrence == "daily":
                    new_dt = datetime.combine(today, due_dt.time())
                elif dt.recurrence in ["weekdays", "monday_to_friday"]:
                    new_dt = datetime.combine(today, due_dt.time())
                    while new_dt.weekday() >= 5:
                        new_dt += timedelta(days=1)
                elif str(dt.recurrence).startswith("weekly"):
                    new_dt = due_dt
                    while new_dt.date() < today:
                        new_dt += timedelta(days=7)
                else:
                    new_dt = datetime.combine(today, due_dt.time())
                
                dt.due_date = new_dt
                dt.status = "pending"
                dt.notified = False
                updated = True
        if updated:
            db.commit()
    except Exception as e:
        print(f"[AutoAdvanceRecurringTasks Note] {e}")

@app.get("/api/reminders/due")
def get_due_reminders(
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Fetch pending tasks whose reminder time has arrived or passed and have not been alerted yet."""
    if not user_email:
        return []

    auto_advance_recurring_tasks(db, user_email)

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
                    "recurrence": getattr(t, "recurrence", None),
                    "parent_id": getattr(t, "parent_id", None),
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
    """Acknowledge reminder so it won't repeatedly alert. Advances recurring tasks to their next scheduled occurrence."""
    query = db.query(Task).filter(Task.id == task_id)
    if user_email:
        query = query.filter(Task.user_email == user_email)
    task = query.first()
    if task:
        task.notified = True
        rec = getattr(task, "recurrence", None)
        if rec and task.due_date:
            if rec == "daily":
                task.due_date = task.due_date + timedelta(days=1)
            elif rec in ["weekdays", "monday_to_friday"]:
                task.due_date = get_next_weekday(task.due_date)
            elif str(rec).startswith("weekly"):
                task.due_date = task.due_date + timedelta(days=7)
            else:
                task.due_date = task.due_date + timedelta(days=1)
            task.notified = False
            task.status = "pending"
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
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "subtasks": []
    }
    if db:
        subs = db.query(Task).filter(Task.parent_id == t.id).order_by(Task.id.asc()).all()
        if subs:
            res["subtasks"] = [serialize_task(st) for st in subs]
    return res

@app.get("/api/tasks")
def list_tasks(
    status: Optional[str] = None, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    eff_email = (user_email or "").strip().lower()
    auto_advance_recurring_tasks(db, eff_email or None)
    if eff_email:
        # Migrate any unassigned tasks to this active user
        try:
            db.query(Task).filter((Task.user_email == None) | (Task.user_email == "") | (Task.user_email == "operator@aether.ai")).update({Task.user_email: eff_email})
            db.commit()
        except Exception:
            db.rollback()
        query = db.query(Task).filter(Task.user_email == eff_email)
    else:
        query = db.query(Task).filter((Task.user_email == None) | (Task.user_email == "") | (Task.user_email == "operator@aether.ai"))
    
    # Return top-level tasks by default (nested subtasks are attached inside serialize_task)
    query = query.filter((Task.parent_id == None) | (Task.parent_id == 0))
    if status:
        query = query.filter(Task.status == status)
    return [serialize_task(t, db=db) for t in query.order_by(Task.created_at.desc()).all()]

@app.post("/api/tasks")
def create_task(
    task_in: TaskCreate, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    eff_email = (task_in.user_email or user_email or "").strip().lower() or None
    data = task_in.dict()
    data["user_email"] = eff_email
    subtasks = data.pop("subtasks", None)
    task = Task(**data)
    db.add(task)
    db.commit()
    db.refresh(task)
    if subtasks and isinstance(subtasks, list):
        for st in subtasks:
            st_name = str(st).strip()
            if st_name:
                db.add(Task(user_email=eff_email, title=st_name, parent_id=task.id, priority=task.priority, status="pending"))
        db.commit()
    return serialize_task(task, db=db)

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
    new_status = "completed" if task.status != "completed" else "pending"
    task.status = new_status
    
    # If this task is a subtask, update parent task progress
    if getattr(task, "parent_id", None):
        parent = db.query(Task).filter(Task.id == task.parent_id).first()
        if parent:
            all_subs = db.query(Task).filter(Task.parent_id == parent.id).all()
            if all(s.status == "completed" for s in all_subs):
                parent.status = "completed"
            else:
                parent.status = "pending"
                
    # If this task is a parent task, toggle all child subtasks to match
    subs = db.query(Task).filter(Task.parent_id == task.id).all()
    if subs:
        for s in subs:
            s.status = new_status

    db.commit()
    db.refresh(task)
    return serialize_task(task, db=db)

@app.put("/api/tasks/{task_id}/reschedule")
def reschedule_task(
    task_id: int, 
    req: TaskReschedule, 
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.id == task_id)
    if user_email:
        query = query.filter(Task.user_email == user_email)
    task = query.first()
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
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Reschedules all overdue non-recurring tasks to today at their original reminder time."""
    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    today = now.date()
    eff_email = (user_email or "").strip().lower()
    query = db.query(Task).filter(Task.status == "pending", Task.recurrence == None, Task.due_date != None)
    if eff_email:
        query = query.filter(Task.user_email == eff_email)
    tasks = query.all()
    count = 0
    for t in tasks:
        dt = t.due_date
        if isinstance(dt, str):
            try: dt = datetime.fromisoformat(dt.replace(' ', 'T'))
            except Exception: continue
        if dt and dt.date() < today:
            t.due_date = datetime.combine(today, dt.time())
            t.notified = False
            count += 1
    if count > 0:
        db.commit()
    return {"status": "ok", "rescheduled_count": count}

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
    # Delete child subtasks if parent is deleted
    db.query(Task).filter(Task.parent_id == task.id).delete()
    db.delete(task)
    db.commit()
    return {"message": "Task and subtasks deleted successfully"}

@app.post("/api/calendar/sync-ical")
def sync_ical_feed(req: ICalSyncRequest, user_email: Optional[str] = Depends(get_user_email)):
    import urllib.request
    raw_url = req.url.strip()
    if not raw_url.startswith("http"):
        raise HTTPException(status_code=400, detail="अमान्य लिंक। लिंक http:// या https:// से शुरू होना चाहिए।")

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

@app.delete("/api/finance/records/{record_id}")
def delete_finance_record(
    record_id: int,
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    rec = db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Financial record not found")
    eff_email = (user_email or "").strip().lower()
    if eff_email and rec.user_email and rec.user_email.strip().lower() != eff_email:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record")
    db.delete(rec)
    db.commit()
    return {"status": "success", "deleted_id": record_id}

@app.put("/api/finance/records/{record_id}")
def update_finance_record(
    record_id: int,
    req: FinancialRecordUpdate,
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    rec = db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Financial record not found")
    eff_email = (user_email or "").strip().lower()
    if eff_email and rec.user_email and rec.user_email.strip().lower() != eff_email:
        raise HTTPException(status_code=403, detail="Not authorized to edit this record")
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
# FIX: Briefing response को 5 min cache करो — weather API 429 rate-limit से बचाव
import time as _briefing_time

_BRIEFING_CACHE: dict = {}
_BRIEFING_CACHE_TTL = 5 * 60  # 5 minutes

@app.get("/api/briefing")
def get_executive_briefing(
    user_email: Optional[str] = Depends(get_user_email),
    user_name: Optional[str] = "Operator",
    db: Session = Depends(get_db)
):
    # Rapid repeated calls पर cached response return करो
    _cache_key = user_email or "guest"
    _cached = _BRIEFING_CACHE.get(_cache_key)
    if _cached and (_briefing_time.time() - _cached["ts"] < _BRIEFING_CACHE_TTL):
        return _cached["data"]

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

    response_data = {
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
    # Cache save — अगले 5 min rapid calls इसी से serve होंगी
    _BRIEFING_CACHE[user_email or "guest"] = {"data": response_data, "ts": _briefing_time.time()}
    return response_data

# ----------------- 2-Minute Executive Audio Briefing -----------------
@app.get("/api/briefing/executive")
def get_executive_briefing(
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Generates an articulate, crisp 90-second executive audio briefing."""
    eff_email = (user_email or "").strip().lower() or None
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
    auto_advance_recurring_tasks(db, eff_email)
    task_query = db.query(Task).filter(Task.status == "pending", (Task.parent_id == None) | (Task.parent_id == 0))
    if eff_email:
        task_query = task_query.filter(Task.user_email == eff_email)
    else:
        task_query = task_query.filter((Task.user_email == None) | (Task.user_email == "") | (Task.user_email == "operator@aether.ai"))
    
    all_pending = task_query.all()
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

    clean_text = text.strip()[:600]
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
        for chunk in chunks[:4]:  # max 4 chunks (~600 chars) for responsive streaming
            if not chunk.strip():
                continue
            encoded_text = urllib.parse.quote(chunk.strip())
            tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={tl}&q={encoded_text}"
            req = urllib.request.Request(
                tts_url, 
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                audio_bytes_list.append(resp.read())

        if not audio_bytes_list:
            raise Exception("No audio generated")

        full_audio = b"".join(audio_bytes_list)
        return Response(content=full_audio, media_type="audio/mpeg", headers=headers)
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
                
                # Push भेजने के बाद task को notified mark करें (यदि recurring है तो अगली आवृत्ति schedule करें)
                task.notified = True
                rec = getattr(task, "recurrence", None)
                if rec and task.due_date:
                    if rec == "daily":
                        task.due_date = task.due_date + timedelta(days=1)
                    elif rec in ["weekdays", "monday_to_friday"]:
                        task.due_date = get_next_weekday(task.due_date)
                    elif str(rec).startswith("weekly"):
                        task.due_date = task.due_date + timedelta(days=7)
                    else:
                        task.due_date = task.due_date + timedelta(days=1)
                    task.notified = False
                    task.status = "pending"
                db.commit()
                
                if failed_subscriptions:
                    errors.append(f"Failed subs for task {task.id}: {len(failed_subscriptions)}")
        
        except Exception as e:
            errors.append(f"Error for {email}: {str(e)[:100]}")
            print(f"[PushCheck Error] {email}: {e}")

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

                paired = db.query(MemoryItem).filter(MemoryItem.category == "whatsapp_pairing").all()
                for p in paired:
                    try:
                        p_phone, p_email = p.fact.split(":", 1)
                        already_sent = db.query(MemoryItem).filter(
                            MemoryItem.category == "whatsapp_digest_sent",
                            MemoryItem.user_email == p_email,
                            MemoryItem.fact == digest_key
                        ).first()

                        if not already_sent:
                            if digest_type == "morning":
                                p_tasks = db.query(Task).filter(
                                    Task.user_email == p_email,
                                    Task.status == "pending",
                                    Task.parent_id == None
                                ).all()
                                task_count = len(p_tasks)
                                top_tasks_str = ", ".join([f"'{t.title}'" for t in p_tasks[:3]]) if p_tasks else "कोई पेंडिंग कार्य नहीं"
                                digest_msg = (
                                    f"☀️ *सुप्रभात पवन जी! Aether Morning Digest*\n\n"
                                    f"📍 *मौसम*: Jaipur में धूप खिली हुई (31°C)\n"
                                    f"🎯 *आज के कार्य ({task_count})*: {top_tasks_str}\n\n"
                                    f"दिन की शानदार शुरुआत करें! कोई भी नया काम या खर्च दर्ज करने के लिए सीधे यहाँ रिप्लाई करें। 🚀"
                                )
                            else:
                                comp_count = db.query(Task).filter(Task.user_email == p_email, Task.status == "completed").count()
                                pend_count = db.query(Task).filter(Task.user_email == p_email, Task.status == "pending").count()
                                digest_msg = (
                                    f"🌙 *शुभ संध्या पवन जी! Aether Day Wrap-up*\n\n"
                                    f"📊 *आज की प्रगति*:\n"
                                    f"• पूरे हुए कार्य: ✅ {comp_count}\n"
                                    f"• शेष कार्य: ⏳ {pend_count}\n\n"
                                    f"क्या शेष कार्यों को कल के लिए आगे बढ़ाना है? बस मुझे यहाँ बता दें।"
                                )

                            import asyncio
                            asyncio.create_task(_send_whatsapp_message(p_phone, digest_msg, wa_phone_id, wa_token))
                            db.add(MemoryItem(user_email=p_email, category="whatsapp_digest_sent", fact=digest_key))
                            db.commit()
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
@app.post("/api/telegram/webhook")
async def telegram_webhook(req: Request, db: Session = Depends(get_db)):
    """Receives and processes real-time Telegram messages from user to Aether."""
    try:
        data = await req.json()
        message = data.get("message") or data.get("edited_message")
        if not message:
            return {"status": "ignored"}

        chat_id = message.get("chat", {}).get("id")
        text = (message.get("text") or "").strip()
        from_user = message.get("from", {})
        first_name = from_user.get("first_name", "Operator")

        # Check paired email from MemoryItem
        link_mem = db.query(MemoryItem).filter(
            MemoryItem.category == "telegram_pairing", 
            MemoryItem.fact.like(f"{chat_id}:%")
        ).first()
        user_email = link_mem.fact.split(":", 1)[1].strip() if link_mem else None

        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

        # Handle pairing command: /start email or /login email
        if text.startswith("/start") or text.startswith("/login"):
            parts = text.split(maxsplit=1)
            if len(parts) > 1 and "@" in parts[1]:
                target_email = parts[1].strip().lower()
                if link_mem:
                    link_mem.fact = f"{chat_id}:{target_email}"
                else:
                    db.add(MemoryItem(user_email=target_email, category="telegram_pairing", fact=f"{chat_id}:{target_email}"))
                db.commit()
                welcome_reply = (
                    f"⚡ *Aether Connected!*\n\n"
                    f"नमस्ते {first_name}! आपका Telegram `{target_email}` से लिंक हो गया है।\n\n"
                    f"अब आप यहाँ सीधे बोलकर या लिखकर:\n"
                    f"• *रिमाइंडर*: 'कल सुबह 10 बजे मीटिंग'\n"
                    f"• *खर्च*: '500 रुपये पेट्रोल में खर्च हुए'\n"
                    f"• *सवाल*: कोई भी सवाल या जानकारी\n\n"
                    f"Aether तुरंत आपके ऐप में सिंक कर देगा! 🚀"
                )
            else:
                welcome_reply = (
                    f"⚡ *Aether Executive Telegram Bot*\n\n"
                    f"नमस्ते {first_name}! अपने Aether अकाउंट से लिंक करने के लिए नीचे दिए गए फॉर्मेट में कमांड भेजें:\n\n"
                    f"`/login your-email@gmail.com`\n\n"
                    f"(अपना सही Aether ईमेल लिखें ताकि आपके टास्क्स और खर्च तुरंत सिंक हो सकें)"
                )
            if bot_token:
                async with httpx.AsyncClient() as client:
                    await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": welcome_reply,
                        "parse_mode": "Markdown"
                    })
            return {"status": "paired"}

        if not user_email:
            # Guide user to pair first
            if bot_token:
                async with httpx.AsyncClient() as client:
                    await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": "⚠️ *खाता लिंक नहीं है*\n\nकृपया पहले अपना Aether ईमेल भेजें:\n`/login your-email@gmail.com`",
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
            language="hi"
        )
        action = parsed.get("action", "query")
        data_inner = parsed.get("data", {})
        
        reply_text = ""
        if action == "task":
            t = Task(
                user_email=user_email,
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
                        db.add(Task(user_email=user_email, title=str(st).strip(), parent_id=t.id, status="pending"))
                db.commit()
            reply_text = f"⏰ *टास्क दर्ज किया गया!*\n\n• **कार्य**: {t.title}\n• **समय**: {t.reminder_time or 'Anytime'}\n• **प्राथमिकता**: {t.priority.upper()}"
        elif action == "expense":
            rec = FinancialRecord(
                user_email=user_email,
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
            reply_text = data_inner.get("response", "कार्य पूरा किया गया।")

        if bot_token:
            async with httpx.AsyncClient() as client:
                await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": reply_text,
                    "parse_mode": "Markdown"
                })
        return {"status": "ok"}
    except Exception as e:
        print(f"[Telegram Webhook Error] {e}")
        return {"status": "error", "detail": str(e)}

# ----------------- WhatsApp Executive Assistant Webhook (Meta Cloud API & Twilio) -----------------
async def _send_whatsapp_message(to_number: str, message_body: str, phone_id: str, access_token: str):
    """Sends outgoing message via Meta WhatsApp Cloud API."""
    if not phone_id or not access_token:
        print("[WhatsApp] WHATSAPP_PHONE_ID or WHATSAPP_TOKEN missing in environment variables.")
        return
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
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=10)
            print(f"[WhatsApp Outgoing Response] Status: {resp.status_code}, Body: {resp.text}")
    except Exception as e:
        print(f"[WhatsApp Outgoing Error] {e}")

@app.get("/api/whatsapp/sync-waba")
async def sync_whatsapp_waba(db: Session = Depends(get_db)):
    """Subscribes WABA to the app and sends a direct test ping."""
    token = os.environ.get("WHATSAPP_TOKEN", "").strip()
    phone_id = os.environ.get("WHATSAPP_PHONE_ID", "1432995866556035").strip()
    waba_id = "1095690750105581"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Pre-pair the user's phone with their account
    user_phone = "918741838653"
    user_email = "e.pawandixit@gmail.com"
    link_mem = db.query(MemoryItem).filter(
        MemoryItem.category == "whatsapp_pairing",
        MemoryItem.fact.like(f"{user_phone}:%")
    ).first()
    if link_mem:
        link_mem.fact = f"{user_phone}:{user_email}"
    else:
        db.add(MemoryItem(user_email=user_email, category="whatsapp_pairing", fact=f"{user_phone}:{user_email}"))
    db.commit()

    results = {"pairing": f"{user_phone} -> {user_email}"}
    async with httpx.AsyncClient() as client:
        # 1. Subscribe WABA
        sub_resp = await client.post(
            f"https://graph.facebook.com/v21.0/{waba_id}/subscribed_apps",
            headers=headers
        )
        results["waba_subscribe"] = {"status": sub_resp.status_code, "body": sub_resp.text}
        
        # 2. Check Subscribed Apps
        check_resp = await client.get(
            f"https://graph.facebook.com/v21.0/{waba_id}/subscribed_apps",
            headers=headers
        )
        results["waba_check"] = {"status": check_resp.status_code, "body": check_resp.text}

        # 3. Direct Test Ping to user's phone
        test_msg = await client.post(
            f"https://graph.facebook.com/v21.0/{phone_id}/messages",
            headers=headers,
            json={
                "messaging_product": "whatsapp",
                "to": user_phone,
                "type": "text",
                "text": {"body": "⚡ *Aether Connected!*\n\nनमस्ते! आपका Aether WhatsApp बॉट सफलतापूर्वक सक्रिय हो चुका है।\n\nअब आप मुझे यहाँ कोई भी काम बोल सकते हैं, जैसे:\n• 'कल सुबह 10 बजे मीटिंग का रिमाइंडर लगाओ'\n• '500 रुपये पेट्रोल में खर्च हुए'"}
            }
        )
        results["test_message_send"] = {"status": test_msg.status_code, "body": test_msg.text}
    
    return results

@app.post("/api/whatsapp/send-digest")
async def trigger_whatsapp_digest(
    time_of_day: str = "morning",
    user_email: Optional[str] = Depends(get_user_email),
    db: Session = Depends(get_db)
):
    """Manually triggers sending the Morning or Evening WhatsApp Executive Digest."""
    token = os.environ.get("WHATSAPP_TOKEN", "").strip()
    phone_id = os.environ.get("WHATSAPP_PHONE_ID", "1432995866556035").strip()
    eff_email = (user_email or "e.pawandixit@gmail.com").strip().lower()

    link_mem = db.query(MemoryItem).filter(
        MemoryItem.category == "whatsapp_pairing",
        MemoryItem.fact.like(f"%:{eff_email}")
    ).first()
    if not link_mem:
        raise HTTPException(status_code=400, detail="WhatsApp pairing not found for user")
    
    user_phone = link_mem.fact.split(":", 1)[0].strip()

    if time_of_day == "morning":
        p_tasks = db.query(Task).filter(Task.user_email == eff_email, Task.status == "pending", Task.parent_id == None).all()
        top_tasks = ", ".join([f"'{t.title}'" for t in p_tasks[:3]]) if p_tasks else "कोई पेंडिंग कार्य नहीं"
        digest_msg = (
            f"☀️ *सुप्रभात पवन जी! Aether Morning Digest*\n\n"
            f"📍 *मौसम*: Jaipur में 31.4°C धूप खिली हुई\n"
            f"🎯 *आज के कार्य ({len(p_tasks)})*: {top_tasks}\n\n"
            f"दिन की शानदार शुरुआत करें! कोई भी नया काम या खर्च दर्ज करने के लिए सीधे यहाँ रिप्लाई करें। 🚀"
        )
    else:
        comp_count = db.query(Task).filter(Task.user_email == eff_email, Task.status == "completed").count()
        pend_count = db.query(Task).filter(Task.user_email == eff_email, Task.status == "pending").count()
        digest_msg = (
            f"🌙 *शुभ संध्या पवन जी! Aether Day Wrap-up*\n\n"
            f"📊 *आज की प्रगति*:\n"
            f"• पूरे हुए कार्य: ✅ {comp_count}\n"
            f"• शेष कार्य: ⏳ {pend_count}\n\n"
            f"क्या शेष कार्यों को कल के लिए आगे बढ़ाना है? बस मुझे यहाँ बता दें।"
        )
    
    await _send_whatsapp_message(user_phone, digest_msg, phone_id, token)
    return {"status": "success", "sent_to": user_phone, "type": time_of_day}

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

@app.post("/api/whatsapp/webhook")
async def whatsapp_incoming(req: Request, db: Session = Depends(get_db)):
    """Receives and processes incoming WhatsApp messages from Meta Cloud API."""
    try:
        payload = await req.json()
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return {"status": "ok", "message": "no incoming messages"}

        msg = messages[0]
        sender = msg.get("from")  # e.g., '919876543210'
        msg_type = msg.get("type")
        user_text = ""

        if msg_type == "text":
            user_text = msg.get("text", {}).get("body", "").strip()
        else:
            user_text = "Hello Aether"

        # Check paired email from MemoryItem
        link_mem = db.query(MemoryItem).filter(
            MemoryItem.category == "whatsapp_pairing",
            MemoryItem.fact.like(f"{sender}:%")
        ).first()
        user_email = link_mem.fact.split(":", 1)[1].strip() if link_mem else None

        wa_token = os.environ.get("WHATSAPP_TOKEN", "").strip()
        wa_phone_id = os.environ.get("WHATSAPP_PHONE_ID", "").strip()

        # Pairing command: /login user@gmail.com
        if user_text.lower().startswith("/login") or user_text.lower().startswith("/start") or ("@" in user_text and len(user_text.split()) == 1):
            parts = user_text.split()
            target_email = parts[-1].strip().lower()
            if "@" in target_email:
                if link_mem:
                    link_mem.fact = f"{sender}:{target_email}"
                else:
                    db.add(MemoryItem(user_email=target_email, category="whatsapp_pairing", fact=f"{sender}:{target_email}"))
                db.commit()
                reply_text = (
                    f"⚡ *Aether Connected!*\n\n"
                    f"नमस्ते! आपका WhatsApp नंबर `{target_email}` से लिंक हो गया है।\n\n"
                    f"अब आप यहाँ सीधे बोलकर या लिखकर:\n"
                    f"• *रिमाइंडर*: 'कल सुबह 10 बजे मीटिंग'\n"
                    f"• *खर्च*: '500 रुपये पेट्रोल में खर्च हुए'\n"
                    f"• *सवाल*: कोई भी जानकारी या सवाल\n\n"
                    f"Aether तुरंत आपके ऐप में सिंक कर देगा! 🚀"
                )
                try:
                    db.add(ChatMessage(user_email=target_email, role="user", content=f"📱 {user_text}", action_type="query"))
                    db.add(ChatMessage(user_email=target_email, role="aether", content=reply_text, action_type="query"))
                    db.commit()
                except Exception:
                    pass
            else:
                reply_text = (
                    f"⚡ *Aether WhatsApp Executive*\n\n"
                    f"अपने Aether खाते से लिंक करने के लिए नीचे दिए गए फॉर्मेट में अपना ईमेल भेजें:\n\n"
                    f"`/login your-email@gmail.com`"
                )
            await _send_whatsapp_message(sender, reply_text, wa_phone_id, wa_token)
            return {"status": "paired"}

        if not user_email:
            reply_text = (
                f"⚠️ *Aether खाता लिंक नहीं है*\n\n"
                f"कृपया पहले अपना Aether ईमेल भेजकर लिंक करें:\n"
                f"`/login your-email@gmail.com`"
            )
            await _send_whatsapp_message(sender, reply_text, wa_phone_id, wa_token)
            return {"status": "unpaired"}

        # Process through Aether AI engine
        context = build_context(db, user_email=user_email)
        try:
            from ai_engine import parse_intent_with_llm
        except ImportError:
            from .ai_engine import parse_intent_with_llm

        parsed = await parse_intent_with_llm(
            user_text,
            context=context,
            user_name="Pawan",
            language="hi"
        )
        action = parsed.get("action", "query")
        data_inner = parsed.get("data", {})

        reply_text = ""
        if action == "task":
            multi = data_inner.get("multi_tasks")
            if multi and isinstance(multi, list) and len(multi) > 1:
                created_tasks = []
                for item in multi:
                    title = item.get("title", "").strip()
                    if title:
                        t = Task(
                            user_email=user_email,
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
                t = Task(
                    user_email=user_email,
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
                            db.add(Task(user_email=user_email, title=str(st).strip(), parent_id=t.id, status="pending"))
                    db.commit()
                reply_text = f"⏰ *टास्क दर्ज किया गया!*\n\n• *कार्य*: {t.title}\n• *समय*: {t.reminder_time or 'Anytime'}\n• *प्राथमिकता*: {t.priority.upper()}"
        elif action in ["expense", "income"]:
            rec_type = "expense" if action == "expense" else "income"
            rec = FinancialRecord(
                user_email=user_email,
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
                # Check Monthly Category Budget Alert
                month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                cat_spend = db.query(func.sum(FinancialRecord.amount)).filter(
                    FinancialRecord.user_email == user_email,
                    FinancialRecord.type == "expense",
                    FinancialRecord.category == rec.category,
                    FinancialRecord.date >= month_start
                ).scalar() or 0.0

                BUDGETS = {
                    "fuel": 4000.0,
                    "food": 5000.0,
                    "shopping": 10000.0,
                    "travel": 4000.0,
                    "dining": 5000.0,
                    "bills": 3000.0
                }
                b_limit = BUDGETS.get(rec.category.lower())
                alert_suffix = ""
                if b_limit and cat_spend >= (b_limit * 0.8):
                    pct = int((cat_spend / b_limit) * 100)
                    alert_suffix = f"\n\n⚠️ *बजट अलर्ट*: इस माह {rec.category.title()} का कुल खर्च ₹{cat_spend:,.0f} / ₹{b_limit:,.0f} ({pct}%) हो चुका है!"

                reply_text = f"🧾 *खर्च दर्ज किया गया!*\n\n• *राशि*: ₹{rec.amount:,.2f}\n• *श्रेणी*: {rec.category.title()}\n• *मोड*: {rec.payment_mode.upper()}\n• *विवरण*: {rec.note}{alert_suffix}"
            else:
                reply_text = f"💰 *आय दर्ज की गई!*\n\n• *राशि*: +₹{rec.amount:,.2f}\n• *श्रेणी*: {rec.category.title()}\n• *विवरण*: {rec.note}"
        else:
            reply_text = data_inner.get("response", "कार्य पूरा किया गया।")

        # Record WhatsApp conversation into unified Chat History for Aether App
        try:
            db.add(ChatMessage(user_email=user_email, role="user", content=f"📱 {user_text}", action_type=action))
            db.add(ChatMessage(user_email=user_email, role="aether", content=reply_text, action_type=action, action_data=json.dumps(data_inner) if data_inner else None))
            db.commit()
        except Exception as e_chat:
            print(f"[WhatsApp ChatMessage Sync Error] {e_chat}")

        await _send_whatsapp_message(sender, reply_text, wa_phone_id, wa_token)
        return {"status": "ok"}
    except Exception as e:
        print(f"[WhatsApp Webhook Error] {e}")
        return {"status": "error", "detail": str(e)}

# ----------------- Twilio WhatsApp Sandbox Webhook Support -----------------
@app.post("/api/whatsapp/twilio")
async def twilio_whatsapp_webhook(req: Request, db: Session = Depends(get_db)):
    """Receives and processes incoming WhatsApp messages from Twilio Sandbox."""
    try:
        form = await req.form()
        sender_full = form.get("From", "")  # e.g. "whatsapp:+919876543210"
        sender = sender_full.replace("whatsapp:", "").strip()
        body = form.get("Body", "").strip()

        link_mem = db.query(MemoryItem).filter(
            MemoryItem.category == "whatsapp_pairing",
            MemoryItem.fact.like(f"{sender}:%")
        ).first()
        user_email = link_mem.fact.split(":", 1)[1].strip() if link_mem else None

        if body.lower().startswith("/login") or ("@" in body and len(body.split()) == 1):
            target_email = body.split()[-1].strip().lower()
            if link_mem:
                link_mem.fact = f"{sender}:{target_email}"
            else:
                db.add(MemoryItem(user_email=target_email, category="whatsapp_pairing", fact=f"{sender}:{target_email}"))
            db.commit()
            reply = f"⚡ Aether WhatsApp Linked with {target_email}! Ab aap reminders aur kharch direct WhatsApp par bhej sakte hain."
        elif not user_email:
            reply = "⚠️ Please link your email first by sending: /login your-email@gmail.com"
        else:
            from ai_engine import parse_intent_with_llm
            parsed = await parse_intent_with_llm(body, user_name="Pawan", language="hi")
            action = parsed.get("action", "query")
            data_inner = parsed.get("data", {})
            if action == "task":
                t = Task(user_email=user_email, title=data_inner.get("title", body), reminder_time=data_inner.get("reminder_time"), status="pending")
                db.add(t)
                db.commit()
                reply = f"⏰ Task saved: {t.title} (Time: {t.reminder_time or 'Anytime'})"
            elif action == "expense":
                rec = FinancialRecord(user_email=user_email, type="expense", category=data_inner.get("category", "general"), amount=data_inner.get("amount", 0.0), currency="INR", note=data_inner.get("note", body))
                db.add(rec)
                db.commit()
                reply = f"🧾 Kharch saved: ₹{rec.amount:,.2f} ({rec.category})"
            else:
                reply = data_inner.get("response", "Done.")

        twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{reply}</Message></Response>'
        from fastapi.responses import Response
        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        print(f"[Twilio WA Error] {e}")
        return Response(content='<Response><Message>Error processing</Message></Response>', media_type="application/xml")

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
