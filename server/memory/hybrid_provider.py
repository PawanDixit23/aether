"""
Hybrid Memory Provider with Semantic Vector Embeddings
Combines Google Gemini text-embedding-004 vectors, cosine similarity, 
and category weighting for state-of-the-art episodic retrieval.
"""

import os
import re
import math
import json
import hashlib
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from models import MemoryItem

_EMBEDDING_CACHE: Dict[str, List[float]] = {}
GEMINI_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"


def _deterministic_local_vector(text: str, dim: int = 384) -> List[float]:
    """
    Lightweight, deterministic semantic hash vector for offline/zero-dependency fallback.
    Encodes char 3-grams and tokens with normalization.
    """
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower()).strip()
    tokens = cleaned.split()
    vec = [0.0] * dim
    if not tokens:
        return vec
    
    # 1. Token hashes
    for tok in tokens:
        h = int(hashlib.md5(tok.encode('utf-8')).hexdigest()[:8], 16) % dim
        vec[h] += 1.5
    
    # 2. 3-gram hashes for subword/morphological similarity
    for i in range(len(cleaned) - 2):
        trigram = cleaned[i:i+3]
        h = int(hashlib.sha256(trigram.encode('utf-8')).hexdigest()[:8], 16) % dim
        vec[h] += 0.5
        
    # Normalize vector to unit length
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


def get_embedding(text: str) -> List[float]:
    """
    Generate vector embedding using Gemini text-embedding-004 with automatic caching
    and deterministic local fallback.
    """
    if not text or not text.strip():
        return [0.0] * 768
    
    cleaned = text.strip()
    cache_key = cleaned.lower()
    if cache_key in _EMBEDDING_CACHE:
        return _EMBEDDING_CACHE[cache_key]
    
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if gemini_key:
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.post(
                    f"{GEMINI_EMBEDDING_URL}?key={gemini_key}",
                    json={
                        "model": "models/text-embedding-004",
                        "content": {
                            "parts": [{"text": cleaned[:1200]}]
                        }
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    values = data.get("embedding", {}).get("values")
                    if values and isinstance(values, list):
                        _EMBEDDING_CACHE[cache_key] = values
                        if len(_EMBEDDING_CACHE) > 500:
                            # Prune cache
                            _EMBEDDING_CACHE.pop(next(iter(_EMBEDDING_CACHE)))
                        return values
        except Exception as e:
            # Silently fall back to deterministic vector
            pass
            
    fallback_vec = _deterministic_local_vector(cleaned)
    _EMBEDDING_CACHE[cache_key] = fallback_vec
    return fallback_vec


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = 0.0
    norm1 = 0.0
    norm2 = 0.0
    for a, b in zip(v1, v2):
        dot += a * b
        norm1 += a * a
        norm2 += b * b
    if norm1 <= 0.0 or norm2 <= 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot / (math.sqrt(norm1) * math.sqrt(norm2))))


class HybridMemoryProvider:
    """
    Semantic Vector + Keyword Episodic Retrieval.
    Enables deep context awareness, fuzzy question answering, and contact lookup.
    """

    @staticmethod
    def recall_context(query: str, user_email: str, db: Session, limit: int = 10, min_similarity: float = 0.25) -> Dict[str, Any]:
        if not query or not query.strip():
            return {"relevant_facts": [], "formatted_context": ""}

        q_clean = query.strip()
        q_tokens = [w.lower() for w in re.findall(r'\b\w{3,}\b', q_clean)]
        q_embedding = get_embedding(q_clean)

        all_memories = db.query(MemoryItem).filter(
            (MemoryItem.user_email == user_email) | 
            (MemoryItem.user_email == None) | 
            (MemoryItem.user_email == "operator@aether.local")
        ).all()

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
            
            if not mem_vec:
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

            total_score = (semantic_score * 0.70) + (keyword_score * 0.20) + cat_boost

            if total_score >= min_similarity:
                scored.append((total_score, semantic_score, mem))

        if needs_commit:
            try:
                db.commit()
            except Exception:
                db.rollback()

        # Sort descending by total score
        scored.sort(key=lambda x: x[0], reverse=True)
        top_items = scored[:limit]

        formatted_lines = []
        for total_s, sem_s, m in top_items:
            pct = int(max(0, min(100, sem_s * 100)))
            formatted_lines.append(f"• [{m.category.upper()}] (Match: {pct}%) {m.fact}")

        return {
            "relevant_facts": [m.fact for _, _, m in top_items],
            "formatted_context": "\n".join(formatted_lines),
            "top_memories": [m for _, _, m in top_items]
        }
