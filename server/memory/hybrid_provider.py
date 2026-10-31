"""
Hybrid Memory Provider
Combines structured category indexing with keyword ranking for episodic retrieval.
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.3 Hybrid Memory Intelligence)
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import MemoryItem


class HybridMemoryProvider:
    """Retrieves relevant facts and preferences to augment agent context without token bloat."""

    @staticmethod
    def recall_context(query: str, user_email: str, db: Session, limit: int = 6) -> Dict[str, Any]:
        q_tokens = [w.lower() for w in query.split() if len(w) > 3]

        all_memories = db.query(MemoryItem).filter(MemoryItem.user_email == user_email).all()
        if not all_memories:
            return {"relevant_facts": [], "formatted_context": ""}

        # Rank memories based on token overlap + category priority
        scored = []
        for mem in all_memories:
            fact_lower = mem.fact.lower()
            score = 0
            for token in q_tokens:
                if token in fact_lower:
                    score += 2
            # Boost preferences and routines
            if mem.category in ["routine", "preference"]:
                score += 1
            scored.append((score, mem))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_memories = [m for _, m in scored[:limit]]

        formatted = "\n".join([f"• [{m.category.upper()}] {m.fact}" for m in top_memories])
        return {
            "relevant_facts": [m.fact for m in top_memories],
            "formatted_context": formatted
        }

