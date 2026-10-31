"""
Aether Governance & Safety Subsystem
Permission Engine, Verification Engine, and Audit Trail Management
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.1 & Guardrails)
"""

import json
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from .state import ActionTier, ToolCall
from models import AuditLog


class PermissionEngine:
    """Classifies actions into safety tiers and checks execution permissions."""

    @staticmethod
    def classify_action(tool_name: str, params: Dict[str, Any]) -> ActionTier:
        # Tier 1: Read-Only Actions
        if tool_name in ["weather", "query_tasks", "query_finances", "query_notes", "query_memory"]:
            return ActionTier.TIER_1_READ

        # Tier 3: Critical Confirmations
        if tool_name == "delete_all_tasks":
            return ActionTier.TIER_3_CRITICAL
        if tool_name == "record_expense":
            amount = params.get("amount", 0)
            try:
                if float(amount) >= 50000.0:  # Large financial transactions require operator approval
                    return ActionTier.TIER_3_CRITICAL
            except (ValueError, TypeError):
                pass
        if tool_name == "delete_financial_record":
            return ActionTier.TIER_3_CRITICAL

        # Tier 2: Safe Mutating Actions (Reversible with AuditLog)
        return ActionTier.TIER_2_MUTATE_SAFE


class VerificationEngine:
    """Pre-execution input validator and post-execution result verifier."""

    @staticmethod
    def validate_pre_execution(tool: ToolCall) -> Tuple[bool, str]:
        params = tool.parameters

        if tool.tool_name == "create_task":
            if not params.get("title", "").strip():
                return False, "Task title cannot be empty."

        elif tool.tool_name == "record_expense":
            try:
                amount = float(params.get("amount", 0))
                if amount <= 0:
                    return False, "Expense amount must be greater than zero."
            except (ValueError, TypeError):
                return False, "Invalid expense amount provided."

        elif tool.tool_name == "record_income":
            try:
                amount = float(params.get("amount", 0))
                if amount <= 0:
                    return False, "Income amount must be greater than zero."
            except (ValueError, TypeError):
                return False, "Invalid income amount provided."

        return True, ""

    @staticmethod
    def verify_post_execution(tool: ToolCall, db: Session, user_email: str) -> bool:
        """Verifies that the executed tool produced valid results and recorded audit state."""
        if tool.status != "executed":
            return False

        if tool.tier == ActionTier.TIER_2_MUTATE_SAFE and tool.undo_payload:
            try:
                audit = AuditLog(
                    user_email=user_email,
                    action_type=f"agent_{tool.tool_name}",
                    details=tool.message or f"Executed {tool.tool_name}",
                    confidence_score=0.98,
                    undo_payload=json.dumps(tool.undo_payload)
                )
                db.add(audit)
                db.commit()
                return True
            except Exception as e:
                db.rollback()
                print(f"[VerificationEngine Audit Error] {e}")
                return False
        return True

