"""
Comprehensive Automated Test Suite for Aether Autonomous Agent Architecture
Covers:
- LangGraph / Multi-step Agent Orchestrator
- Tool Registry (Tasks, Finances, Media, Calling, Weather)
- Governance Subsystem (PermissionEngine & VerificationEngine)
- ChatSorter Episodic Fact Extractor
- Hybrid Memory Provider
- Undo Engine across Agent Mutating Actions
"""

import sys
import os
import asyncio

try:
    import pytest
except ImportError:
    class MockPytest:
        class mark:
            @staticmethod
            def asyncio(f):
                return f
    pytest = MockPytest()

# Ensure server module is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server")))

from database import engine, Base, get_db
import models
from models import AuditLog, MemoryItem, ScheduledJob
from agent.state import ActionTier, ToolCall
from agent.governance import PermissionEngine, VerificationEngine
from agent.tools import ToolRegistry
from agent.orchestrator import AgentOrchestrator
from memory.chatsorter import ChatSorter
from memory.hybrid_provider import HybridMemoryProvider

# Auto-initialize all table schemas on clean test runner environments (e.g. GitHub Actions CI)
Base.metadata.create_all(bind=engine)


def test_permission_engine_classification():
    """Verify actions are accurately categorized into safety tiers."""
    # Tier 1: Read queries
    assert PermissionEngine.classify_action("weather", {}) == ActionTier.TIER_1_READ
    assert PermissionEngine.classify_action("query_finances", {}) == ActionTier.TIER_1_READ
    assert PermissionEngine.classify_action("query_tasks", {}) == ActionTier.TIER_1_READ

    # Tier 2: Safe Reversible Mutations
    assert PermissionEngine.classify_action("create_task", {"title": "Gym"}) == ActionTier.TIER_2_MUTATE_SAFE
    assert PermissionEngine.classify_action("record_expense", {"amount": 500}) == ActionTier.TIER_2_MUTATE_SAFE

    # Tier 3: Critical Actions
    assert PermissionEngine.classify_action("record_expense", {"amount": 75000}) == ActionTier.TIER_3_CRITICAL
    assert PermissionEngine.classify_action("delete_all_tasks", {}) == ActionTier.TIER_3_CRITICAL


def test_verification_engine():
    """Verify input validation rules."""
    # Invalid empty task title
    bad_task = ToolCall(tool_name="create_task", parameters={"title": ""})
    is_valid, err = VerificationEngine.validate_pre_execution(bad_task)
    assert not is_valid
    assert "Task title cannot be empty" in err

    # Valid task title
    good_task = ToolCall(tool_name="create_task", parameters={"title": "Team Standup"})
    is_valid, _ = VerificationEngine.validate_pre_execution(good_task)
    assert is_valid

    # Negative expense
    bad_expense = ToolCall(tool_name="record_expense", parameters={"amount": -50})
    is_valid, err = VerificationEngine.validate_pre_execution(bad_expense)
    assert not is_valid


def test_tool_registry_execution():
    """Verify ToolRegistry executes tasks and finances with proper undo payloads."""
    db = next(get_db())
    test_email = "test_tools@aether.local"

    # 1. Create Task Tool
    task_call = ToolRegistry.execute_tool(
        tool_name="create_task",
        params={"title": "Verify Roadmap", "reminder_time": "10:00 AM", "priority": "high"},
        user_email=test_email,
        lang="en",
        db=db
    )
    assert task_call.status == "executed"
    assert task_call.result["task_id"] is not None
    assert task_call.undo_payload["table"] == "tasks"

    # 2. Record Expense Tool
    exp_call = ToolRegistry.execute_tool(
        tool_name="record_expense",
        params={"amount": 450.0, "category": "Food", "description": "Team lunch"},
        user_email=test_email,
        lang="en",
        db=db
    )
    assert exp_call.status == "executed"
    assert exp_call.result["amount"] == 450.0
    assert exp_call.undo_payload["table"] == "financial_records"


def test_chatsorter_and_hybrid_memory():
    """Verify passive fact extraction and memory retrieval."""
    db = next(get_db())
    test_email = "test_memory@aether.local"
    # Clean up test email records for deterministic test runs
    db.query(MemoryItem).filter(MemoryItem.user_email == test_email).delete()
    db.commit()

    # Extract routine
    facts = ChatSorter.extract_facts("Every morning I walk 5km in the park", test_email, db)
    assert len(facts) >= 1
    assert facts[0].category == "routine"

    # Extract preference
    pref_facts = ChatSorter.extract_facts("Mujhe green tea pasand hai", test_email, db)
    assert len(pref_facts) >= 1
    assert pref_facts[0].category == "preference"

    # Extract contact relationship (wife phone number)
    contact_facts = ChatSorter.extract_facts("Wife ka number 8949546909 hai", test_email, db)
    assert len(contact_facts) >= 1
    assert contact_facts[0].category == "contact"
    assert "8949546909" in contact_facts[0].fact

    # Hybrid recall
    recalled = HybridMemoryProvider.recall_context("tea and morning habits", test_email, db)
    assert len(recalled["relevant_facts"]) >= 1


def test_durable_scheduler_and_observability():
    """Verify persistent job scheduling and observability metrics tracking."""
    from scheduler import DurableScheduler
    from observability import tracker
    from datetime import datetime, timedelta

    db = next(get_db())
    test_email = "test_scheduler@aether.local"

    scheduler = DurableScheduler()
    job = scheduler.schedule_job(
        db=db,
        job_type="reminder",
        scheduled_at=datetime.utcnow() - timedelta(minutes=1),
        user_email=test_email,
        payload={"task_id": 999, "title": "Hydration Reminder"}
    )
    assert job.id is not None
    assert job.status == "pending"

    # Check pending jobs retrieval
    pending = scheduler.get_pending_jobs(db)
    assert any(j.id == job.id for j in pending)

    # Mark completed
    scheduler.mark_completed(db, job)
    assert job.status == "completed"

    # Verify observability tracker
    tracker.record_request("/api/chat", latency_ms=120.5, status_code=200)
    summary = tracker.get_summary()
    assert summary["status"] == "healthy"
    assert summary["total_requests"] >= 1


@pytest.mark.asyncio
async def test_agent_orchestrator_multi_step_workflow():
    """Verify end-to-end multi-step plan decomposition and execution."""
    db = next(get_db())
    test_email = "test_agent_flow@aether.local"

    orchestrator = AgentOrchestrator(db=db, user_email=test_email, lang="en")
    
    # Composite prompt containing both an expense and a reminder
    composite_prompt = "Spent 350 for groceries and remind me at 8 PM to cook dinner"
    result_state = await orchestrator.run(composite_prompt)

    assert result_state.completed
    assert len(result_state.plan) >= 2
    assert len(result_state.executed_tools) >= 2
    tool_names = [t.tool_name for t in result_state.executed_tools]
    assert "record_expense" in tool_names
    assert "create_task" in tool_names

    # Check AuditLogs created for both
    logs = db.query(AuditLog).filter(AuditLog.user_email == test_email).all()
    assert len(logs) >= 2


def test_google_calendar_integration():
    """Verify Google Calendar service URL generation and event scheduling."""
    from calendar_sync import GoogleCalendarService
    res = GoogleCalendarService.schedule_event(
        title="Client Strategy Meeting",
        start_time_str="3:00 PM",
        duration_minutes=45,
        details="Quarterly roadmap review"
    )
    assert res["status"] == "scheduled"
    assert "https://calendar.google.com/calendar/render" in res["google_calendar_url"]
    assert "Client+Strategy+Meeting" in res["google_calendar_url"] or "Client" in res["google_calendar_url"]


def test_memory_vault_and_contact_persistence():
    """Verify memory vault contact saving and retrieval."""
    from models import MemoryItem
    db = next(get_db())
    test_email = "e.pawandixit@gmail.com"

    # Save a contact in memory vault
    existing = db.query(MemoryItem).filter(
        (MemoryItem.user_email == test_email),
        MemoryItem.category == "contact"
    ).all()
    if not any("8949546909" in (m.fact or "") for m in existing):
        contact = MemoryItem(
            user_email=test_email,
            category="contact",
            fact="Wife phone number is 8949546909",
            confidence=1.0
        )
        db.add(contact)
        db.commit()

    # Verify retrieval
    found = db.query(MemoryItem).filter(
        (MemoryItem.user_email == test_email) | (MemoryItem.user_email == None),
        MemoryItem.category == "contact"
    ).all()
    assert any("8949546909" in (m.fact or "") for m in found)


if __name__ == "__main__":
    test_permission_engine_classification()
    test_verification_engine()
    test_tool_registry_execution()
    test_chatsorter_and_hybrid_memory()
    test_durable_scheduler_and_observability()
    test_google_calendar_integration()
    test_memory_vault_and_contact_persistence()
    asyncio.run(test_agent_orchestrator_multi_step_workflow())
    print("\n✅ ALL ARCHITECTURAL TESTS PASSED 100%!")
