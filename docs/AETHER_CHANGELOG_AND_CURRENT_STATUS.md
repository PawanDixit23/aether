# Aether — Change Log & Current Status

**Repository:** `PawanDixit23/aether`  
**Branch reviewed:** `dev`  
**Review snapshot:** 21 November 2026  
**Reviewed HEAD:** `790c8602d1c5facd3de8fa802b0443e0753257cb` (PR #39)

> This document records changes already merged into `dev`. Creating this document did not modify application code, database schema, Render configuration, or Supabase data. A merged PR is not automatically proof of production verification.

## 1. Summary

Recent work focused on Finance correctness, lower request volume, News provider resilience, Memory Vault pagination, and API bandwidth observability.

## 2. Merged changes

### PR #32 — Receipt expense persistence and Finance/Audit UI
- Persisted `owner_user_id` for AI/receipt-scanned expenses so Finance list and summary tenant filters can find the saved row.
- Moved weekly trend day-breakdown sheet to a React Portal to avoid clipping inside the Finance modal.
- Bounded the transaction list and compacted Audit Trail date controls; added safe-area spacing.
- **Not changed:** OCR/expense parsing logic.
- **Verification gap:** PR description said CI and Android WebView visual verification were pending.

### PR #33 — Dashboard polling and duplicate request reduction
- Reduced online full dashboard refresh from 15 seconds to 60 seconds.
- While backend is offline, polls only `/api/health` every 15 seconds rather than fanning out 11 API/database reads.
- Pauses polling while the document is hidden and refreshes on visibility return.
- Avoids duplicate auth audit events during session hydration and removes an extra audit-log GET.
- Canonicalized briefing URL serialization to improve in-flight GET coalescing.
- **Scope:** frontend request lifecycle; no finance, memory, schema, or token changes.
- **Verification gap:** PR description said CI/build/test were pending.

### PR #34 — Google News 429 backoff and stale headline reuse
- Added process-wide single-flight structured-news refresh.
- Added provider cooldowns: 429 starts at 120 seconds with bounded exponential backoff (maximum 15 minutes); other transient failures start at 30 seconds.
- Honors numeric `Retry-After` when provided.
- Serves previously verified headlines for up to 30 minutes during cooldown/failure; does not synthesize placeholder headlines.
- Added regression tests for cooldown and stale-headline reuse.
- **Scope:** News provider reliability only; no database/auth/memory changes.

### PR #35 — Memory Vault pagination visibility
- Keeps Load More visible when `X-Total-Count` proves more records remain.
- Prevents contradictory `X-Has-More: false` from overriding a larger total.
- Safely handles missing total-count headers.
- **Scope:** frontend pagination visibility only; no storage or retention change.

### PR #36 — Full-page pagination fallback
- Treats a full 50-row page as evidence another page may exist when total count is unavailable or `X-Has-More` is contradictory.
- Applies to initial and subsequent cursor pages.
- **Scope:** frontend pagination only.

### PR #37 — Endpoint bandwidth observability
- Measures application-level response-body bytes for API, frontend assets, and other HTTP responses without buffering streams.
- Tracks request counts, errors, declared request bytes, and response bytes in bounded endpoint buckets.
- Exposes aggregate/endpoint counters via authenticated `/api/metrics`.
- Keeps telemetry bounded (40 endpoint buckets, 100 recent events) and excludes request bodies, query strings, user IDs, and credentials.
- Adds unit tests for byte accounting and bounded metric cardinality.
- **Limitations:** not an exact replacement for Render's network meter; does not yet attribute outbound traffic to Supabase/Gemini/News/Cricket; counters are process-local and reset on instance restart.

### PR #38 — Derive Memory pagination state
- Derives Load More visibility from total count versus rendered rows when total is known.
- Falls back to server pagination flag/full-page length when total is unavailable.
- Derives a missing cursor from the oldest rendered memory.
- Retains bounded 50-row cursor requests and deduplication.
- **Scope:** no schema, retention, or storage changes.

### PR #39 — Memory Vault UI wiring
- Passed total count, pagination visibility, loading state, and load-more handler from `App.jsx` to `SettingsSubModals.jsx`.
- Shows authoritative server total and loaded-versus-total context.
- Adds a Load More Memories action with loading/remaining-count state.
- **Scope:** frontend component wiring; no backend/schema/Render/Supabase changes.
- **Verification gap:** PR description noted build/lint and browser runtime verification were not completed.

## 3. Current branch snapshot

| Item | Value |
|---|---|
| Repository | `PawanDixit23/aether` |
| Base branch | `dev` |
| Reviewed HEAD | `790c8602d1c5facd3de8fa802b0443e0753257cb` |
| Latest reviewed PR | #39 |
| Main recent focus | Memory pagination UI wiring |

Repository documentation also includes architecture, security, technology-gap, roadmap, and app-wide database resource-protection documents. README feature descriptions should be treated as documented capabilities, not proof every capability is production-verified.

## 4. Existing resource-protection direction

The repository's `docs/app-wide-database-resource-protection.md` describes:
- Bounded/on-demand pagination for tasks, subtasks, memories, finance, chat sessions, and messages.
- SQL aggregates for totals and summaries.
- Bounded memory-recall candidate windows and lightweight list projections.
- Batched/streamed finance exports and backup restore.
- Tenant-scoped indexes and transaction-scoped RLS context.
- In-flight GET coalescing, incremental migration tracking, and safe metrics.
- Bounded reminder/maintenance workers.

**Interpretation:** these controls reduce per-request work and data transfer. They cannot guarantee unlimited data or eliminate every quota risk. Storage, egress, compute, connection, and provider quotas are separate limits and must be monitored independently.

## 5. Verification still required

| Area | Required verification |
|---|---|
| Memory Vault | Browser + Android: load beyond 50, correct total, no duplicates, search/pagination behavior |
| Finance | Receipt scan → Finance ledger → summary shows the same record |
| Dashboard | Compare online/offline request counts and hidden-tab behavior |
| News | Simulate 429, Retry-After, cooldown, stale cache, and recovery |
| Metrics | Verify auth, endpoint counters, and restart reset behavior |
| Supabase | Compare uncached egress, pooler egress, API volume, and query workload over equal time windows |
| Android parity | Run critical journeys on a real Android device/WebView |
| CI | Run current frontend build, backend tests, and mobile checks |

## 6. Work performed for this documentation

- Reviewed the `dev` branch snapshot, README, architecture/resource-protection documents, and recent PR descriptions #32–#39.
- Prepared a change log and verification checklist.
- No application source code, schema, Render variables, or Supabase records were changed in this documentation task.
