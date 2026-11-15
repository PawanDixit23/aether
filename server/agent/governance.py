"""
Aether Governance & Safety Subsystem
Permission Engine, Verification Engine, Audit Trail Management & Action Approval Manager
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.1 & Guardrails)
Fulfills AETH-SEC-03 (Denial by Default) and AETH-SEC-04 (Action Approval Tampering Prevention)
"""

import json
import uuid
import time
import hmac
import hashlib
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from .state import ActionTier, ToolCall
from models import AuditLog


# ─────────────────────────────────────────────────────────────────────────────
# Registered Tools & Tier Allowlist (AETH-SEC-03: Denial by Default)
# ─────────────────────────────────────────────────────────────────────────────
REGISTERED_TOOLS: Dict[str, ActionTier] = {
    # Tier 1: Read-Only Actions
    "weather": ActionTier.TIER_1_READ,
    "query_tasks": ActionTier.TIER_1_READ,
    "query_finances": ActionTier.TIER_1_READ,
    "query_notes": ActionTier.TIER_1_READ,
    "query_memory": ActionTier.TIER_1_READ,
    "resolve_youtube": ActionTier.TIER_1_READ,

    # Tier 2: Safe Mutating Actions (Reversible with AuditLog undo)
    "create_task": ActionTier.TIER_2_MUTATE_SAFE,
    "create_multi_tasks": ActionTier.TIER_2_MUTATE_SAFE,
    "record_expense": ActionTier.TIER_2_MUTATE_SAFE,
    "record_income": ActionTier.TIER_2_MUTATE_SAFE,
    "save_memory": ActionTier.TIER_2_MUTATE_SAFE,
    "draft_email": ActionTier.TIER_2_MUTATE_SAFE,
    "calendar_event": ActionTier.TIER_2_MUTATE_SAFE,

    # Tier 3: Critical Confirmations (Destructive, External Messages, Large Funds)
    "delete_all_tasks": ActionTier.TIER_3_CRITICAL,
    "delete_task": ActionTier.TIER_3_CRITICAL,
    "delete_financial_record": ActionTier.TIER_3_CRITICAL,
    "delete_memory": ActionTier.TIER_3_CRITICAL,
    "bulk_delete": ActionTier.TIER_3_CRITICAL,
    "send_whatsapp": ActionTier.TIER_3_CRITICAL,
    "send_email": ActionTier.TIER_3_CRITICAL,
    "send_sms": ActionTier.TIER_3_CRITICAL,
    "send_message": ActionTier.TIER_3_CRITICAL,
    "make_payment": ActionTier.TIER_3_CRITICAL,
    "transfer_money": ActionTier.TIER_3_CRITICAL,
    "create_call_card": ActionTier.TIER_3_CRITICAL,
}


class PermissionEngine:
    """Classifies actions into safety tiers and checks execution permissions."""

    @staticmethod
    def classify_action(tool_name: str, params: Dict[str, Any]) -> ActionTier:
        # AETH-SEC-03: Unknown or unlisted tools are DENIED by default
        if tool_name not in REGISTERED_TOOLS:
            return ActionTier.TIER_DENIED

        base_tier = REGISTERED_TOOLS[tool_name]

        # Dynamic Threshold Escalation: High-value financial transactions escalate to Tier 3
        if tool_name in ["record_expense", "record_income"]:
            amount = params.get("amount", 0)
            try:
                if float(amount) >= 50000.0:  # Transactions >= 50,000 INR require operator approval
                    return ActionTier.TIER_3_CRITICAL
            except (ValueError, TypeError):
                pass

        return base_tier


class ActionApprovalManager:
    """
    Manages pending Tier 3 approvals with canonical parameter hashing,
    single-use consumption, and 10-minute expiration to prevent parameter
    tampering and replay attacks (AETH-SEC-04).
    """
    _pending_approvals: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def compute_canonical_hash(cls, tool_name: str, params: Dict[str, Any]) -> str:
        canonical_str = f"{tool_name}:{json.dumps(params, sort_keys=True)}"
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @classmethod
    def create_approval_request(
        cls,
        tool_name: str,
        params: Dict[str, Any],
        user_email: str,
        ttl_seconds: int = 600
    ) -> Dict[str, Any]:
        action_id = f"act_{uuid.uuid4().hex[:16]}"
        param_hash = cls.compute_canonical_hash(tool_name, params)
        now = time.time()
        record = {
            "action_id": action_id,
            "tool_name": tool_name,
            "params": params,
            "param_hash": param_hash,
            "user_email": str(user_email).strip().lower(),
            "created_at": now,
            "expires_at": now + ttl_seconds,
            "consumed": False
        }
        cls._pending_approvals[action_id] = record
        cls._prune_expired()
        return {
            "action_id": action_id,
            "param_hash": param_hash,
            "expires_at": record["expires_at"]
        }

    @classmethod
    def verify_and_consume(
        cls,
        action_id: str,
        tool_name: str,
        params: Dict[str, Any],
        user_email: str
    ) -> Tuple[bool, str]:
        record = cls._pending_approvals.get(action_id)
        if not record:
            return False, "Approval request not found or already consumed"

        if record.get("consumed"):
            return False, "Approval token has already been used (Replay attack prevented)"

        if time.time() > record.get("expires_at", 0):
            cls._pending_approvals.pop(action_id, None)
            return False, "Approval request has expired (10-minute TTL)"

        if record.get("user_email") != str(user_email).strip().lower():
            return False, "User mismatch for this approval token"

        if record.get("tool_name") != tool_name:
            return False, f"Tool mismatch: expected {record.get('tool_name')}, got {tool_name}"

        current_hash = cls.compute_canonical_hash(tool_name, params)
        if not hmac.compare_digest(current_hash, record.get("param_hash", "")):
            return False, "Parameter tampering detected! Provided parameters do not match approved payload."

        # Mark as consumed atomically
        record["consumed"] = True
        return True, "Authorized"

    @classmethod
    def _prune_expired(cls):
        now = time.time()
        to_del = [aid for aid, r in cls._pending_approvals.items() if now > r.get("expires_at", 0) + 3600]
        for aid in to_del:
            cls._pending_approvals.pop(aid, None)


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
