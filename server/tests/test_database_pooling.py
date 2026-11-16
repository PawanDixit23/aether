import unittest

from database import SessionLocal, engine, set_db_rls_context, set_worker_rls_context


class DeferredRlsConnectionTests(unittest.TestCase):
    def _checked_out(self):
        pool = engine.pool
        return pool.checkedout() if hasattr(pool, "checkedout") else None

    def test_tenant_rls_context_does_not_checkout_connection_eagerly(self):
        db = SessionLocal()
        try:
            before = self._checked_out()
            set_db_rls_context(db, "00000000-0000-0000-0000-000000000001")
            self.assertFalse(db.in_transaction())
            self.assertEqual(db.info.get("rls_user_id"), "00000000-0000-0000-0000-000000000001")
            self.assertFalse(db.info.get("rls_worker_authorized", False))
            if before is not None:
                self.assertEqual(self._checked_out(), before)
        finally:
            db.close()

    def test_worker_rls_context_does_not_checkout_connection_eagerly(self):
        db = SessionLocal()
        try:
            before = self._checked_out()
            set_worker_rls_context(db)
            self.assertFalse(db.in_transaction())
            self.assertTrue(db.info.get("rls_worker_authorized"))
            self.assertNotIn("rls_user_id", db.info)
            if before is not None:
                self.assertEqual(self._checked_out(), before)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
