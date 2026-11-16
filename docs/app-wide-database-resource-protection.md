# App-wide database resource protection

## Objective

Keep each request's application-side working set bounded as tenant data grows. Stored records are not capped, deleted, truncated, or silently discarded. The database remains the durable source of truth.

This is an application-level protection layer, not a promise that provider-level quota errors can never occur. Supabase/PostgreSQL can still reject work because of plan limits, concurrent workloads, external clients, disk/WAL pressure, or infrastructure incidents. The changes below remove the main unbounded-read patterns in Aether's API paths and make large client writes resumable.

## Shared limits

- Default page size: 50 records.
- Maximum page size: 100 records.
- Backup/contact/finance bulk write batch: 200 records.
- AI context: up to 30 pending tasks, 15 memories, 60 recent finance records, and 40 recent chat messages.
- Semantic memory recall: up to 100 keyword candidates plus 100 importance/recency candidates, then return at most 20 matches.
- PostgreSQL pool: 3 base connections + 2 overflow per process by default; configurable with DB_POOL_SIZE, DB_POOL_MAX_OVERFLOW, DB_POOL_TIMEOUT_SECONDS, and DB_POOL_RECYCLE_SECONDS.
- PostgreSQL statement timeout: 10 seconds; lock timeout: 3 seconds.
- JSON request body: 2 MiB by default, configurable with MAX_JSON_REQUEST_BYTES. Multipart file uploads are not subject to this JSON-only guard.

## API pagination

The following endpoints now use bounded pages and accept limit/offset:

- GET /api/tasks (default 50; top-level tasks)
- GET /api/tasks/{task_id}/subtasks (default 50)
- GET /api/tasks/date-completions (default 100; optionally filter by task_id)
- GET /api/memory (default 50)
- GET /api/chat/history (default 60)
- GET /api/chat/sessions (default 50)
- GET /api/finance/records (default 100)
- GET /api/audit-logs (default 60; capped at 100)

Responses retain their existing list/map payload shapes for compatibility. Pagination state is exposed through X-Has-More and X-Next-Offset response headers. CORS exposes these headers to the web client.

The desktop client now loads more tasks, subtasks, memories, finance records, chat sessions, and older chat messages on demand. A page is never treated as the entire dataset merely because the first response completed.

## Query and write changes

- AI context totals use SQL aggregates; task, memory, finance, and chat context reads are bounded.
- Hybrid memory recall no longer materializes the entire memory vault. It ranks a bounded keyword + importance/recency candidate window.
- Finance summary, weekly digest, cash-flow forecast, and monthly budget checks use SQL aggregates.
- Finance CSV export streams rows in batches instead of buffering the full ledger.
- Task/subtask serialization and task status propagation avoid unbounded ORM hydration.
- Recurring-task and overdue-task maintenance use keyset batches.
- Reminder worker processes owners, due tasks, and push subscriptions in bounded windows.
- Backup restore accepts no more than 200 rows per module per request. The desktop client sends 50-row chunks sequentially (the API rejects more than 200 rows per module per request), keeping payloads comfortably below the 2 MiB JSON limit.
- Task and finance backup rows carry per-owner idempotency keys so interrupted/retried chunks do not duplicate imported rows. Existing database IDs and rows are not modified.
- Bulk contacts and finance requests are capped at 200 rows; the desktop client chunks contact sync.

## Indexes

Composite tenant-scoped indexes support the new access patterns for tasks, finance records, memory, chat history, and date completions. PostgreSQL creates them concurrently to avoid blocking normal table writes. New installations also receive the indexes through SQLAlchemy metadata.

## Operational rollout

1. Deploy the branch to a staging Render service first.
2. Confirm database startup migrations add backup_key columns and create the partial unique indexes.
3. Run the resource helper tests: cd server && python -m unittest discover -s tests.
4. Exercise large-data paths with synthetic datasets: 100k tasks, 100k memories, 100k finance records, 100k chat messages; verify each request returns a bounded page and correct continuation offset.
5. Verify backup restore with more than 200 records per module, interrupted/retried chunks, and existing records present.
6. Inspect PostgreSQL query plans for the new composite indexes and monitor Render RSS, DB pool wait time, statement timeouts, and Supabase database memory.
7. Only then merge and deploy production.

## Important constraints

- Pagination offsets are compatible with the current client. For extremely large, frequently changing tables, a future cursor/keyset API is preferable to deep offsets.
- Semantic recall is intentionally bounded. It does not load every historical memory into an LLM prompt; exact/keyword retrieval can still find matching older facts, while semantic-only recall is ranked within the candidate window.
- The JSON Content-Length guard only rejects requests whose clients send a Content-Length header. Reverse-proxy limits should also be configured for chunked transfer requests.
- No finite application can guarantee zero provider errors under arbitrary load. This architecture makes per-request work bounded and materially lowers the chance of memory exhaustion; capacity planning and monitoring remain necessary.


## PostgreSQL trigram index prerequisite

The resource-guard ORM metadata includes a GIN index using `pg_trgm`. Before deploying with the restricted runtime role, enable the extension using the Supabase database migration/admin connection:

    CREATE EXTENSION IF NOT EXISTS pg_trgm;

The API startup check verifies that the extension is present before ORM schema initialization. Do not grant the application runtime role superuser or BYPASSRLS privileges to work around a missing extension.


## Trusted reminder worker

The cross-tenant reminder worker is a privileged maintenance principal and must not be exposed through a spoofable header.

- Set the same high-entropy `AETHER_WORKER_TOKEN` in Render environment variables and GitHub Actions repository secrets.
- The scheduled workflow sends `Authorization: Bearer $AETHER_WORKER_TOKEN` to `/api/reminders/push-check`.
- The API rejects missing configuration with HTTP 503 and missing/invalid bearer credentials with HTTP 401. The legacy `X-GitHub-Actions` header is not accepted.
- PostgreSQL RLS grants cross-tenant maintenance access only when the transaction-local `request.worker_authorized` flag is set by the authenticated worker dependency or the trusted in-process reminder worker. The flag is reset when a tenant identity context is applied.
- The background worker explicitly establishes the same transaction-local context before processing reminders. No database superuser or BYPASSRLS runtime role is required.
