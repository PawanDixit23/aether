"""
Aether Governance & Safety Subsystem
Permission Engine, Verification Engine, Audit Trail Management & Action Approval Manager
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.1 & Guardrails)
Fulfills AETH-SEC-03 (Denial by Default) and AETH-SEC-04 (Action Approval Tampering Prevention)
"""

import os
import re
import json
import uuid
import time
import hmac
import hashlib
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from .state import ActionTier, ToolCall
from models import AuditLog, ActionApproval
from datetime import datetime

UUID_REGEX = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)


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
    atomic DB-persisted single-use consumption, and 10-minute expiration
    to prevent parameter tampering, multi-worker race conditions, and replay attacks (AETH-P0-03).
    Fail-closed: In-memory fallbacks are prohibited from authorizing sensitive actions.
    """
    _pending_approvals: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def compute_canonical_hash(cls, tool_name: str, params: Dict[str, Any]) -> str:
        """Deterministic canonical JSON serialization for secure parameter hashing."""
        canonical_str = f"{tool_name}:{json.dumps(params, sort_keys=True, separators=(',', ':'), ensure_ascii=True)}"
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @classmethod
    def create_approval_request(
        cls,
        tool_name: str,
        params: Dict[str, Any],
        user_email: str,
        owner_user_id: Optional[str] = None,
        ttl_seconds: int = 600,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        action_id = f"act_{uuid.uuid4().hex[:16]}"
        param_hash = cls.compute_canonical_hash(tool_name, params)
        now = time.time()
        expires_at = now + ttl_seconds
        clean_email = str(user_email).strip().lower()

        # Database persistence and strict UUID ownership are mandatory for fail-closed security (AETH-P0-03)
        env = os.environ.get("ENVIRONMENT", "production").lower()
        is_prod = env in ["prod", "production"]
        if is_prod:
            if not owner_user_id or not UUID_REGEX.match(str(owner_user_id).strip()):
                raise RuntimeError("Valid immutable owner UUID is required to create action approval in production")
            clean_user_id = str(owner_user_id).strip()
        else:
            clean_user_id = str(owner_user_id or user_email).strip()

        if not db and is_prod:
            raise RuntimeError("Database session required to create durable action approval in production")

        if db:
            db_record = ActionApproval(
                action_id=action_id,
                owner_user_id=clean_user_id,
                user_email=clean_email,
                tool_name=tool_name,
                param_hash=param_hash,
                params_json=json.dumps(params, sort_keys=True, separators=(',', ':')),
                expires_at=expires_at,
                consumed=False
            )
            db.add(db_record)
            db.commit()
        else:
            # If DB not provided in lightweight unit test, record in memory
            cls._pending_approvals[action_id] = {
                "action_id": action_id,
                "tool_name": tool_name,
                "params": params,
                "param_hash": param_hash,
                "user_email": clean_email,
                "owner_user_id": clean_user_id,
                "created_at": now,
                "expires_at": expires_at,
                "consumed": False
            }

        return {
            "action_id": action_id,
            "param_hash": param_hash,
            "expires_at": expires_at
        }

    @classmethod
    def verify_and_consume(
        cls,
        action_id: str,
        tool_name: str,
        params: Dict[str, Any],
        user_email: str,
        owner_user_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Tuple[bool, str]:
        now = time.time()
        clean_email = str(user_email).strip().lower()
        env = os.environ.get("ENVIRONMENT", "production").lower()
        is_prod = env in ["prod", "production"]
        if is_prod:
            if not owner_user_id or not UUID_REGEX.match(str(owner_user_id).strip()):
                return False, "Valid immutable owner UUID is required for action authorization in production"
            clean_user_id = str(owner_user_id).strip()
        else:
            clean_user_id = str(owner_user_id or user_email).strip()
        current_hash = cls.compute_canonical_hash(tool_name, params)

        # 1. DB-backed atomic consumption (AETH-P0-03)
        if db:
            try:
                # Atomic conditional UPDATE with ALL security predicates
                rows_updated = db.query(ActionApproval).filter(
                    ActionApproval.action_id == action_id,
                    ActionApproval.owner_user_id == clean_user_id,
                    ActionApproval.tool_name == tool_name,
                    ActionApproval.param_hash == current_hash,
                    ActionApproval.expires_at >= now,
                    ActionApproval.consumed == False
                ).update({
                    ActionApproval.consumed: True,
                    ActionApproval.consumed_at: datetime.utcnow()
                }, synchronize_session=False)
                # The caller owns the SQLAlchemy transaction. Do not commit here:
                # verify_and_consume may run inside an explicit transaction context,
                # and committing it would close the caller's transaction prematurely.
                if rows_updated > 0:
                    return True, "Authorized"

                # If update matched 0 rows, check specific reason
                existing = db.query(ActionApproval).filter(ActionApproval.action_id == action_id).first()
                if not existing:
                    return False, "Approval request not found"
                if existing.consumed:
                    return False, "Approval token has already been used (Replay attack prevented)"
                if now > existing.expires_at:
                    return False, "Approval request has expired (10-minute TTL)"
                if existing.owner_user_id != clean_user_id:
                    return False, "User mismatch for this approval token"
                if existing.tool_name != tool_name:
                    return False, f"Tool mismatch: expected {existing.tool_name}, got {tool_name}"
                if not hmac.compare_digest(current_hash, existing.param_hash):
                    return False, "Parameter tampering detected! Provided parameters do not match approved payload."
                return False, "Approval token consumption rejected"
            except Exception as e:
                # Leave rollback/transaction cleanup to the caller. If the DB transaction
                # is invalidated by the error, the caller's transaction context will roll it back.
                return False, f"Database error during approval verification: {e}"

        # 2. In-memory check strictly forbidden in production (AETH-P0-03)
        env = os.environ.get("ENVIRONMENT", "production").lower()
        if env in ["prod", "production"]:
            return False, "Database session required for critical action authorization in production (Fail Closed)"

        # Standalone test/dev fallback only when explicitly not in production
        record = cls._pending_approvals.get(action_id)
        if not record:
            return False, "Approval request not found or already consumed"
        if record.get("consumed"):
            return False, "Approval token has already been used (Replay attack prevented)"
        if now > record.get("expires_at", 0):
            cls._pending_approvals.pop(action_id, None)
            return False, "Approval request has expired (10-minute TTL)"
        if record.get("owner_user_id") != clean_user_id:
            return False, "User mismatch for this approval token"
        if record.get("tool_name") != tool_name:
            return False, f"Tool mismatch: expected {record.get('tool_name')}, got {tool_name}"
        if not hmac.compare_digest(current_hash, record.get("param_hash", "")):
            return False, "Parameter tampering detected! Provided parameters do not match approved payload."

        record["consumed"] = True
        return True, "Authorized"


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
