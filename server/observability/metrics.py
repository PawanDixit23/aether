"""
Aether Observability & System Health Metrics Subsystem.

Tracks bounded, process-local operational telemetry. No request bodies,
query strings, user identifiers, or credentials are retained.
"""

import threading
import time
from datetime import datetime
from typing import Any, Dict, List


class ObservabilityTracker:
    """Collects bounded operational telemetry for Aether."""

    MAX_RECENT_EVENTS = 100
    MAX_ENDPOINTS = 40

    def __init__(self):
        self.start_time = time.time()
        self.total_requests = 0
        self.total_errors = 0
        self.total_llm_calls = 0
        self.total_request_bytes = 0
        self.total_response_bytes = 0
        self.llm_latencies: List[float] = []
        self.recent_events: List[Dict[str, Any]] = []
        self.endpoint_metrics: Dict[str, Dict[str, int]] = {}
        self._lock = threading.Lock()

    def record_request(
        self,
        endpoint: str,
        latency_ms: float,
        status_code: int,
        request_bytes: int = 0,
    ):
        """Record request count, latency, status, and declared inbound bytes."""
        request_bytes = max(0, int(request_bytes or 0))
        with self._lock:
            self.total_requests += 1
            self.total_request_bytes += request_bytes
            if status_code >= 400:
                self.total_errors += 1

            metrics = self.endpoint_metrics.get(endpoint)
            if metrics is None:
                if len(self.endpoint_metrics) >= self.MAX_ENDPOINTS:
                    oldest_endpoint = next(iter(self.endpoint_metrics))
                    self.endpoint_metrics.pop(oldest_endpoint, None)
                metrics = {
                    "requests": 0,
                    "errors": 0,
                    "request_bytes": 0,
                    "response_bytes": 0,
                }
                self.endpoint_metrics[endpoint] = metrics

            metrics["requests"] += 1
            metrics["request_bytes"] += request_bytes
            if status_code >= 400:
                metrics["errors"] += 1

            self.recent_events.append({
                "endpoint": endpoint,
                "latency_ms": round(float(latency_ms), 2),
                "status": int(status_code),
                "timestamp": datetime.utcnow().isoformat(),
            })
            if len(self.recent_events) > self.MAX_RECENT_EVENTS:
                self.recent_events.pop(0)

    def record_response_bytes(self, endpoint: str, byte_count: int):
        """Record actual application response-body bytes as they are streamed."""
        byte_count = max(0, int(byte_count or 0))
        if not byte_count:
            return
        with self._lock:
            self.total_response_bytes += byte_count
            metrics = self.endpoint_metrics.get(endpoint)
            if metrics is None:
                if len(self.endpoint_metrics) >= self.MAX_ENDPOINTS:
                    oldest_endpoint = next(iter(self.endpoint_metrics))
                    self.endpoint_metrics.pop(oldest_endpoint, None)
                metrics = {
                    "requests": 0,
                    "errors": 0,
                    "request_bytes": 0,
                    "response_bytes": 0,
                }
                self.endpoint_metrics[endpoint] = metrics
            metrics["response_bytes"] += byte_count

    def record_llm_call(self, latency_sec: float, model: str = "gemini-flash"):
        with self._lock:
            self.total_llm_calls += 1
            self.llm_latencies.append(latency_sec)
            if len(self.llm_latencies) > 200:
                self.llm_latencies.pop(0)

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            uptime_sec = time.time() - self.start_time
            avg_llm_lat = (
                sum(self.llm_latencies) / len(self.llm_latencies)
                if self.llm_latencies else 0.0
            )
            error_rate = (
                self.total_errors / self.total_requests * 100
                if self.total_requests else 0.0
            )
            endpoints = [
                {"endpoint": endpoint, **metrics}
                for endpoint, metrics in self.endpoint_metrics.items()
            ]
            endpoints.sort(
                key=lambda item: item["response_bytes"] + item["request_bytes"],
                reverse=True,
            )
            return {
                "status": "healthy",
                "uptime_seconds": round(uptime_sec, 1),
                "uptime_hours": round(uptime_sec / 3600, 2),
                "total_requests": self.total_requests,
                "total_errors": self.total_errors,
                "error_rate_pct": round(error_rate, 2),
                "total_llm_calls": self.total_llm_calls,
                "avg_llm_latency_sec": round(avg_llm_lat, 3),
                "total_request_bytes": self.total_request_bytes,
                "total_response_bytes": self.total_response_bytes,
                "endpoint_metrics": endpoints,
                "recent_activity_count": len(self.recent_events),
                "timestamp": datetime.utcnow().isoformat(),
            }


tracker = ObservabilityTracker()
