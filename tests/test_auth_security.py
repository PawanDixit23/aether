import os
import sys
import unittest
from uuid import uuid5, NAMESPACE_URL
from unittest.mock import patch

from fastapi.testclient import TestClient

SERVER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, SERVER_DIR)

from main import app, SessionLocal
from models import Task


async def fake_verify_supabase_access_token(token: str):
    if token == "valid-alice":
        return {"id": str(uuid5(NAMESPACE_URL, "alice")), "email": "alice@example.test"}
    if token == "valid-bob":
        return {"id": str(uuid5(NAMESPACE_URL, "bob")), "email": "bob@example.test"}
    from fastapi import HTTPException
    raise HTTPException(status_code=401, detail="Invalid or expired access token")


class TestVerifiedIdentityMiddleware(unittest.TestCase):
    def setUp(self):
        self.auth_patch = patch("main.verify_supabase_access_token", new=fake_verify_supabase_access_token)
        self.auth_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.auth_patch.stop()

    def test_email_header_alone_is_not_authentication(self):
        response = self.client.get(
            "/api/tasks",
            headers={"X-User-Email": "alice@example.test"},
        )
        self.assertEqual(response.status_code, 401)

    def test_invalid_bearer_token_is_rejected(self):
        response = self.client.get(
            "/api/tasks",
            headers={"Authorization": "Bearer forged-token", "X-User-Email": "alice@example.test"},
        )
        self.assertEqual(response.status_code, 401)

    def test_verified_token_takes_precedence_over_spoofed_email_header(self):
        response = self.client.get(
            "/api/tasks",
            headers={
                "Authorization": "Bearer valid-alice",
                "X-User-Email": "bob@example.test",
            },
        )
        self.assertEqual(response.status_code, 200)


    def test_authenticated_task_is_stamped_with_verified_owner_uuid(self):
        owner_id = str(uuid5(NAMESPACE_URL, "alice"))
        response = self.client.post(
            "/api/tasks",
            headers={"Authorization": "Bearer valid-alice", "X-User-Email": "bob@example.test"},
            json={"title": "tenant owner uuid test", "priority": "low"},
        )
        self.assertEqual(response.status_code, 200)
        db = SessionLocal()
        db.info["tenant_user_id"] = owner_id
        db.info["tenant_user_email"] = "alice@example.test"
        try:
            task = db.query(Task).filter(
                Task.user_email == "alice@example.test",
                Task.title == "tenant owner uuid test",
            ).order_by(Task.id.desc()).first()
            self.assertIsNotNone(task)
            self.assertEqual(task.owner_user_id, owner_id)
            db.delete(task)
            db.commit()
        finally:
            db.close()

    def test_public_health_endpoint_does_not_require_authentication(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
