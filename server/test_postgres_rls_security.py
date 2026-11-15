"""
Aether Real PostgreSQL RLS & Security Integration Test Suite (AETH-P0-02 & AETH-P0-03)
Tests strictly on PostgreSQL:
1. Application Role Verification (NOBYPASSRLS).
2. Cross-tenant isolation under PostgreSQL Row-Level Security:
   - User A inserts Task with owner_user_id = UUID_A.
   - User B with set_config('request.jwt.claim.sub', UUID_B) cannot SELECT, UPDATE, or DELETE User A's task.
   - User B cannot INSERT with owner_user_id = UUID_A (fails WITH CHECK violation).
3. Connection Pooling / Transaction-local reset verification:
   - set_config('request.jwt.claim.sub', ..., true) is strictly transaction-local and does NOT leak across pooled sessions.
4. ActionApproval concurrency and replay protection on real PostgreSQL transactions:
   - Two concurrent PostgreSQL sessions attempt to consume the same action approval; exactly one succeeds.
"""

import os
import sys
import uuid
import threading
import time
from datetime import datetime

import pytest
from sqlalchemy import create_engine, text, Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class TaskRLS(Base):
    __tablename__ = "test_tasks_rls"
    id = Column(Integer, primary_key=True)
    owner_user_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, default="pending")

class ActionApprovalRLS(Base):
    __tablename__ = "test_action_approvals_rls"
    id = Column(String, primary_key=True)
    owner_user_id = Column(String, nullable=False)
    tool_name = Column(String, nullable=False)
    parameters_hash = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, consumed, rejected
    consumed_at = Column(DateTime, nullable=True)


def get_postgres_engine():
    pg_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_TEST_URL")
    if not pg_url or "postgres" not in pg_url.lower():
        return None
    # Normalize postgres:// to postgresql://
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)
    return create_engine(pg_url, pool_pre_ping=True)


def setup_rls_tables(engine):
    """Creates tables, enables and forces RLS, and creates tenant isolation policies."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE test_tasks_rls ENABLE ROW LEVEL SECURITY;"))
        conn.execute(text("ALTER TABLE test_tasks_rls FORCE ROW LEVEL SECURITY;"))
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'test_tasks_rls' AND policyname = 'test_tasks_tenant_isolation'
                ) THEN
                    CREATE POLICY test_tasks_tenant_isolation ON test_tasks_rls
                        FOR ALL
                        USING (owner_user_id = current_setting('request.jwt.claim.sub', true))
                        WITH CHECK (owner_user_id = current_setting('request.jwt.claim.sub', true));
                END IF;
            END $$;
        """))
        conn.commit()


def test_postgres_rls_suite():
    engine = get_postgres_engine()
    if not engine:
        print("⚠️ [PostgreSQL Test Notice] No PostgreSQL DATABASE_URL detected. Skipping live PG tests in SQLite dev environment.")
        return

    print("🐘 [PostgreSQL Integration] Running live PostgreSQL RLS & Concurrency Test Suite...")
    setup_rls_tables(engine)
    Session = sessionmaker(bind=engine)

    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())

    # 1. Role verification: Verify current DB role cannot bypass RLS
    with engine.connect() as conn:
        role_res = conn.execute(text("SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;")).fetchone()
        if role_res:
            rolname, is_super, bypass_rls = role_res
            print(f"✅ DB Role '{rolname}': rolsuper={is_super}, rolbypassrls={bypass_rls}")
            # Ensure in production/test app user does not have BYPASSRLS
            if not is_super:
                assert not bypass_rls, f"Security Violation: Application role {rolname} has BYPASSRLS enabled!"

    # 2. User A inserts a task inside User A's RLS transaction context
    task_id = None
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_a})
            t_a = TaskRLS(owner_user_id=user_a, title="Confidential Strategy of User A")
            sess.add(t_a)
            sess.flush()
            task_id = t_a.id
    assert task_id is not None
    print(f"✅ Task created by User A with ID={task_id}")

    # 3. User B tries to SELECT User A's task
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_b})
            found = sess.query(TaskRLS).filter(TaskRLS.id == task_id).first()
            assert found is None, "Security Violation: User B was able to read User A's task under RLS!"
    print("✅ User B cannot read User A's task (0 rows returned under RLS).")

    # 4. User B tries to UPDATE User A's task
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_b})
            updated_count = sess.query(TaskRLS).filter(TaskRLS.id == task_id).update({TaskRLS.title: "Hacked!"})
            assert updated_count == 0, "Security Violation: User B was able to update User A's task!"
    print("✅ User B cannot UPDATE User A's task (0 rows affected).")

    # 5. User B tries to DELETE User A's task
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_b})
            deleted_count = sess.query(TaskRLS).filter(TaskRLS.id == task_id).delete()
            assert deleted_count == 0, "Security Violation: User B was able to delete User A's task!"
    print("✅ User B cannot DELETE User A's task (0 rows affected).")

    # 6. User B tries to INSERT a task spoofing User A's owner_user_id (WITH CHECK policy violation)
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_b})
            spoofed_task = TaskRLS(owner_user_id=user_a, title="Forged Task")
            sess.add(spoofed_task)
            try:
                sess.flush()
                assert False, "Security Violation: User B was able to insert a task with User A's owner_user_id!"
            except Exception as e:
                err_str = str(e).lower()
                assert "row-level security policy" in err_str or "violates" in err_str or "check" in err_str
                print("✅ Cross-tenant INSERT strictly blocked by PostgreSQL RLS WITH CHECK policy.")

    # 7. Connection pooling / transaction-local leakage test
    # Verify that after a transaction completes, set_config with is_local=true does not persist
    with engine.connect() as conn:
        sub_val = conn.execute(text("SELECT current_setting('request.jwt.claim.sub', true);")).scalar()
        assert sub_val is None or sub_val == "", f"Security Violation: RLS claim leaked into subsequent connection: {sub_val}"
    print("✅ Connection pool isolation verified: Transaction-local claim is wiped after transaction.")

    # 8. P0-03 Action Approval Concurrency & Replay Protection on PostgreSQL
    approval_id = str(uuid.uuid4())
    with Session() as sess:
        with sess.begin():
            sess.add(ActionApprovalRLS(
                id=approval_id,
                owner_user_id=user_a,
                tool_name="transfer_funds",
                parameters_hash="canonical_sha256_hash",
                status="pending"
            ))

    # Two concurrent worker threads attempting to consume the same approval
    results = []
    def worker_consume(worker_name):
        w_sess = Session()
        try:
            with w_sess.begin():
                # Atomic conditional consume
                affected = w_sess.query(ActionApprovalRLS).filter(
                    ActionApprovalRLS.id == approval_id,
                    ActionApprovalRLS.status == "pending"
                ).update({
                    ActionApprovalRLS.status: "consumed",
                    ActionApprovalRLS.consumed_at: datetime.utcnow()
                }, synchronize_session=False)
                if affected == 1:
                    results.append((worker_name, "success"))
                else:
                    results.append((worker_name, "replay_blocked"))
        except Exception as exc:
            results.append((worker_name, f"error: {exc}"))
        finally:
            w_sess.close()

    t1 = threading.Thread(target=worker_consume, args=("Worker-1",))
    t2 = threading.Thread(target=worker_consume, args=("Worker-2",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    successes = [r for r in results if r[1] == "success"]
    blocked = [r for r in results if r[1] == "replay_blocked"]
    assert len(successes) == 1, f"Concurrency failure: expected exactly 1 success, got {results}"
    assert len(blocked) == 1, f"Concurrency failure: expected exactly 1 blocked, got {results}"
    print("✅ P0-03: Real PostgreSQL concurrent consumption race condition resolved (exactly 1 succeeded, 1 replay-blocked).")

    print("\n🎉 ALL REAL POSTGRESQL RLS & CONCURRENCY TESTS PASSED 100%!")


if __name__ == "__main__":
    test_postgres_rls_suite()
