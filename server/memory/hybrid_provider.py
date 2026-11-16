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
from sqlalchemy import or_
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
        """
        Deduplicates incoming memory against existing items using cosine similarity threshold 0.88 (AETH-MEM-02).
        If duplicate detected, updates existing memory instead of inserting redundant row.
        """
        clean_fact = (fact or "").strip()
        new_vec = get_embedding(clean_fact)
        now = datetime.utcnow()

        # Search a bounded keyword candidate set first; if the fact has no
        # useful tokens, fall back to a small recency/importance sample.
        tokens = list(dict.fromkeys(re.findall(r"\\b\\w{3,}\\b", clean_fact.lower())))[:8]
        candidate_query = db.query(MemoryItem).filter(
            MemoryItem.user_email == user_email,
            MemoryItem.category == category
        )
        if tokens:
            existing = candidate_query.filter(or_(*[
                MemoryItem.fact.ilike(f"%{token}%") for token in tokens
            ])).order_by(
                MemoryItem.importance.desc(),
                MemoryItem.last_accessed_at.desc(),
                MemoryItem.id.desc()
            ).limit(200).all()
        else:
            existing = candidate_query.order_by(
                MemoryItem.importance.desc(),
                MemoryItem.last_accessed_at.desc(),
                MemoryItem.id.desc()
            ).limit(200).all()

        for mem in existing:
            if mem.embedding:
                try:
                    mem_vec = json.loads(mem.embedding)
                    sim = cosine_similarity(new_vec, mem_vec)
                    if sim >= 0.88:
                        # High similarity detected: merge and update existing memory
                        mem.fact = clean_fact
                        mem.confidence = max(mem.confidence or 1.0, confidence)
                        mem.importance = max(getattr(mem, "importance", 1.0) or 1.0, importance)
                        mem.last_accessed_at = now
                        mem.updated_at = now
                        mem.embedding = json.dumps(new_vec)
                        db.commit()
                        db.refresh(mem)
                        return mem
                except Exception:
                    pass

        # No duplicate: insert new memory item
        new_mem = MemoryItem(
            user_email=user_email,
            category=category,
            fact=clean_fact,
            confidence=confidence,
            importance=importance,
            last_accessed_at=now,
            embedding=json.dumps(new_vec)
        )
        db.add(new_mem)
        db.commit()
        db.refresh(new_mem)
        return new_mem

    @staticmethod
    def recall_context(
        query: str,
        user_email: str,
        db: Session,
        limit: int = 10,
        min_similarity: float = 0.25
    ) -> Dict[str, Any]:
        if not query or not query.strip():
            return {"relevant_facts": [], "formatted_context": ""}

        q_clean = query.strip()
        q_tokens = [w.lower() for w in re.findall(r'\b\w{3,}\b', q_clean)]
        q_embedding = get_embedding(q_clean)
        now = datetime.utcnow()

        # Candidate retrieval is deliberately bounded. The current schema stores
        # embeddings as JSON text (not a pgvector column), so loading/scoring the
        # entire vault here would transfer every memory on every AI request.
        # Until pgvector is enabled, rank a capped candidate window in SQL and
        # score only those rows in Python.
        candidate_limit = max(100, min(int(limit) * 40, 500))
        token_filters = [
            MemoryItem.fact.ilike(f"%{token}%")
            for token in dict.fromkeys(q_tokens[:8])
        ]
        from sqlalchemy import or_
        tenant_scope = (
            (MemoryItem.user_email == user_email) |
            (MemoryItem.category == "system_knowledge")
        )
        candidate_query = db.query(MemoryItem).filter(tenant_scope)
        if token_filters:
            keyword_candidates = candidate_query.filter(or_(*token_filters)).order_by(
                MemoryItem.importance.desc(),
                MemoryItem.last_accessed_at.desc(),
                MemoryItem.id.desc()
            ).limit(candidate_limit).all()
        else:
            keyword_candidates = []

        # Fill remaining slots with a bounded recency/importance sample. Merge
        # by ID so keyword candidates retain priority without duplicates.
        remaining = max(0, candidate_limit - len(keyword_candidates))
        recent_candidates = (
            candidate_query.order_by(
                MemoryItem.importance.desc(),
                MemoryItem.last_accessed_at.desc(),
                MemoryItem.id.desc()
            ).limit(candidate_limit).all()
            if remaining else []
        )
        candidate_by_id = {item.id: item for item in keyword_candidates}
        for item in recent_candidates:
            if len(candidate_by_id) >= candidate_limit:
                break
            candidate_by_id.setdefault(item.id, item)
        all_memories = list(candidate_by_id.values())

        if not all_memories:
            return {"relevant_facts": [], "formatted_context": ""}

        scored = []
        needs_commit = False

        for mem in all_memories:
            fact_str = (mem.fact or "").strip()
            if not fact_str:
                continue

            # Load or compute vector embedding
            mem_vec = None
            if mem.embedding:
                try:
                    mem_vec = json.loads(mem.embedding)
                except Exception:
                    mem_vec = None
            
            if not mem_vec or len(mem_vec) != 768:
                mem_vec = get_embedding(fact_str)
                try:
                    mem.embedding = json.dumps(mem_vec)
                    needs_commit = True
                except Exception:
                    pass

            # 1. Semantic Cosine Similarity
            semantic_score = cosine_similarity(q_embedding, mem_vec)

            # 2. Token overlap boost
            fact_lower = fact_str.lower()
            keyword_score = 0.0
            for tok in q_tokens:
                if tok in fact_lower:
                    keyword_score += 0.25

            # 3. Category weighting
            cat = (mem.category or "").lower()
            cat_boost = 0.0
            if cat in ["contact", "personal_rule", "preference"]:
                cat_boost = 0.15
            elif cat in ["routine", "context"]:
                cat_boost = 0.08

            # 4. Temporal Decay Scoring (AETH-MEM-02)
            last_date = mem.last_accessed_at or mem.created_at or now
            delta_days = max(0, (now - last_date).days)
            # Gentle exponential decay over 90+ days
            decay_factor = math.exp(-0.005 * delta_days)
            importance = getattr(mem, "importance", 1.0) or 1.0

            total_score = ((semantic_score * 0.70) + (keyword_score * 0.20) + cat_boost) * decay_factor * min(importance, 2.0)

            if total_score >= min_similarity:
                scored.append((total_score, semantic_score, mem))

        # Sort descending by total score
        scored.sort(key=lambda x: x[0], reverse=True)
        top_items = scored[:limit]

        # Touch last_accessed_at for retrieved memories
        for _, _, m in top_items:
            m.last_accessed_at = now
            needs_commit = True

        if needs_commit:
            try:
                db.commit()
            except Exception:
                db.rollback()

        formatted_lines = []
        for total_s, sem_s, m in top_items:
            pct = int(max(0, min(100, sem_s * 100)))
            formatted_lines.append(f"• [{m.category.upper()}] (Match: {pct}%) {m.fact}")

        return {
            "relevant_facts": [m.fact for _, _, m in top_items],
            "formatted_context": "\n".join(formatted_lines),
            "top_memories": [m for _, _, m in top_items]
        }
