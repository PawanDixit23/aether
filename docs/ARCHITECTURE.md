# Aether ⚡ — Technical Architecture & Blueprint
> **100% Free-of-Cost, Local-First Autonomous Personal AI Executive & Wealth Assistant**

---

## 1. Core Principles (Zero Cost & Privacy First)
* **Zero Cloud Billing**: Completely runs locally with **SQLite** and **Free-tier LLMs** (Gemini Free API or local **Ollama**).
* **Local-First Privacy**: All memories, financial data, and credentials stay on your device (`aether.db`).
* **Human-in-the-Loop**: 3-level confidence checks prevent destructive or accidental actions.

---

## 2. System Architecture

```
                    ┌───────────────────────────────────────────┐
                    │  Aether Desktop Command Center (Vite/Web) │
                    │   • Quick Capture (Global Hotkey)         │
                    │   • Daily Agenda & Morning Briefing       │
                    │   • Financial Life Dashboard              │
                    │   • Controlled Memory Vault               │
                    └─────────────────────┬─────────────────────┘
                                          │ REST / WebSocket
                    ┌─────────────────────▼─────────────────────┐
                    │      Aether Server Engine (FastAPI)       │
                    │                                           │
                    │  ┌─────────────────────────────────────┐  │
                    │  │      Intent & Action Router         │  │
                    │  │  (Tasks / Expenses / Notes / Memo)  │  │
                    │  └──────────────────┬──────────────────┘  │
                    │                     │                     │
                    │  ┌──────────────────┴──────────────────┐  │
                    │  │  3-Layer Confidence Engine          │  │
                    │  │  • High (>95%): Auto + Undo         │  │
                    │  │  • Med (70-90%): Confirmation Req.  │  │
                    │  │  • Low (<70%): Clarification        │  │
                    │  └──────────────────┬──────────────────┘  │
                    │                     │                     │
                    │  ┌──────────────────┴──────────────────┐  │
                    │  │ LLM Adapter (Free Tier)             │  │
                    │  │ • Google Gemini Free API            │  │
                    │  │ • Local Ollama (Offline / 100% Free)│  │
                    │  └──────────────────┬──────────────────┘  │
                    └─────────────────────┼─────────────────────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │      Local SQLite Database (`aether.db`)   │
                    │  • tasks & reminders                      │
                    │  • financial_records (income/expense/emi) │
                    │  • memory_vault (user facts & preferences)│
                    │  • audit_logs (activity history)          │
                    └───────────────────────────────────────────┘
```

---

## 3. Database Schema (SQLite)

### A. `tasks`
* `id` (INTEGER PRIMARY KEY)
* `title` (TEXT)
* `description` (TEXT)
* `priority` (TEXT: `low`, `medium`, `high`, `urgent`)
* `due_date` (DATETIME)
* `status` (TEXT: `pending`, `in_progress`, `completed`, `cancelled`)
* `created_at` (DATETIME)

### B. `financial_records`
* `id` (INTEGER PRIMARY KEY)
* `type` (TEXT: `expense`, `income`, `emi`, `investment`)
* `category` (TEXT: `food`, `rent`, `fuel`, `utilities`, `client_payment`, etc.)
* `amount` (REAL)
* `currency` (TEXT DEFAULT 'INR')
* `payment_mode` (TEXT: `upi`, `cash`, `card`, `bank_transfer`)
* `note` (TEXT)
* `date` (DATETIME)

### C. `memory_vault`
* `id` (INTEGER PRIMARY KEY)
* `category` (TEXT: `preference`, `personal_rule`, `contact`, `work_context`)
* `fact` (TEXT)
* `confidence` (REAL)
* `created_at` (DATETIME)
* `updated_at` (DATETIME)

### D. `audit_logs`
* `id` (INTEGER PRIMARY KEY)
* `action_type` (TEXT)
* `details` (TEXT)
* `confidence_score` (REAL)
* `executed_at` (DATETIME)
* `undo_payload` (TEXT JSON)
* `is_undone` (BOOLEAN DEFAULT 0)

---

## 4. Confidence Execution Rules
1. **High Confidence (>95%)**:
   - Simple task creation, logging known expense category with clear amount.
   - Action runs immediately. Notification sent with an instant **[Undo]** button.
2. **Medium Confidence (70% - 90%)**:
   - Ambiguous category or large financial amount.
   - Stage action in queue and request `[Approve]` / `[Reject]`.
3. **Low Confidence (<70%)**:
   - Vague instructions (e.g., *"handle that bill"*).
   - Asks a concise clarifying question in natural Hinglish/English.
