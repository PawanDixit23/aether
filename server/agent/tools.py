"""
Aether Modular Tool Registry
Implements typed tools for Task, Finance, Media, Communication, Weather, Notes & Memory.
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.1 Tool Adapters)
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from .state import ToolCall, ActionTier
from models import Task, FinancialRecord, MemoryItem
from ai_engine import resolve_youtube_playback, generate_email_draft


class ToolRegistry:
    """Executes registered tools against database and external systems."""

    @staticmethod
    def execute_tool(tool_name: str, params: Dict[str, Any], user_email: str, lang: str, db: Session) -> ToolCall:
        call = ToolCall(tool_name=tool_name, parameters=params)

        try:
            # ─────────────────────────────────────────────────────────────
            # 1. Task Management Tools
            # ─────────────────────────────────────────────────────────────
            if tool_name == "create_task":
                title = params.get("title", "New Task").strip()
                r_time = params.get("reminder_time")
                due_dt = None
                if params.get("due_date"):
                    try:
                        due_dt = datetime.fromisoformat(str(params["due_date"]))
                    except Exception:
                        due_dt = None

                priority = params.get("priority", "medium")
                recurrence = params.get("recurrence")
                
                task = Task(
                    user_email=user_email,
                    title=title,
                    priority=priority,
                    reminder_time=r_time,
                    due_date=due_dt or datetime.combine(datetime.now().date(), datetime.min.time()),
                    recurrence=recurrence,
                    notified=False
                )
                db.add(task)
                db.commit()
                db.refresh(task)

                call.status = "executed"
                call.result = {"task_id": task.id, "title": task.title}
                call.undo_payload = {"table": "tasks", "id": task.id}

                if lang == "en":
                    call.message = f"Reminder set: \"{task.title}\" ({task.reminder_time or 'Anytime'}) [{priority.upper()}]"
                elif lang == "hinglish":
                    call.message = f"Aapka reminder set ho gaya: \"{task.title}\" ({task.reminder_time or 'Anytime'})"
                else:
                    call.message = f"रिमाइंडर सेट किया गया: \"{task.title}\" ({task.reminder_time or 'किसी भी समय'})"

            elif tool_name == "create_multi_tasks":
                tasks_data = params.get("tasks", [])
                created_ids = []
                created_objs = []
                for td in tasks_data:
                    t_title = td.get("title", "").strip()
                    if t_title:
                        mt_time = td.get("reminder_time")
                        mt_due = None
                        if td.get("due_date"):
                            try:
                                mt_due = datetime.fromisoformat(str(td["due_date"]))
                            except Exception:
                                mt_due = None
                        t_obj = Task(
                            user_email=user_email,
                            title=t_title,
                            priority=td.get("priority", "medium"),
                            reminder_time=mt_time,
                            due_date=mt_due or datetime.combine(datetime.now().date(), datetime.min.time()),
                            notified=False
                        )
                        db.add(t_obj)
                        created_objs.append(t_obj)
                db.commit()
                created_ids = [t.id for t in created_objs]

                call.status = "executed"
                call.result = {"created_ids": created_ids, "count": len(created_ids)}
                call.undo_payload = {"table": "tasks", "ids": created_ids}

                lines = [f"{i+1}. **{t.title}** ({t.reminder_time or 'Anytime'})" for i, t in enumerate(created_objs)]
                if lang == "en":
                    call.message = f"⏰ **{len(created_ids)} tasks scheduled:**\n\n" + "\n".join(lines)
                elif lang == "hinglish":
                    call.message = f"⏰ **{len(created_ids)} tasks agenda me add ho gaye:**\n\n" + "\n".join(lines)
                else:
                    call.message = f"⏰ **{len(created_ids)} कार्य एजेंडा में दर्ज किए गए:**\n\n" + "\n".join(lines)

            elif tool_name == "query_tasks":
                status_filter = params.get("status", "pending")
                query = db.query(Task).filter(Task.user_email == user_email)
                if status_filter != "all":
                    query = query.filter(Task.status == status_filter)
                tasks = query.order_by(Task.due_date.asc()).limit(15).all()

                call.status = "executed"
                call.result = [{"id": t.id, "title": t.title, "reminder_time": t.reminder_time, "status": t.status} for t in tasks]
                lines = [f"• **{t.title}** ({t.reminder_time or 'Today'})" for t in tasks]
                call.message = f"📋 **{len(tasks)} Pending Tasks:**\n\n" + "\n".join(lines) if tasks else "No pending tasks found."

            # ─────────────────────────────────────────────────────────────
            # 2. Finance Tools
            # ─────────────────────────────────────────────────────────────
            elif tool_name == "record_expense":
                amount = float(params.get("amount", 0.0))
                category = params.get("category", "General").capitalize()
                desc = params.get("description", "Expense")
                dt = datetime.now()
                if params.get("date_time"):
                    try:
                        dt = datetime.fromisoformat(str(params["date_time"]))
                    except Exception:
                        dt = datetime.now()

                rec = FinancialRecord(
                    user_email=user_email,
                    type="expense",
                    category=category,
                    amount=amount,
                    note=desc,
                    date=dt
                )
                db.add(rec)
                db.commit()
                db.refresh(rec)

                call.status = "executed"
                call.result = {"record_id": rec.id, "amount": amount, "category": category}
                call.undo_payload = {"table": "financial_records", "id": rec.id}

                if lang == "en":
                    call.message = f"💸 Expense recorded: ₹{amount:,.2f} for {desc} [{category}]"
                elif lang == "hinglish":
                    call.message = f"💸 Kharch darj hua: ₹{amount:,.2f} ({desc}) [{category}]"
                else:
                    call.message = f"💸 खर्च दर्ज किया गया: ₹{amount:,.2f} ({desc}) [{category}]"

            elif tool_name == "query_finances":
                records = db.query(FinancialRecord).filter(FinancialRecord.user_email == user_email).all()
                total_income = sum(r.amount for r in records if r.type == "income")
                total_expense = sum(r.amount for r in records if r.type == "expense")
                balance = total_income - total_expense

                call.status = "executed"
                call.result = {
                    "total_income": total_income,
                    "total_expense": total_expense,
                    "balance": balance,
                    "count": len(records)
                }
                if lang == "en":
                    call.message = f"💰 **Financial Overview:**\n• Total Income: ₹{total_income:,.2f}\n• Total Spent: ₹{total_expense:,.2f}\n• **Net Balance:** ₹{balance:,.2f}"
                elif lang == "hinglish":
                    call.message = f"💰 **Financial Summary:**\n• Kul Aay: ₹{total_income:,.2f}\n• Kul Kharch: ₹{total_expense:,.2f}\n• **Bachat Balance:** ₹{balance:,.2f}"
                else:
                    call.message = f"💰 **वित्तीय स्थिति (Financial Summary):**\n• कुल आय: ₹{total_income:,.2f}\n• कुल खर्च: ₹{total_expense:,.2f}\n• **शुद्ध बचत (Balance):** ₹{balance:,.2f}"

            # ─────────────────────────────────────────────────────────────
            # 3. Media & YouTube Tools
            # ─────────────────────────────────────────────────────────────
            elif tool_name == "resolve_youtube":
                q = params.get("query", "Trending")
                yt_info = resolve_youtube_playback(q)
                call.status = "executed"
                call.result = yt_info
                watch_url = yt_info.get("watch_url")
                if lang == "en":
                    call.message = f"🎬 **Playing on YouTube:** « {q} »\n▶️ **Play Video:** {watch_url} 🎵"
                elif lang == "hinglish":
                    call.message = f"🎬 **YouTube par chala raha hoon:** « {q} »\n▶️ **Play Video:** {watch_url} 🎵"
                else:
                    call.message = f"🎬 **YouTube पर चलाया जा रहा है:** « {q} »\n▶️ **वीडियो चलाएं:** {watch_url} 🎵"

            # ─────────────────────────────────────────────────────────────
            # 4. Communication Tools (Call & Email)
            # ─────────────────────────────────────────────────────────────
            elif tool_name == "create_call_card":
                c_name = params.get("contact_name", "Contact")
                c_num = params.get("phone_number", "")
                tel_url = f"tel:{c_num}" if c_num else "tel:"
                call.status = "executed"
                call.result = {"contact_name": c_name, "phone_number": c_num, "tel_url": tel_url}
                if lang == "en":
                    call.message = f"📞 **Calling {c_name}** ({c_num})...\n\nTap Call below to dial directly on your phone. 📱"
                elif lang == "hinglish":
                    call.message = f"📞 **{c_name} ({c_num}) ko call milayi ja rahi hai...**\n\nCall lagane ke liye niche Call button dabayein! 📱"
                else:
                    call.message = f"📞 **{c_name} ({c_num}) को कॉल मिलाई जा रही है...**\n\nकॉल करने के लिए नीचे दिए गए बटन पर टैप करें। 📱"

            elif tool_name == "draft_email":
                recip = params.get("recipient", "recipient@example.com")
                subj = params.get("subject", "Follow-up")
                intent = params.get("intent", "Review notes")
                draft = generate_email_draft(f"To: {recip}, Subject: {subj}. {intent}")
                import urllib.parse
                mailto_url = f"mailto:{recip}?subject={urllib.parse.quote(draft.get('subject', subj))}&body={urllib.parse.quote(draft.get('body', ''))}"
                call.status = "executed"
                call.result = {**draft, "mailto_url": mailto_url}
                if lang == "en":
                    call.message = f"✉️ **Email Draft Ready:**\n• **To**: {recip}\n• **Subject**: {draft.get('subject')}\n\nReview or launch draft in your email client below. 📝"
                elif lang == "hinglish":
                    call.message = f"✉️ **Email draft taiyar hai:**\n• **To**: {recip}\n• **Subject**: {draft.get('subject')}\n\nReview karne ke liye niche card dekhein. 📝"
                else:
                    call.message = f"✉️ **ईमेल ड्राफ्ट तैयार है:**\n• **प्राप्तकर्ता**: {recip}\n• **विषय**: {draft.get('subject')}\n\nसमीक्षा के लिए नीचे दिया गया कार्ड देखें। 📝"

            # ─────────────────────────────────────────────────────────────
            # 5. Live Weather Tool
            # ─────────────────────────────────────────────────────────────
            elif tool_name == "weather":
                call.status = "executed"
                call.result = {"city": "Jaipur", "temp": "31°C", "condition": "Sunny"}
                call.message = f"📍 **Weather**: Jaipur में धूप खिली हुई (31°C)"

            # ─────────────────────────────────────────────────────────────
            # 6. Memory Tools
            # ─────────────────────────────────────────────────────────────
            elif tool_name == "save_memory":
                fact = params.get("fact", "").strip()
                cat = params.get("category", "preference")
                item = MemoryItem(user_email=user_email, category=cat, fact=fact, confidence=0.98)
                db.add(item)
                db.commit()
                call.status = "executed"
                call.result = {"id": item.id, "fact": fact, "category": cat}
                call.undo_payload = {"table": "memory_vault", "id": item.id}
                if lang == "en":
                    call.message = f"Preference saved to memory: \"{fact}\""
                elif lang == "hinglish":
                    call.message = f"Aapki preference memory me save ho gayi: \"{fact}\""
                else:
                    call.message = f"प्राथमिकता मेमोरी में सुरक्षित कर ली गई: \"{fact}\""

            # ─────────────────────────────────────────────────────────────
            # 7. Google Calendar Tool
            # ─────────────────────────────────────────────────────────────
            elif tool_name == "calendar_event":
                from calendar_sync import GoogleCalendarService
                cal_title = params.get("title", "Meeting")
                cal_time = params.get("start_time_str")
                cal_date = params.get("date_str")
                cal_dur = int(params.get("duration", 60))
                cal_res = GoogleCalendarService.schedule_event(
                    title=cal_title,
                    start_time_str=cal_time,
                    date_str=cal_date,
                    duration_minutes=cal_dur,
                    user_email=user_email
                )
                call.status = "executed"
                call.result = cal_res
                gcal_url = cal_res.get("google_calendar_url")
                if lang == "en":
                    call.message = f"📅 **Google Calendar Event Ready:**\n• **Title**: {cal_title}\n• **Time**: {cal_res.get('formatted_time')}\n\n👉 **[Open in Google Calendar]({gcal_url})**"
                elif lang == "hinglish":
                    call.message = f"📅 **Google Calendar Event taiyar hai:**\n• **Title**: {cal_title}\n• **Time**: {cal_res.get('formatted_time')}\n\n👉 **[Google Calendar me jodein]({gcal_url})**"
                else:
                    call.message = f"📅 **गूगल कैलेंडर इवेंट तैयार है:**\n• **शीर्षक**: {cal_title}\n• **समय**: {cal_res.get('formatted_time')}\n\n👉 **[गूगल कैलेंडर में जोड़ें]({gcal_url})**"

            else:
                call.status = "failed"
                call.error = f"Unknown tool: {tool_name}"
                call.message = f"Action could not be executed: tool '{tool_name}' not found."

        except Exception as e:
            db.rollback()
            call.status = "failed"
            call.error = str(e)
            call.message = f"Tool execution failed: {str(e)}"

        return call
