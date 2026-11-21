# Aether — Feature Roadmap & Existing Feature Improvement Plan

**Repository:** `PawanDixit23/aether`  
**Target branch:** `dev`  
**Plan snapshot:** 21 November 2026

> This is a proposed product/engineering plan, not a claim that these features have already been implemented. README-listed capabilities are documented capabilities; verify runtime behavior before treating them as production-ready.

## 1. Product direction

Aether should become a dependable **Personal AI Executive / Daily Life Operating Assistant**, not merely a chat UI. It should connect tasks, reminders, finance, notes, memory, and communication; understand Hindi/Hinglish/English; respect consent; and behave consistently on Web/Desktop and Android.

**Product principle:** differentiate through reliable execution, low error rates, safe automation, and useful context—not by maximizing the number of features.

## 2. P0 — Stabilize existing features first

### 2.1 Cross-platform quality gate
- Establish repeatable Web/Desktop, backend, and Android WebView smoke tests.
- Cover login/session restore, task CRUD, expense CRUD, memory pagination, reminders, and chat.
- Require frontend build, backend tests, and relevant Android checks for critical changes.
- Provide clear loading, empty, offline, retry, and error states.

**Done when:** critical journeys pass on both clients and no existing behavior is silently regressed.

### 2.2 Memory Vault
Recent PRs #35–#39 improved pagination visibility and UI wiring. Next:
- Server-side keyword/category/date search; never download the entire vault just to search.
- Sort by newest/oldest/category/importance where supported.
- Detail view with source/provenance, created/updated timestamps, and confidence where available.
- User controls to edit, archive, delete, export, and say “do not remember this”.
- Consent-first long-term memory; do not silently retain sensitive facts.
- Duplicate detection with a user-confirmed merge suggestion.
- Prefer cursor/keyset pagination for large, changing datasets.

**Acceptance:** 50/500/10,000-record tests remain bounded; no duplicate rows; search is server-side; counts and UI stay consistent after edits/deletes.

### 2.3 App-wide database and provider usage protection
Existing repository docs describe bounded queries, aggregates, batching, indexes, RLS, and GET coalescing. Extend this with:
- Outbound instrumentation for Supabase/PostgREST/pooler, Gemini, News, and Cricket.
- Bounded metrics by provider/endpoint/status/duration/request bytes/response bytes.
- Slow-query and large-response thresholds.
- Centralized polling policy; pause unnecessary work when offline or hidden.
- Explicit maximum page sizes and tests preventing unbounded list endpoints.
- Streaming/resumable exports and idempotent backup chunks.
- Graceful degradation and early quota warnings.

**Acceptance:** no normal list endpoint is unbounded; synthetic large datasets keep per-request work bounded; provider usage can be attributed; quota pressure produces warnings/fallbacks.

**Important:** pagination limits data sent per request; it does not reduce stored data by itself. No architecture can guarantee unlimited data at zero quota risk.

### 2.4 Finance correctness
PR #32 addressed missing `owner_user_id` for receipt/AI expenses. Next:
- Route manual, AI, receipt, and future SMS captures through one validation/persistence service.
- Detect possible duplicates using amount/date/merchant/account fingerprints; ask before merging.
- Show source, confidence, and edit history on transaction detail.
- Model income, expense, transfer, refund, and investment transactions distinctly.
- Keep earned income and investment gains separate in reports.
- Reconcile ledger rows against dashboard/monthly aggregates.
- Keep exports bounded/streamed.

**Acceptance:** every capture path appears consistently in ledger and summaries; duplicates are not silently deleted; investment gains are not misclassified as salary/business income.

### 2.5 Dashboard and navigation UX
- Focus the home screen on “What matters today?”
- Prioritize Today, Upcoming, Money Snapshot, and Briefing.
- Keep secondary widgets collapsible/personalizable.
- Replace blank failed widgets with clear unavailable/retry states.
- Remove duplicate information and excessive cards.
- Standardize spacing, typography, touch targets, loading skeletons, contrast, and Android safe areas.
- Keep information hierarchy consistent across desktop and mobile.

### 2.6 Tasks, reminders, and notifications
- Clear task lifecycle: inbox → planned → in progress → completed/cancelled.
- Preview parsed natural-language date/time before saving.
- Make recurrence timezone-safe and support exceptions.
- Track reminder queued/sent/delivered/failed states.
- Use bounded retries, idempotency keys, and duplicate suppression.
- Add quiet hours and notification preferences.
- Define offline sync conflict behavior.

**Acceptance:** reminders survive server restarts, are not duplicated, and failures are observable.

## 3. P1 — Differentiating AI capabilities

### 3.1 Safe multi-step agent
Build a typed tool registry for Tasks, Finance, Memory, Calendar, Notes, Search, and Notifications. Add:
- Stateful plan, current step, tool result, and failure tracking.
- Plan preview before execution.
- Permission tiers: read-only automatic; low-risk write with undo; critical/external/irreversible action requires confirmation.
- Pre-execution validation, post-execution verification, audit records, and rollback/undo payloads.
- Retry only idempotent actions; do not retry uncertain writes blindly.

Example: “Review today's tasks, find a free slot at 5 PM, add a client meeting, and remind me 30 minutes before.”

**Acceptance:** every step has a visible status; high-impact actions require approval; success is shown only after verified tool results.

**Architecture note:** if LangGraph is considered (as mentioned in architecture recommendations), first establish modular tool interfaces, permissions, and tests. Evaluate framework adoption through a separate ADR/POC rather than introducing it as an unverified dependency.

### 3.2 Contextual memory intelligence
- Separate short-term conversation context from long-term facts.
- Consent-aware extraction and retention.
- Benchmark Hindi/Hinglish/English cross-language retrieval.
- Combine keyword and semantic retrieval where useful.
- Inject only relevant, bounded memory into prompts.
- Preserve source/provenance; clarify low-confidence facts instead of asserting them.

### 3.3 Aether Live Voice Mode
Suggested phases:
1. Stabilize and instrument existing speech-to-text/TTS.
2. Prototype streaming audio and measure latency/cost.
3. Add voice activity detection and barge-in interruption.
4. Bind orb states to actual pipeline states: Listening, Thinking, Speaking, Interrupted, Error.
5. Support language auto-detection/switching.
6. Add user-selectable voice profiles.
7. Gracefully fall back to text/standard voice on network or microphone failure.

**Acceptance:** user can interrupt speech; orb reflects actual state; transcript and spoken answer remain aligned; permission failures are clear; latency/failure/cost are measured. Do not claim full-duplex or ultra-low latency until measured on real devices/networks.

### 3.4 Proactive briefing
- Configurable morning briefing with tasks, calendar, weather, and reminders.
- Evening wrap-up with completed/pending work and finance summary.
- Show source and timestamp for news.
- User-defined schedule and quiet hours.
- Make briefing generation idempotent; suggestions remain informational unless an action is approved.

### 3.5 Integrations
- Design conflict resolution before two-way Calendar sync.
- Use least-privilege OAuth scopes for email; draft by default and confirm before sending.
- Validate WhatsApp/Telegram webhook signatures/tokens; add replay protection, rate limits, delivery status, and retries.
- Keep secrets server-side and redact them from logs.

## 4. P2 — Product expansion

### Personal Knowledge Inbox
Capture PDFs, notes, links, and voice notes; add OCR/extraction, searchable knowledge, source citations, and user-controlled retention/deletion.

### Personal Workflow Automation
Trigger → condition → action builder, dry-run, execution history, approval gates, disable switch, bounded retry, and failure alerts.

### Smart Home
Study Amazon Echo/Alexa integration feasibility. Keep local discovery optional and permission-based; use command allowlists and confirmation for sensitive actions.

### Personal Finance Insights
Cash-flow trends, budget drift, recurring subscription detection, and portfolio tracking as a separate domain. Keep market insights informational; never promise returns or imply safe autonomous trading.

## 5. P3 — Avoid for now
- Microservices breakup or Kubernetes.
- Multiple vector databases without demonstrated need.
- Fully autonomous financial transactions.
- Bulk external messaging without approval.
- Always-on microphone/wake word before privacy and Android background constraints are proven.
- Paid managed services before usage and revenue justify them.

These add cost, complexity, and security surface before core reliability is established.

## 6. Recommended delivery order

| Order | Epic | Priority |
|---:|---|---|
| 1 | Web + Android + backend regression baseline | P0 |
| 2 | Memory Vault end-to-end verification and search/edit controls | P0 |
| 3 | Finance single-source-of-truth and reconciliation | P0 |
| 4 | Provider bandwidth attribution | P0 |
| 5 | Dashboard cleanup and error/empty states | P0 |
| 6 | Durable reminders and delivery status | P0 |
| 7 | Tool registry, permissions, verification, and undo | P1 |
| 8 | Stateful multi-step agent POC | P1 |
| 9 | Voice streaming/interruption POC | P1 |
| 10 | Contextual memory retrieval benchmark | P1 |
| 11 | Calendar/email/channel hardening | P1 |
| 12 | Knowledge inbox and workflow automation | P2 |

Dates and estimates should be set only after implementation-level inspection and free-tier capacity checks.

## 7. Definition of Done

- [ ] Requirement and expected behavior documented.
- [ ] Existing behavior and regression risks reviewed.
- [ ] API contract, authorization, and tenant isolation verified.
- [ ] Validation and error states implemented.
- [ ] Unit/integration tests added.
- [ ] Web/Desktop build passes.
- [ ] Android WebView/device smoke test passes.
- [ ] Loading, empty, offline, and retry states verified.
- [ ] Logs/metrics do not expose tokens, secrets, or unnecessary personal data.
- [ ] Performance and data-transfer impact measured.
- [ ] Rollback/migration plan documented where applicable.
- [ ] Production user journey verified after deployment.

## 8. Architecture guardrails

1. Keep a modular monolith for now; avoid premature microservices.
2. Prefer local-capable operations where practical; use cloud AI for complex reasoning.
3. Never silently perform destructive, financial, or external actions.
4. Keep memory consent-first and user-controllable.
5. Bound all data reads with pagination, aggregates, selected columns, and batching.
6. Make writes idempotent so retries do not create duplicate tasks/expenses/reminders.
7. Abstract AI providers from domain logic.
8. Track external provider usage separately.
9. Show success only after backend-confirmed, verified results.
10. Distinguish merged, deployed, and production-verified status.

## 9. First stabilization sprint

Before adding a new AI framework or major feature:
1. Run clean build and backend test baseline on current `dev`.
2. Verify PR #32–#39 affected flows on Web and Android.
3. Test Memory Vault with 50+ records, pagination, deduplication, and search.
4. Reconcile receipt scan → Finance ledger → dashboard summary.
5. Validate online/offline dashboard polling and `/api/metrics`.
6. Compare Supabase egress with application-level byte metrics over the same time window.
7. Add reproducible regression tests for every discovered failure.

Start parallel Stateful Agent and Live Voice work only after these exit criteria pass.

## 10. Success metrics

| Metric | Measurement |
|---|---|
| Core journey pass rate | Web + Android smoke suite |
| Duplicate write rate | Idempotency tests and logs |
| Finance reconciliation | Ledger totals vs dashboard aggregates |
| Memory pagination | 50/500/10k synthetic records |
| API response bytes | Endpoint metrics |
| Provider egress attribution | Outbound client instrumentation |
| Reminder delivery | Queued vs delivered/failed |
| Voice latency | End-to-end audio timestamps |
| Agent task success | Goal completion with verified tool results |
| Cost per active user | Provider usage / active users |

## 11. Assumptions

- Existing repository docs and recent merged PR descriptions are the baseline.
- README-listed capabilities are not automatically treated as production-ready.
- The plan does not require paid infrastructure.
- Quota protection means bounded workload, monitoring, and graceful degradation—not unlimited usage guarantees.
- Critical user actions require approval and auditability.
