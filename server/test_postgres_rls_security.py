"""
Aether Real PostgreSQL RLS & Security Integration Test Suite (AETH-P0-02 & AETH-P0-03)
Tests strictly against live PostgreSQL:
1. Application Role Verification:
   - Live application testing MUST connect under a non-superuser role (NOSUPERUSER & NOBYPASSRLS).
2. Verification of RLS on ACTUAL Application Tables:
   - Relies on real tables: tasks, financial_records, memory_vault, chat_messages, scheduled_jobs, action_approvals.
   - Asserts relrowsecurity and relforcerowsecurity are active on all tables.
3. Cross-Tenant Isolation under Real PostgreSQL RLS:
   - User A inserts Task, FinancialRecord, MemoryItem, ChatMessage inside User A's transaction context.
   - User B with set_config('request.jwt.claim.sub', UUID_B, true) cannot SELECT, UPDATE, or DELETE User A's records.
   - User B cannot INSERT with owner_user_id = UUID_A (fails PostgreSQL WITH CHECK violation).
4. Connection Pooling / Transaction-Local Reset Verification:
   - set_config('request.jwt.claim.sub', ..., true) is strictly transaction-local and does NOT leak across pooled sessions.
5. ActionApprovalManager Real Concurrency, Tampering & Replay Protection on PostgreSQL:
   - Tests actual ActionApproval model via ActionApprovalManager.create_approval_request() and verify_and_consume().
   - Validates parameter tampering detection and cross-user rejection.
   - Concurrent worker threads attempt to consume the same approval; exactly ONE succeeds.
"""

import os
import sys
import uuid
import threading
import time
from datetime import datetime

# Add server directory to path
server_dir = os.path.dirname(os.path.abspath(__file__))
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from models import Task, FinancialRecord, MemoryItem, ChatMessage, ScheduledJob, ActionApproval
from agent.governance import ActionApprovalManager


def get_postgres_engine():
    pg_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_TEST_URL")
    if not pg_url or "postgres" not in pg_url.lower():
        return None
    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)
    return create_engine(pg_url, pool_pre_ping=True)


def test_postgres_rls_suite():
    engine = get_postgres_engine()
    if not engine:
        print("⚠️ [PostgreSQL Test Notice] No PostgreSQL DATABASE_URL detected. Skipping live PG tests in SQLite dev environment.")
        return

    print("🐘 [PostgreSQL Integration] Running live PostgreSQL RLS & Concurrency Test Suite on REAL application tables...")
    Session = sessionmaker(bind=engine)

    # 1. Role verification: Enforce that application connection is strictly non-superuser and cannot bypass RLS
    with engine.connect() as conn:
        role_res = conn.execute(text("SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;")).fetchone()
        assert role_res is not None, "Failed to inspect current database role in pg_roles"
        rolname, is_super, bypass_rls = role_res
        print(f"✅ DB Role '{rolname}': rolsuper={is_super}, rolbypassrls={bypass_rls}")
        assert not is_super, f"Security Violation: Database role '{rolname}' is SUPERUSER! Production/CI app role MUST be NOSUPERUSER to enforce RLS."
        assert not bypass_rls, f"Security Violation: Database role '{rolname}' has BYPASSRLS enabled! Production/CI app role MUST be NOBYPASSRLS."

    # 2. Verify RLS and FORCE RLS on actual application tables
    required_tables = ["tasks", "financial_records", "memory_vault", "chat_messages", "scheduled_jobs", "action_approvals"]
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT relname, relrowsecurity, relforcerowsecurity 
            FROM pg_class 
            WHERE relname IN ('tasks', 'financial_records', 'memory_vault', 'chat_messages', 'scheduled_jobs', 'action_approvals');
        """)).fetchall()
        table_rls = {r[0]: (r[1], r[2]) for r in rows}
        for tbl in required_tables:
            assert tbl in table_rls, f"Required table '{tbl}' not found in PostgreSQL schema"
            rls_enabled, rls_forced = table_rls[tbl]
            assert rls_enabled, f"Security Violation: Table '{tbl}' does not have ROW LEVEL SECURITY enabled!"
            assert rls_forced, f"Security Violation: Table '{tbl}' does not have FORCE ROW LEVEL SECURITY enabled!"
            print(f"✅ Table '{tbl}': RLS enabled={rls_enabled}, RLS forced={rls_forced}")

    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())

    # 3. User A inserts records across actual application tables inside User A's RLS transaction context
    task_id = None
    fin_id = None
    mem_id = None
    chat_id = None

    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_a})
            
            t = Task(owner_user_id=user_a, user_email="usera@example.com", title="Confidential Strategy of User A")
            sess.add(t)
            
            f = FinancialRecord(owner_user_id=user_a, user_email="usera@example.com", type="expense", category="strategy", amount=12500.0, note="Confidential M&A")
            sess.add(f)
            
            m = MemoryItem(owner_user_id=user_a, user_email="usera@example.com", key="api_key_secret", value="secret_user_a_token")
            sess.add(m)
            
            c = ChatMessage(owner_user_id=user_a, user_email="usera@example.com", role="user", content="Classified intelligence")
            sess.add(c)
            
            sess.flush()
            task_id = t.id
            fin_id = f.id
            mem_id = m.id
            chat_id = c.id

    assert task_id and fin_id and mem_id and chat_id
    print(f"✅ User A created records: task={task_id}, fin={fin_id}, mem={mem_id}, chat={chat_id}")

    # 4. Cross-tenant SELECT: User B cannot see User A's records under PostgreSQL RLS
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_b})
            
            assert sess.query(Task).filter(Task.id == task_id).first() is None, "Security Violation: User B read User A's Task!"
            assert sess.query(FinancialRecord).filter(FinancialRecord.id == fin_id).first() is None, "Security Violation: User B read User A's FinancialRecord!"
            assert sess.query(MemoryItem).filter(MemoryItem.id == mem_id).first() is None, "Security Violation: User B read User A's MemoryItem!"
            assert sess.query(ChatMessage).filter(ChatMessage.id == chat_id).first() is None, "Security Violation: User B read User A's ChatMessage!"
    print("✅ User B cannot read any of User A's actual records (0 rows returned across all tables under RLS).")

    # 5. Cross-tenant UPDATE & DELETE: User B cannot modify or delete User A's records
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_b})
            
            updated_tasks = sess.query(Task).filter(Task.id == task_id).update({Task.title: "Compromised!"})
            assert updated_tasks == 0, "Security Violation: User B was able to update User A's task!"
            
            deleted_tasks = sess.query(Task).filter(Task.id == task_id).delete()
            assert deleted_tasks == 0, "Security Violation: User B was able to delete User A's task!"
            
            deleted_fin = sess.query(FinancialRecord).filter(FinancialRecord.id == fin_id).delete()
            assert deleted_fin == 0, "Security Violation: User B was able to delete User A's financial record!"
    print("✅ User B cannot UPDATE or DELETE User A's records (0 rows affected).")

    # 6. Cross-tenant INSERT: User B cannot forge a record with User A's owner_user_id (WITH CHECK policy violation)
    with Session() as sess:
        with sess.begin():
            sess.execute(text("SELECT set_config('request.jwt.claim.sub', :sub, true)"), {"sub": user_b})
            spoofed_task = Task(owner_user_id=user_a, user_email="usera@example.com", title="Forged Task By User B")
            sess.add(spoofed_task)
            try:
                sess.flush()
                assert False, "Security Violation: User B inserted a task with User A's owner_user_id!"
            except Exception as e:
                err_str = str(e).lower()
                assert "row-level security policy" in err_str or "violates" in err_str or "check" in err_str
                print("✅ Cross-tenant INSERT strictly blocked by PostgreSQL RLS WITH CHECK policy on tasks table.")

    # 7. Connection pooling / transaction-local leakage test
    # Verify that after a transaction completes, set_config with is_local=true does not persist
    with engine.connect() as conn:
        sub_val = conn.execute(text("SELECT current_setting('request.jwt.claim.sub', true);")).scalar()
        assert sub_val is None or sub_val == "", f"Security Violation: RLS claim leaked into subsequent connection: {sub_val}"
    print("✅ Connection pool isolation verified: Transaction-local claim is wiped after transaction.")

    # 8. P0-03 Action Approval Concurrency & Replay Protection on real ActionApproval table via ActionApprovalManager
    os.environ["ENVIRONMENT"] = "production"
    
    test_params = {"destination": "0x1234567890abcdef", "amount_usd": 25000}
    action_info = None
    with Session() as sess:
        action_info = ActionApprovalManager.create_approval_request(
            tool_name="execute_wire_transfer",
            params=test_params,
            user_email="usera@example.com",
            owner_user_id=user_a,
            db=sess
        )
    action_id = action_info["action_id"]
    assert action_id is not None
    print(f"✅ Created real ActionApproval request: action_id={action_id}")

    # 8a. Tampering Protection: Tampered parameters must be rejected
    tampered_params = {"destination": "0x1234567890abcdef", "amount_usd": 999999}
    with Session() as sess:
        auth_ok, auth_msg = ActionApprovalManager.verify_and_consume(
            action_id=action_id,
            tool_name="execute_wire_transfer",
            params=tampered_params,
            user_email="usera@example.com",
            owner_user_id=user_a,
            db=sess
        )
        assert not auth_ok, "Security Violation: Tampered action parameters were authorized!"
        print(f"✅ ActionApproval parameter tampering rejected: {auth_msg}")

    # 8b. Tenant Isolation: User B cannot consume User A's approval request
    with Session() as sess:
        auth_ok, auth_msg = ActionApprovalManager.verify_and_consume(
            action_id=action_id,
            tool_name="execute_wire_transfer",
            params=test_params,
            user_email="userb@example.com",
            owner_user_id=user_b,
            db=sess
        )
        assert not auth_ok, "Security Violation: User B was able to consume User A's action approval!"
        print(f"✅ ActionApproval cross-tenant consumption rejected: {auth_msg}")

    # 8c. Real PostgreSQL Concurrent Consumption: 5 concurrent threads attempt to consume the same approval
    results = []
    def worker_consume(worker_name):
        w_sess = Session()
        try:
            ok, msg = ActionApprovalManager.verify_and_consume(
                action_id=action_id,
                tool_name="execute_wire_transfer",
                params=test_params,
                user_email="usera@example.com",
                owner_user_id=user_a,
                db=w_sess
            )
            results.append((worker_name, ok, msg))
        except Exception as exc:
            results.append((worker_name, False, f"error: {exc}"))
        finally:
            w_sess.close()

    threads = [threading.Thread(target=worker_consume, args=(f"Worker-{i}",)) for i in range(1, 6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    successes = [r for r in results if r[1] is True]
    failures = [r for r in results if r[1] is False]
    assert len(successes) == 1, f"Concurrency failure: expected exactly 1 success, got {results}"
    assert len(failures) == 4, f"Concurrency failure: expected exactly 4 rejections, got {results}"
    print(f"✅ P0-03: Real PostgreSQL concurrent consumption race condition resolved (exactly 1 authorized, 4 replay-blocked: '{failures[0][2]}').")

    print("\n🎉 ALL REAL POSTGRESQL RLS & CONCURRENCY TESTS ON ACTUAL APPLICATION TABLES PASSED 100%!")


if __name__ == "__main__":
    test_postgres_rls_suite()
