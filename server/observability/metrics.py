"""
Aether Observability & System Health Metrics Subsystem
Tracks distributed spans, endpoint latency, LLM inference times, and error rates.
Based on AETHER_TECHNOLOGY_GAP_ANALYSIS.md (Section 3 Observability)
"""

import time
import os
from datetime import datetime
from typing import Dict, Any, List


class ObservabilityTracker:
    """Collects and aggregates real-time operational telemetry for Aether."""

    def __init__(self):
        self.start_time = time.time()
        self.total_requests = 0
        self.total_errors = 0
        self.total_llm_calls = 0
        self.llm_latencies: List[float] = []
        self.recent_events: List[Dict[str, Any]] = []

    def record_request(self, endpoint: str, latency_ms: float, status_code: int):
        self.total_requests += 1
        if status_code >= 400:
            self.total_errors += 1
        event = {
            "endpoint": endpoint,
            "latency_ms": round(latency_ms, 2),
            "status": status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.recent_events.append(event)
        if len(self.recent_events) > 100:
            self.recent_events.pop(0)

    def record_llm_call(self, latency_sec: float, model: str = "gemini-flash"):
        self.total_llm_calls += 1
        self.llm_latencies.append(latency_sec)
        if len(self.llm_latencies) > 200:
            self.llm_latencies.pop(0)

    def get_summary(self) -> Dict[str, Any]:
        uptime_sec = time.time() - self.start_time
        avg_llm_lat = (sum(self.llm_latencies) / len(self.llm_latencies)) if self.llm_latencies else 0.0
        error_rate = (self.total_errors / self.total_requests * 100) if self.total_requests > 0 else 0.0

        return {
            "status": "healthy",
            "uptime_seconds": round(uptime_sec, 1),
            "uptime_hours": round(uptime_sec / 3600, 2),
            "total_requests": self.total_requests,
            "total_errors": self.total_errors,
            "error_rate_pct": round(error_rate, 2),
            "total_llm_calls": self.total_llm_calls,
            "avg_llm_latency_sec": round(avg_llm_lat, 3),
            "recent_activity_count": len(self.recent_events),
            "timestamp": datetime.utcnow().isoformat()
        }


# Global Singleton Metrics Tracker
tracker = ObservabilityTracker()

