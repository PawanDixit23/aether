"""
Aether Autonomous Agent Orchestrator
Executes multi-step reasoning, tool dispatch, verification, and human-in-the-loop governance.
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.1 LangGraph Autonomous Agent Orchestrator)
"""

import re
import json
import os
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from .state import AgentState, ToolCall, ActionTier
from .governance import PermissionEngine, VerificationEngine
from .tools import ToolRegistry


class AgentOrchestrator:
    """Multi-step Autonomous Agent Orchestrator."""

    def __init__(self, db: Session, user_email: str = "operator@aether.local", lang: str = "auto"):
        self.db = db
        self.user_email = user_email
        self.lang = lang

    async def run(self, user_prompt: str, context: Optional[Dict[str, Any]] = None) -> AgentState:
        state = AgentState(
            user_msg=user_prompt,
            user_email=self.user_email,
            language=self.lang,
            context=context or {}
        )

        # 1. Multi-Step Plan Decomposition
        state.plan = self._decompose_plan(user_prompt)

        # 2. Execution Cycle across Plan Steps
        messages = []
        for step_idx, step_desc in enumerate(state.plan):
            state.current_step_idx = step_idx
            
            # Resolve tool and parameters for this step
            tool_name, params = self._resolve_tool_for_step(step_desc, user_prompt, context)
            if not tool_name:
                continue

            tool_call = ToolCall(tool_name=tool_name, parameters=params)

            # Governance: Permission Engine Check
            tier = PermissionEngine.classify_action(tool_name, params)
            tool_call.tier = tier

            if tier == ActionTier.TIER_3_CRITICAL:
                state.requires_approval = True
                state.approval_prompt = (
                    f"⚠️ **Approval Required for Critical Action:**\n"
                    f"Aether wants to execute **{tool_name}** with details: {json.dumps(params)}.\n"
                    f"Do you authorize this transaction?"
                )
                tool_call.status = "waiting_approval"
                state.executed_tools.append(tool_call)
                state.final_message = state.approval_prompt
                return state

            # Governance: Verification Engine Pre-Execution Check
            is_valid, validation_err = VerificationEngine.validate_pre_execution(tool_call)
            if not is_valid:
                tool_call.status = "failed"
                tool_call.error = validation_err
                state.executed_tools.append(tool_call)
                messages.append(f"❌ Verification failed for {tool_name}: {validation_err}")
                continue

            # Execute Tool
            executed_call = ToolRegistry.execute_tool(
                tool_name=tool_name,
                params=params,
                user_email=self.user_email,
                lang=self.lang,
                db=self.db
            )
            state.executed_tools.append(executed_call)

            # Governance: Verification Engine Post-Execution & Audit Trail
            if executed_call.status == "executed":
                VerificationEngine.verify_post_execution(executed_call, self.db, self.user_email)
                if executed_call.message:
                    messages.append(executed_call.message)
            else:
                messages.append(f"⚠️ {executed_call.message}")

        # 3. Response Synthesis
        state.completed = True
        state.final_message = "\n\n".join(messages) if messages else "Execution completed successfully."
        return state

    def _decompose_plan(self, prompt: str) -> List[str]:
        """Decomposes compound user prompts into distinct executable steps."""
        p_lower = prompt.lower()
        steps = []

        # Check for multiple actions joined by conjunctions
        parts = re.split(r'\b(?:and then|after that|aur phir|and|aur|तथा|और)\b', prompt, flags=re.IGNORECASE)
        clean_parts = [p.strip() for p in parts if p.strip()]

        if len(clean_parts) > 1:
            return clean_parts

        return [prompt]

    def _resolve_tool_for_step(self, step_text: str, full_prompt: str, context: Optional[Dict[str, Any]]) -> (Optional[str], Dict[str, Any]):
        """Resolves specific tool and parameters for a plan step."""
        text_lower = step_text.lower()

        # 1. Finance: Expense / Balance
        if any(w in text_lower for w in ["spent", "kharch", "paid", "expense", "debit", "rupaye diye"]):
            m = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)', text_lower)
            amt = float(m.group(1).replace(",", "")) if m else 100.0
            cat_match = re.search(r'\bfor\s+([a-zA-Z\s]+)', text_lower)
            desc = cat_match.group(1).strip() if cat_match else "Expense"
            return "record_expense", {"amount": amt, "description": desc, "category": "General"}

        if any(w in text_lower for w in ["balance", "budget", "total spend", "kul kharch", "bachat"]):
            return "query_finances", {}

        # 2. Tasks & Reminders
        if any(w in text_lower for w in ["remind", "yaad dilana", "task", "agenda", "meeting", "call at"]):
            # Extract time
            t_match = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))', text_lower)
            r_time = t_match.group(1).upper() if t_match else None
            clean_title = re.sub(r'(?i)\b(remind me to|reminder for|mujhe yaad dilana|task add karo|set reminder)\b', '', step_text).strip()
            return "create_task", {"title": clean_title or step_text, "reminder_time": r_time, "priority": "medium"}

        # 3. Weather
        if any(w in text_lower for w in ["weather", "temperature", "mausam"]):
            return "weather", {}

        # 4. YouTube
        if any(w in text_lower for w in ["youtube", "gana", "song", "play", "video"]):
            q = re.sub(r'(?i)\b(play|on youtube|youtube|song|gana|chalao)\b', '', step_text).strip()
            return "resolve_youtube", {"query": q or "Trending"}

        # 5. Calling
        if any(w in text_lower for w in ["call", "phone", "dial"]):
            p_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', step_text)
            num = p_match.group(1).replace(" ", "") if p_match else ""
            c_name = re.sub(r'(?i)\b(call|phone|ko|karo|lagao)\b', '', step_text).strip()
            return "create_call_card", {"contact_name": c_name or "Contact", "phone_number": num}

        return None, {}

