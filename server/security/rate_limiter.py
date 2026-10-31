"""
Aether Security Subsystem — Token Bucket Rate Limiter
Prevents brute-force, denial-of-service, and excessive LLM token consumption.
Based on AETHER_SECURITY_REVIEW.md & AETHER_RECOMMENDED_ARCHITECTURE.md (Section 2 APIGateway)
"""

import time
from typing import Dict, Tuple
from collections import defaultdict


class TokenBucketRateLimiter:
    """In-memory sliding window token bucket rate limiter with zero third-party dependencies."""

    def __init__(self, capacity: int = 120, refill_rate_per_sec: float = 2.0):
        self.capacity = capacity
        self.refill_rate = refill_rate_per_sec
        # {client_key: (current_tokens, last_refill_timestamp)}
        self._buckets: Dict[str, Tuple[float, float]] = {}

    def is_allowed(self, client_key: str, cost: float = 1.0) -> Tuple[bool, int, float]:
        """
        Evaluates whether a request from client_key is allowed.
        Returns: (is_allowed: bool, remaining_tokens: int, retry_after_sec: float)
        """
        now = time.time()
        tokens, last_refill = self._buckets.get(client_key, (float(self.capacity), now))

        # Refill tokens based on elapsed time
        elapsed = now - last_refill
        refilled_tokens = min(float(self.capacity), tokens + (elapsed * self.refill_rate))

        if refilled_tokens >= cost:
            # Grant request and decrement tokens
            self._buckets[client_key] = (refilled_tokens - cost, now)
            return True, int(refilled_tokens - cost), 0.0
        else:
            # Deny request and compute retry after
            needed = cost - refilled_tokens
            retry_after = needed / self.refill_rate
            self._buckets[client_key] = (refilled_tokens, now)
            return False, int(refilled_tokens), retry_after
