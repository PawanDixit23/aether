import sys
import os
import unittest
from datetime import datetime, timedelta

# Add server to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server")))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, Base, engine
from models import Task, FinancialRecord, MemoryItem, ChatMessage

class TestEndToEndAndSecurityAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        cls.user_a = "alice@security-audit.local"
        cls.user_b = "bob@security-audit.local"
        cls.owner = "e.pawandixit@gmail.com"

    @classmethod
    def tearDownClass(cls):
        # Clean up test user records
        cls.db.query(Task).filter(Task.user_email.in_([cls.user_a, cls.user_b])).delete(synchronize_session=False)
        cls.db.query(FinancialRecord).filter(FinancialRecord.user_email.in_([cls.user_a, cls.user_b])).delete(synchronize_session=False)
        cls.db.query(MemoryItem).filter(MemoryItem.user_email.in_([cls.user_a, cls.user_b])).delete(synchronize_session=False)
        cls.db.query(ChatMessage).filter(ChatMessage.user_email.in_([cls.user_a, cls.user_b])).delete(synchronize_session=False)
        cls.db.commit()
        cls.db.close()

    def test_01_health_and_metrics(self):
        """Verify baseline health, APM telemetry, and news endpoints respond 200 OK."""
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data.get("status"), "healthy")

        r_metrics = self.client.get("/api/metrics")
        self.assertEqual(r_metrics.status_code, 200)
        metrics = r_metrics.json()
        self.assertIn("uptime_hours", metrics)
        self.assertIn("total_requests", metrics)

        r_news = self.client.get("/api/news?limit=2")
        self.assertEqual(r_news.status_code, 200)

    def test_02_strict_user_data_isolation_tasks(self):
        """Security Audit: Ensure User B CANNOT see or mutate User A's tasks."""
        # 1. User A creates a task
        create_resp = self.client.post("/api/tasks", json={
            "title": "Confidential Project Strategy",
            "priority": "high",
            "reminder_time": "10:00 AM",
            "due_date": datetime.utcnow().isoformat()
        }, headers={"X-User-Email": self.user_a})
        self.assertEqual(create_resp.status_code, 200)
        task_a = create_resp.json()
        task_a_id = task_a["id"]

        # 2. User B lists tasks
        list_b = self.client.get("/api/tasks", headers={"X-User-Email": self.user_b})
        self.assertEqual(list_b.status_code, 200)
        tasks_b = list_b.json()
        # Verify task_a is NOT visible to User B (NO BREACH)
        self.assertFalse(any(t["id"] == task_a_id for t in tasks_b), "DATA BREACH: User B saw User A's task!")

        # 3. User B attempts to delete User A's task
        del_resp = self.client.delete(f"/api/tasks/{task_a_id}", headers={"X-User-Email": self.user_b})
        self.assertEqual(del_resp.status_code, 404, "SECURITY VIOLATION: User B was able to access/delete User A's task!")

        # 4. User A deletes their own task successfully
        del_a = self.client.delete(f"/api/tasks/{task_a_id}", headers={"X-User-Email": self.user_a})
        self.assertEqual(del_a.status_code, 200)

    def test_03_strict_user_data_isolation_finance(self):
        """Security Audit: Ensure User B CANNOT see, edit, or delete User A's financial records."""
        # Create financial record for User A
        fin_rec = FinancialRecord(
            user_email=self.user_a,
            type="income",
            category="salary",
            amount=75000.0,
            currency="INR",
            note="Private Salary Credit"
        )
        self.db.add(fin_rec)
        self.db.commit()
        self.db.refresh(fin_rec)
        rec_id = fin_rec.id

        # User B queries financial records
        r_b = self.client.get("/api/finance/records", headers={"X-User-Email": self.user_b})
        self.assertEqual(r_b.status_code, 200)
        recs_b = r_b.json()
        self.assertFalse(any(r["id"] == rec_id for r in recs_b), "DATA BREACH: User B saw User A's financial records!")

        # User B queries financial summary
        summary_b = self.client.get("/api/finance/summary", headers={"X-User-Email": self.user_b})
        self.assertEqual(summary_b.status_code, 200)
        self.assertEqual(summary_b.json()["total_income"], 0.0, "DATA BREACH: User A's income leaked in User B's summary!")

        # User B attempts to edit User A's financial record
        edit_resp = self.client.put(f"/api/finance/records/{rec_id}", json={
            "amount": 1.0
        }, headers={"X-User-Email": self.user_b})
        self.assertEqual(edit_resp.status_code, 403, "SECURITY VIOLATION: User B edited User A's financial record!")

        # Clean up
        self.db.delete(fin_rec)
        self.db.commit()

    def test_04_strict_memory_vault_isolation(self):
        """Security Audit: Ensure User B CANNOT see User A's personal memory items or contacts."""
        # User A creates memory item
        mem_resp = self.client.post("/api/memory", json={
            "fact": "Secret Bank Account PIN 9988",
            "category": "note"
        }, headers={"X-User-Email": self.user_a})
        self.assertEqual(mem_resp.status_code, 200)
        mem_id = mem_resp.json()["id"]

        # User B lists memory items
        list_b = self.client.get("/api/memory", headers={"X-User-Email": self.user_b})
        self.assertEqual(list_b.status_code, 200)
        mems_b = list_b.json()
        self.assertFalse(any(m["id"] == mem_id for m in mems_b), "DATA BREACH: User B saw User A's private memory item!")

        # User B attempts to delete User A's memory
        del_b = self.client.delete(f"/api/memory/{mem_id}", headers={"X-User-Email": self.user_b})
        self.assertEqual(del_b.status_code, 404, "SECURITY VIOLATION: User B deleted User A's memory item!")

        # User A deletes their memory
        del_a = self.client.delete(f"/api/memory/{mem_id}", headers={"X-User-Email": self.user_a})
        self.assertEqual(del_a.status_code, 200)

    def test_05_task_crud_and_subtasks(self):
        """Functionality: Verify task creation with subtasks, toggling, and rescheduling."""
        create_resp = self.client.post("/api/tasks", json={
            "title": "Prepare Annual Financial Report",
            "priority": "high",
            "reminder_time": "04:00 PM",
            "subtasks": ["Collect Invoices", "Reconcile Bank Accounts"]
        }, headers={"X-User-Email": self.user_a})
        self.assertEqual(create_resp.status_code, 200)
        parent_task = create_resp.json()
        self.assertEqual(len(parent_task["subtasks"]), 2)
        sub1_id = parent_task["subtasks"][0]["id"]

        # Toggle subtask
        toggle_sub = self.client.put(f"/api/tasks/{sub1_id}/toggle", headers={"X-User-Email": self.user_a})
        self.assertEqual(toggle_sub.status_code, 200)
        self.assertTrue(toggle_sub.json()["is_completed"])

        # Toggle parent
        toggle_parent = self.client.put(f"/api/tasks/{parent_task['id']}/toggle", headers={"X-User-Email": self.user_a})
        self.assertEqual(toggle_parent.status_code, 200)
        self.assertTrue(toggle_parent.json()["is_completed"])

        # Clean up
        self.client.delete(f"/api/tasks/{parent_task['id']}", headers={"X-User-Email": self.user_a})

    def test_06_finance_sms_parsing(self):
        """Functionality: Verify financial SMS ledger parsing with strict isolation."""
        sms_text = "Rs 450.00 debited from A/C XX1234 on 31-Oct-26 via UPI to SWIGGY. Ref: 987654321."
        resp = self.client.post("/api/finance/parse-sms", json={
            "sms_text": sms_text,
            "user_email": self.user_a,
            "auto_commit": True
        }, headers={"X-User-Email": self.user_a})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "success")
        self.assertGreaterEqual(data.get("logged_count"), 1)
        self.assertEqual(data["records"][0]["amount"], 450.0)

    def test_07_executive_briefing_user_isolation(self):
        """Security & Functionality: Ensure briefing isolates tasks and data per user."""
        briefing_a = self.client.get("/api/briefing", headers={"X-User-Email": self.user_a})
        self.assertEqual(briefing_a.status_code, 200)
        data = briefing_a.json()
        self.assertIn("greeting", data)
        self.assertIn("financial_snapshot", data)
        # Ensure Alice does not see Pawan's greeting name
        self.assertNotIn("पवन", data["greeting"])

if __name__ == "__main__":
    unittest.main()
