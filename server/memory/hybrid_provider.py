"""
Aether Hybrid Episodic & Semantic Memory Subsystem
Combines Gemini/Local Dense Vector Embeddings with Keyword & Recency Decay Scoring
Enforces Tenant Isolation (AETH-SEC-02), Vector Normalization (AETH-MEM-01),
and Semantic Deduplication & Temporal Decay (AETH-MEM-02).
"""

import os
import re
import json
import math
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import httpx

from models import MemoryItem


# ─────────────────────────────────────────────────────────────────────────────
# Vector Normalization: 768-dimensional Vector Embeddings (AETH-MEM-01)
# ─────────────────────────────────────────────────────────────────────────────
def _deterministic_local_vector(text: str, dim: int = 768) -> List[float]:
    """
    Generates a deterministic, normalized 768-dimensional float embedding vector
    for local offline execution when Gemini API is unavailable or unconfigured.
    Guarantees exact dimension matching with Gemini text-embedding-004.
    """
    vec = [0.0] * dim
    words = re.findall(r'\w+', text.lower())
    if not words:
        return vec

    for word in words:
        h = hashlib.sha256(word.encode("utf-8")).digest()
        for i in range(min(len(h), 32)):
            idx = (h[i] * 29 + i * 17) % dim
            sign = 1.0 if (h[i] % 2 == 0) else -1.0
            vec[idx] += sign * (float(h[i]) / 255.0)

    # L2 Euclidean Normalization
    magnitude = math.sqrt(sum(x * x for x in vec))
    if magnitude > 1e-9:
        vec = [round(x / magnitude, 6) for x in vec]
    return vec


def get_embedding(text: str) -> List[float]:
    """
    Fetches 768-dim semantic embedding vector from Gemini text-embedding-004,
    or smoothly falls back to 768-dim deterministic local vector in offline mode.
    """
    clean = (text or "").strip()
    if not clean:
        return [0.0] * 768

    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_key}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": clean[:2048]}]}
            }
            with httpx.Client(timeout=4.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    values = data.get("embedding", {}).get("values", [])
                    if len(values) == 768:
                        return values
                    elif len(values) > 0:
                        # Normalize to 768 dimensions if alternate model responds
                        if len(values) > 768:
                            return values[:768]
                        else:
                            return values + [0.0] * (768 - len(values))
        except Exception as e:
            pass

    return _deterministic_local_vector(clean, dim=768)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0

    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for a, b in zip(v1, v2):
        dot += a * b
        norm_a += a * a
        norm_b += b * b

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return max(-1.0, min(1.0, dot / (math.sqrt(norm_a) * math.sqrt(norm_b))))


class HybridMemoryProvider:
    """
    Semantic Vector + Keyword Episodic Retrieval with Temporal Decay & Deduplication.
    Enables deep context awareness, fuzzy question answering, and contact lookup.
    """

    @staticmethod
    def add_or_merge_memory(
        fact: str,
        category: str,
        user_email: str,
        db: Session,
        confidence: float = 1.0,
        importance: float = 1.0
    ) -> MemoryItem:
        """Deduplicate against a bounded candidate set; never load a whole category."""
        clean_fact = (fact or "").strip()
        if not clean_fact:
            raise ValueError("Memory fact cannot be empty")
        new_vec = get_embedding(clean_fact)
        now = datetime.utcnow()

        scoped = db.query(MemoryItem).filter(
            MemoryItem.user_email == user_email,
            MemoryItem.category == category
        )
        exact = scoped.filter(func.lower(MemoryItem.fact) == clean_fact.lower()).order_by(
            MemoryItem.updated_at.desc(), MemoryItem.id.desc()
        ).first()
        candidates = []
        if exact:
            candidates = [exact]
        else:
            tokens = [token.lower() for token in re.findall(r'\b\w{3,}\b', clean_fact)[:8]]
            if tokens:
                candidates = scoped.filter(or_(*[
                    MemoryItem.fact.ilike(f"%{token}%") for token in tokens
                ])).order_by(
                    MemoryItem.importance.desc(), MemoryItem.last_accessed_at.desc(), MemoryItem.id.desc()
                ).limit(200).all()
            if not candidates:
                candidates = scoped.order_by(
                    MemoryItem.importance.desc(), MemoryItem.last_accessed_at.desc(), MemoryItem.id.desc()
                ).limit(200).all()

        for memory in candidates:
            if memory.embedding:
                try:
                    mem_vec = json.loads(memory.embedding)
                    if cosine_similarity(new_vec, mem_vec) >= 0.88:
                        memory.fact = clean_fact
                        memory.confidence = max(memory.confidence or 1.0, confidence)
                        memory.importance = max(getattr(memory, "importance", 1.0) or 1.0, importance)
                        memory.last_accessed_at = now
                        memory.updated_at = now
                        memory.embedding = json.dumps(new_vec)
                        db.commit()
                        db.refresh(memory)
                        return memory
                except Exception:
                    continue

        new_memory = MemoryItem(
            user_email=user_email, category=category, fact=clean_fact,
            confidence=confidence, importance=importance,
            last_accessed_at=now, embedding=json.dumps(new_vec)
        )
        db.add(new_memory)
        db.commit()
        db.refresh(new_memory)
        return new_memory

    @staticmethod
    def recall_context(
        query: str,
        user_email: str,
        db: Session,
        limit: int = 10,
        min_similarity: float = 0.25
    ) -> Dict[str, Any]:
        """Rank a bounded retrieval candidate window; the full vault stays in PostgreSQL."""
        if not query or not query.strip():
            return {"relevant_facts": [], "formatted_context": "", "top_memories": []}

        safe_limit = max(1, min(int(limit), 20))
        q_clean = query.strip()
        q_tokens = [word.lower() for word in re.findall(r'\b\w{3,}\b', q_clean)[:12]]
        q_embedding = get_embedding(q_clean)
        now = datetime.utcnow()

        tenant_scope = or_(
            MemoryItem.user_email == user_email,
            MemoryItem.category == "system_knowledge"
        )
        base_query = db.query(MemoryItem).filter(tenant_scope)
        candidate_by_id = {}

        # Keyword candidates can retrieve older matching memories, while the
        # importance/recency window provides semantic candidates without a table scan in Python.
        if q_tokens:
            keyword_rows = base_query.filter(or_(*[
                MemoryItem.fact.ilike(f"%{token}%") for token in q_tokens
            ])).order_by(
                MemoryItem.importance.desc(), MemoryItem.last_accessed_at.desc(), MemoryItem.id.desc()
            ).limit(200).all()
            for memory in keyword_rows:
                candidate_by_id[memory.id] = memory

        recent_rows = base_query.order_by(
            MemoryItem.importance.desc(), MemoryItem.last_accessed_at.desc(),
            MemoryItem.created_at.desc(), MemoryItem.id.desc()
        ).limit(200).all()
        for memory in recent_rows:
            candidate_by_id.setdefault(memory.id, memory)

        if not candidate_by_id:
            return {"relevant_facts": [], "formatted_context": "", "top_memories": []}

        scored = []
        needs_commit = False
        for memory in candidate_by_id.values():
            fact = (memory.fact or "").strip()
            if not fact:
                continue
            mem_vec = None
            if memory.embedding:
                try:
                    mem_vec = json.loads(memory.embedding)
                except Exception:
                    mem_vec = None
            if not mem_vec or len(mem_vec) != 768:
                mem_vec = get_embedding(fact)

            semantic_score = cosine_similarity(q_embedding, mem_vec)
            fact_lower = fact.lower()
            keyword_score = sum(0.25 for token in q_tokens if token in fact_lower)
            category = (memory.category or "").lower()
            category_boost = 0.15 if category in ["contact", "personal_rule", "preference"] else (
                0.08 if category in ["routine", "context"] else 0.0
            )
            last_date = memory.last_accessed_at or memory.created_at or now
            delta_days = max(0, (now - last_date).days)
            decay_factor = math.exp(-0.005 * delta_days)
            importance = getattr(memory, "importance", 1.0) or 1.0
            score = ((semantic_score * 0.70) + (keyword_score * 0.20) + category_boost) * decay_factor * min(importance, 2.0)
            if score >= min_similarity:
                scored.append((score, semantic_score, memory))

        scored.sort(key=lambda item: item[0], reverse=True)
        top_items = scored[:safe_limit]
        for _, _, memory in top_items:
            memory.last_accessed_at = now
            needs_commit = True
        if needs_commit:
            try:
                db.commit()
            except Exception:
                db.rollback()

        formatted = []
        for _, semantic_score, memory in top_items:
            pct = int(max(0, min(100, semantic_score * 100)))
            formatted.append(f"• [{memory.category.upper()}] (Match: {pct}%) {memory.fact}")
        return {
            "relevant_facts": [memory.fact for _, _, memory in top_items],
            "formatted_context": "\n".join(formatted),
            "top_memories": [memory for _, _, memory in top_items]
        }
