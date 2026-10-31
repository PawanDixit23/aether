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

    # Extract routine
    facts = ChatSorter.extract_facts("Every morning I walk 5km in the park", test_email, db)
    assert len(facts) >= 1
    assert facts[0].category == "routine"

    # Extract preference
    pref_facts = ChatSorter.extract_facts("Mujhe green tea pasand hai", test_email, db)
    assert len(pref_facts) >= 1
    assert pref_facts[0].category == "preference"

    # Hybrid recall
    recalled = HybridMemoryProvider.recall_context("tea and morning habits", test_email, db)
    assert len(recalled["relevant_facts"]) >= 1


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


if __name__ == "__main__":
    test_permission_engine_classification()
    test_verification_engine()
    test_tool_registry_execution()
    test_chatsorter_and_hybrid_memory()
    test_google_calendar_integration()
    asyncio.run(test_agent_orchestrator_multi_step_workflow())
    print("\n✅ ALL ARCHITECTURAL TESTS PASSED 100%!")
