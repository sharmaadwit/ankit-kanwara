# QA & Operations Reference

## QA Checklist (Phase 1 & 2 coverage)
- **Authentication** – Login/logout flows with default users; analytics-only accounts redirect to `Reports` view.
- **Activity Lifecycle** – Create, edit, and delete internal/external activities; verify validation messages and modal reset states.
- **CSV Import/Export** – Dry-run and commit both internal/external templates, confirm `#` comment rows are ignored and category inferred from filename; run `Export CSV` in Reports tab.
- **Win/Loss Management** – Update status (Won/Lost/Active), ensure SFDC link validation, OTD notes, currency conversion with INR fallback, and modal resets for new entries.
- **Admin Console** – Edit users (roles, status, password), manage sales reps with currency + FX rate, verify list refreshes and duplicates are prevented.
- **Theming & Interfaces** – Toggle Light/Dark/Gupshup themes and interface layouts; confirm card backgrounds (`#BDBBEF`) and gradient titles render consistently.
- **Remote Storage Toggle** – With `FORCE_REMOTE_STORAGE=true`, confirm storage API usage; without flag, verify `localStorage` fallback continues to work.

## Role Highlights
- **Admin** – Can switch interfaces/themes, manage users/sales reps, and configure environment variables (`CORS_ALLOW_ORIGINS`, `STORAGE_API_KEY`) for hardened deployments.
- **Presales User** – Full access to activity logging, win/loss tracking, CSV import/export, and dashboard analytics.
- **Analytics Access** – Redirected to Reports view; `Activity Management` tab hidden automatically to prevent edits.

## Deployment Runbook (Railway + PostgreSQL)
1. **Configure Environment Variables**
   - `DATABASE_URL` (or `PG*` fallbacks), `FORCE_REMOTE_STORAGE=true`, `FORCE_PG_SSL=true`.
   - Security variables: `CORS_ALLOW_ORIGINS`, `APP_PUBLIC_URL`, and optional `STORAGE_API_KEY` for storage API guardrails.
2. **Migrate Database**
   - `npm install` (if dependencies not yet installed).
   - `npm run migrate` to create the `storage` table.
3. **Release**
   - `npm start` locally or deploy on Railway (auto-detects `Procfile`).
   - Verify logs include `server_listening` structured event.
4. **Smoke Test**
   - Hit `/api/health` (or run `npm run uptime`) and complete the QA checklist against production data snapshot.

## Observability & Uptime
- Structured logs (`http_request`, `pg_pool_*`, `server_*`) emit JSON to stdout for ingestion by Railway/Logtail.
- Background health checks: `npm run uptime` (uses `HEALTHCHECK_URL` override if set) suitable for cron-based monitors.
- Supertest suite: `npm test` exercises storage API CRUD via in-memory Postgres (`pg-mem`).

## Phase 3 Backlog Candidates
- Convert CSV templates to guided `.xlsx` format with drop-down validation.
- Persist saved filters per user for Activities/Reports views.
- Per-user theme overrides in addition to global admin toggle.
- Role-based API key rotation & session-backed storage proxy (replace stub guard).
- Prebuilt analytics exports (monthly PDF deck, scheduled email digests).


