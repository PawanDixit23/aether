import os
import sys
import unittest
from datetime import datetime
from uuid import uuid4

SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, SERVER_DIR)

from database import SessionLocal, engine, set_worker_context
from models import (
    Task, FinancialRecord, MemoryItem, AuditLog, ChatMessage,
    PushSubscription, ScheduledJob,
)
from sqlalchemy.exc import DBAPIError


@unittest.skipUnless(engine.dialect.name == "postgresql", "requires PostgreSQL with RLS enabled")
class TestPostgresTenantRLS(unittest.TestCase):
    def setUp(self):
        suffix = uuid4().hex
        self.email_a = f"tenant-a-{suffix}@example.test"
        self.email_b = f"tenant-b-{suffix}@example.test"
        self.user_a = str(uuid4())
        self.user_b = str(uuid4())
        self.ids = {}

    def session_for(self, user_id=None, email=None):
        db = SessionLocal()
        if user_id and email:
            db.info["tenant_user_id"] = user_id
            db.info["tenant_user_email"] = email
        return db

    def test_all_tenant_tables_are_isolated_and_owner_email_cannot_be_spoofed(self):
        models_and_rows = [
            (Task, Task(user_email=self.email_a, title="private task")),
            (FinancialRecord, FinancialRecord(user_email=self.email_a, type="expense", amount=123.0)),
            (MemoryItem, MemoryItem(user_email=self.email_a, category="note", fact="private memory")),
            (AuditLog, AuditLog(user_email=self.email_a, action_type="test", details="private audit")),
            (ChatMessage, ChatMessage(user_email=self.email_a, role="user", content="private chat")),
            (PushSubscription, PushSubscription(
                user_email=self.email_a,
                endpoint=f"https://push.example.test/{uuid4().hex}",
                p256dh="test-p256dh",
                auth="test-auth",
            )),
            (ScheduledJob, ScheduledJob(
                user_email=self.email_a,
                job_type="test",
                scheduled_at=datetime.utcnow(),
            )),
        ]

        alice = self.session_for(self.user_a, self.email_a)
        try:
            for model, row in models_and_rows:
                alice.add(row)
            alice.commit()
            for model, row in models_and_rows:
                self.assertEqual(row.owner_user_id, self.user_a)
                self.ids[model] = row.id
        finally:
            alice.close()

        bob = self.session_for(self.user_b, self.email_b)
        try:
            for model, _ in models_and_rows:
                self.assertIsNone(bob.query(model).filter(model.id == self.ids[model]).first())
                changed = bob.query(model).filter(model.id == self.ids[model]).update(
                    {"user_email": self.email_b}, synchronize_session=False
                )
                self.assertEqual(changed, 0)
                deleted = bob.query(model).filter(model.id == self.ids[model]).delete(
                    synchronize_session=False
                )
                self.assertEqual(deleted, 0)

            forged = Task(
                user_email=self.email_a,
                owner_user_id=self.user_b,
                title="spoofed owner email",
            )
            bob.add(forged)
            with self.assertRaises(DBAPIError):
                bob.commit()
            bob.rollback()
        finally:
            bob.close()

        # The same session must receive its tenant context again after COMMIT.
        alice_again = self.session_for(self.user_a, self.email_a)
        try:
            self.assertIsNotNone(
                alice_again.query(Task).filter(Task.id == self.ids[Task]).first()
            )
            alice_again.add(Task(user_email=self.email_a, title="after-commit context"))
            alice_again.commit()
            self.assertEqual(
                alice_again.query(Task).filter(Task.title == "after-commit context").first().owner_user_id,
                self.user_a,
            )
            for model, _ in models_and_rows:
                row = alice_again.query(model).filter(model.id == self.ids[model]).first()
                self.assertIsNotNone(row)
                alice_again.delete(row)
            alice_again.query(Task).filter(Task.title == "after-commit context").delete()
            alice_again.commit()
        finally:
            alice_again.close()

    def test_webhook_context_can_read_pairing_metadata_but_not_tenant_tasks(self):
        alice = self.session_for(self.user_a, self.email_a)
        try:
            alice.add(MemoryItem(
                user_email=self.email_a,
                category="telegram_pairing",
                fact=f"chat-{uuid4().hex}:{self.email_a}",
            ))
            alice.add(Task(user_email=self.email_a, title="webhook isolation sentinel"))
            alice.commit()
        finally:
            alice.close()

        webhook = SessionLocal()
        webhook.info["is_webhook_service"] = True
        try:
            pairings = webhook.query(MemoryItem).filter(
                MemoryItem.category == "telegram_pairing"
            ).all()
            self.assertTrue(any(p.user_email == self.email_a for p in pairings))
            self.assertEqual(
                webhook.query(Task).filter(Task.title == "webhook isolation sentinel").count(),
                0,
            )
        finally:
            webhook.close()

    def test_internal_worker_context_is_explicit_and_cross_tenant(self):
        alice = self.session_for(self.user_a, self.email_a)
        task = Task(user_email=self.email_a, title="worker visible sentinel")
        alice.add(task)
        alice.commit()
        task_id = task.id
        alice.close()

        worker = SessionLocal()
        set_worker_context(worker)
        try:
            self.assertIsNotNone(worker.query(Task).filter(Task.id == task_id).first())
            worker.query(Task).filter(Task.id == task_id).delete()
            worker.commit()
        finally:
            worker.close()


if __name__ == "__main__":
    unittest.main()
