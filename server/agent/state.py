"""
Aether Autonomous Agent State Definition
Based on AETHER_RECOMMENDED_ARCHITECTURE.md Specification (Section 3.1)
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum


class ActionTier(str, Enum):
    TIER_1_READ = "tier_1_read"             # Safe read-only queries (weather, search, balance check)
    TIER_2_MUTATE_SAFE = "tier_2_mutate"     # Safe, reversible mutations (tasks, notes, reminders, expense logging)
    TIER_3_CRITICAL = "tier_3_critical"      # Irreversible / sensitive actions (large deletions, external dispatch)


class ToolCall(BaseModel):
    tool_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    tier: ActionTier = ActionTier.TIER_2_MUTATE_SAFE
    status: str = "pending"  # pending, executed, failed, waiting_approval
    result: Optional[Any] = None
    error: Optional[str] = None
    undo_payload: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class AgentState(BaseModel):
    user_msg: str
    user_email: str = "operator@aether.local"
    language: str = "auto"  # 'auto', 'en', 'hi', 'hinglish'
    plan: List[str] = Field(default_factory=list)
    current_step_idx: int = 0
    executed_tools: List[ToolCall] = Field(default_factory=list)
    memory_context: Dict[str, Any] = Field(default_factory=dict)
    requires_approval: bool = False
    approval_prompt: Optional[str] = None
    final_message: Optional[str] = None
    completed: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)
