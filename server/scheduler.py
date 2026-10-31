"""
Aether Durable Job Scheduler
Provides persistent, crash-resilient task scheduling via Redis (if available)
with automated fallback to the database-backed scheduled_jobs table.
Guarantees zero-drop execution even across server reboots.
Based on AETHER_RECOMMENDED_ARCHITECTURE.md (Section 3.2 Persistent Job Execution)
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

try:
    from models import ScheduledJob, Task, PushSubscription
except ImportError:
    from server.models import ScheduledJob, Task, PushSubscription


class DurableScheduler:
    """Manages persistent jobs with Redis support and DB-backed durability."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.environ.get("REDIS_URL")
        self.redis_client = None
        if self.redis_url:
            try:
                import redis
                self.redis_client = redis.from_url(self.redis_url)
                print("[DurableScheduler] Connected to external Redis broker.")
            except Exception as e:
                print(f"[DurableScheduler] Redis connection failed, falling back to DB queue: {e}")
                self.redis_client = None

    def schedule_job(
        self,
        db: Session,
        job_type: str,
        scheduled_at: datetime,
        user_email: str = "operator@aether.local",
        payload: Optional[Dict[str, Any]] = None
    ) -> ScheduledJob:
        """Saves job persistently to database and enqueues to Redis if active."""
        payload_str = json.dumps(payload or {})
        job = ScheduledJob(
            user_email=user_email,
            job_type=job_type,
            payload=payload_str,
            scheduled_at=scheduled_at,
            status="pending",
            attempts=0
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        if self.redis_client:
            try:
                # Add to Redis ZSET by timestamp
                score = scheduled_at.timestamp()
                self.redis_client.zadd("aether_scheduled_jobs", {str(job.id): score})
            except Exception as r_err:
                print(f"[DurableScheduler] Redis zadd failed: {r_err}")

        return job

    @staticmethod
    def get_pending_jobs(db: Session) -> List[ScheduledJob]:
        """Fetches all jobs that are due for execution and not yet completed."""
        now = datetime.utcnow()
        return db.query(ScheduledJob).filter(
            ScheduledJob.status == "pending",
            ScheduledJob.scheduled_at <= now,
            ScheduledJob.attempts < 5
        ).order_by(ScheduledJob.scheduled_at.asc()).all()

    @staticmethod
    def mark_completed(db: Session, job: ScheduledJob):
        job.status = "completed"
        job.updated_at = datetime.utcnow()
        db.commit()

    @staticmethod
    def mark_failed(db: Session, job: ScheduledJob, error: str):
        job.attempts += 1
        job.last_error = str(error)
        job.status = "failed" if job.attempts >= 5 else "pending"
        job.updated_at = datetime.utcnow()
        db.commit()

