import os
import json
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

try:
    from .database import engine, Base, get_db
    from .models import Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage
    from .ai_engine import parse_intent_with_llm
except ImportError:
    from database import engine, Base, get_db
    from models import Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage
    from ai_engine import parse_intent_with_llm

# Initialize SQLite tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Aether Executive Core", version="0.1.0")

# Enable CORS for local desktop & web apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Pydantic Schemas -----------------
class AuthRecordRequest(BaseModel):
    email: str
    name: Optional[str] = "Operator"
    provider: Optional[str] = "google"

class KeyValidationRequest(BaseModel):
    api_key: str

class QuickCaptureRequest(BaseModel):
    input_text: str
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
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None
    reminder_time: Optional[str] = None

class FinancialRecordCreate(BaseModel):
    type: str
    category: Optional[str] = "general"
    amount: float
    currency: Optional[str] = "INR"
    payment_mode: Optional[str] = "upi"
    note: Optional[str] = None

class MemoryCreate(BaseModel):
    fact: str
    category: Optional[str] = "preference"

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

def build_context(db: Session, client_time: Optional[str] = None, tz_name: Optional[str] = None) -> dict:
    tasks = db.query(Task).filter(Task.status == "pending").all()
    records = db.query(FinancialRecord).all()
    memories = db.query(MemoryItem).all()

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
    """Log user authentication in local audit log & memory."""
    details = f"User {req.name} ({req.email}) successfully authenticated via {req.provider.capitalize()} OAuth."
    audit = AuditLog(
        action_type="user_auth",
        details=details,
        confidence_score=1.0,
        executed_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return {"status": "logged", "audit_id": audit.id, "details": details}

# ----------------- Quick Capture / Action Engine -----------------
@app.post("/api/action/quick-capture")
async def quick_capture(req: QuickCaptureRequest, db: Session = Depends(get_db)):
    """Core Smart Action Engine with Real Context & Conversational History."""
    user_msg = req.input_text.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Empty input")

    # Record User Message
    db.add(ChatMessage(role="user", content=user_msg))
    db.commit()

    context = build_context(db, client_time=req.client_time, tz_name=req.timezone)
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
def get_chat_history(limit: int = 30, db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage).order_by(ChatMessage.created_at.asc()).all()
    return msgs[-limit:]

@app.delete("/api/chat/history")
def clear_chat_history(db: Session = Depends(get_db)):
    db.query(ChatMessage).delete()
    db.commit()
    return {"message": "Chat history cleared, ready for new conversation"}

@app.get("/api/news")
def get_live_news(limit: int = 5):
    try:
        from ai_engine import get_structured_news
    except ImportError:
        from .ai_engine import get_structured_news
    return get_structured_news(limit=limit)

# ----------------- Reminders & Notification Engine -----------------
@app.get("/api/reminders/due")
def get_due_reminders(db: Session = Depends(get_db)):
    """Fetch pending tasks whose reminder time has arrived or passed and have not been alerted yet."""
    now = datetime.now(DEFAULT_TZ).replace(tzinfo=None) if DEFAULT_TZ else datetime.now()
    tasks = db.query(Task).filter(
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
def acknowledge_reminder(task_id: int, db: Session = Depends(get_db)):
    """Acknowledge reminder so it won't repeatedly alert."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        task.notified = True
        db.commit()
        return {"status": "acknowledged", "task_id": task_id}
    raise HTTPException(status_code=404, detail="Task not found")

# ----------------- Tasks Endpoints -----------------
@app.get("/api/tasks")
def list_tasks(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    return query.order_by(Task.created_at.desc()).all()

@app.post("/api/tasks")
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**task_in.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@app.put("/api/tasks/{task_id}/toggle")
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "completed" if task.status != "completed" else "pending"
    db.commit()
    db.refresh(task)
    return task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

# ----------------- Finance Endpoints -----------------
@app.get("/api/finance/records")
def list_finance_records(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(FinancialRecord).order_by(FinancialRecord.date.desc()).limit(limit).all()

@app.get("/api/finance/summary")
def get_finance_summary(db: Session = Depends(get_db)):
    records = db.query(FinancialRecord).all()
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
def list_memory(db: Session = Depends(get_db)):
    return db.query(MemoryItem).order_by(MemoryItem.created_at.desc()).all()

@app.delete("/api/memory/{item_id}")
def delete_memory(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MemoryItem).filter(MemoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Memory item not found")
    db.delete(item)
    db.commit()
    return {"message": "Memory deleted successfully"}

# ----------------- Executive Briefing -----------------
@app.get("/api/briefing")
def get_executive_briefing(db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.status == "pending").all()
    urgent_tasks = [t for t in tasks if t.priority in ["high", "urgent"]]
    finance = get_finance_summary(db)
    memories = db.query(MemoryItem).limit(5).all()

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

    weather = {
        "temp": 28,
        "condition_en": "Mostly Sunny" if time_phase != "night" else "Clear Sky",
        "condition_hi": "धूप खिली हुई" if time_phase != "night" else "साफ़ आसमान",
        "city": "Jaipur (भांकरोटा)",
        "city_en": "Jaipur (Bhankrota)",
        "city_hi": "Jaipur (भांकरोटा)",
        "city_hinglish": "Jaipur (Bhankrota)",
        "time_phase": time_phase,
        "icon": weather_icon,
        "humidity": "42%",
        "wind": "10 km/h"
    }

    return {
        "greeting": f"{greeting}, पवन!",
        "date_str": now.strftime("%d %b").upper(),
        "pending_tasks_count": len(tasks),
        "upcoming_count": 2,
        "alert_count": max(1, len(urgent_tasks)),
        "urgent_tasks": [{"id": t.id, "title": t.title, "priority": t.priority} for t in urgent_tasks],
        "financial_snapshot": finance,
        "active_rules_count": len(memories),
        "weather": weather,
        "generated_at": now.isoformat()
    }

# ----------------- Audit Logs & Undo -----------------
@app.get("/api/audit-logs")
def list_audit_logs(limit: int = 30, db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.executed_at.desc()).limit(limit).all()

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
            return FileResponse(file_path)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"message": "Aether Executive Core API running. Build frontend for UI."}
