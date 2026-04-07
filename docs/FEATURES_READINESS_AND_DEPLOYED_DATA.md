# Deployed data, feature inventory, and readiness

This document supports release planning: what the hosted stack **persists**, what the **UI exposes**, and **confidence** in each area (architecture fit, bug/unknown-error risk).  
**Note:** **App-wide maintenance** is controlled with `APP_MAINTENANCE_MODE=true` on the server (Railway). When enabled, the bootstrap payload sets `maintenanceMode`, the client shows a maintenance screen, and non-read-only API routes return **503** (except `/api/health`, `/api/healthz`, `/api/bootstrap`, `/api/config`, `/api/version`).

---

## 1. “Deployed data” — what lives in production

### PostgreSQL (Railway / server)

| Store | Role |
|--------|------|
| **`storage`** | Primary JSON blob store: `activities`, `activities:YYYY-MM` shards, `accounts`, `users`, `internalActivities`, `feature_flags`, `dashboardVisibility`, `dashboardMonth`, industries, regions, win/loss–related keys, optional `migration_*` drafts, etc. |
| **`storage_history`** | Archived prior values on overwrite (insurance / audit trail). |
| **`storage_mutations`** | Idempotency for append-style APIs. |
| **`activities` / `internal_activities`** | Normalized rows (dual-write from storage after writes). |
| **`accounts` / `projects`** | Normalized mirror where used. |
| **`users`** | Server-side users (auth). |
| **`sessions`** | Cookie sessions. |
| **`pricing_calculations`** | Pricing calculator integration (when enabled). |
| **`login_logs`**, **`activity_logs`**, **`activity_submission_logs`** | Operational / compliance logging. |
| **`pending_storage_saves`** | Legacy / conflict paths (mostly deprecated). |

### Client-only (per browser)

- **Bearer session id** in `sessionStorage` (`PAMS_AUTH_SESSION`) when `FORCE_COOKIE_AUTH` is not true; optional **httpOnly cookie** when `FORCE_COOKIE_AUTH=true`. Plus legacy local/session artifacts where still used.
- **Drafts** for failed activity saves (local + retry flows).
- **UI prefs** (e.g. analytics mix, dashboard layout prefs if any remain).

### Not “data” but deployed **behaviour**

- **`/api/bootstrap`** — `remoteStorage`, `cookieAuth`, `maintenanceMode`, `featureFlags`, `dashboardVisibility`, `dashboardMonth`.
- **`/api/config`** — subset of public config.
- **Feature flags** in DB (`feature_flags` key) — e.g. `pricingCalculatorSync`, `winLoss`, import/export toggles.

---

## 2. Major product features — readiness & risk

Scale: **High** = production-safe and aligned with architecture; **Medium** = works but watch edge cases; **Low** = higher chance of surprises.

| Feature | Readiness | Architecture fit | Bug / unknown-error risk |
|--------|-----------|-------------------|---------------------------|
| **Auth (Bearer + optional cookie)** | High | Core server design | Low — `Authorization: Bearer` from login `authSessionId`; set `FORCE_COOKIE_AUTH=true` to restore cookie-only behaviour. |
| **Remote storage + append API** (`/activities/append`, etc.) | High | Primary write path | Medium — rare 409 merges, network retries; mitigated by drafts and logs. |
| **Dashboard (card)** | High | Main presales UX | Medium — Chart.js lifecycle, large datasets slow render. |
| **Activities (log / edit / multi-row)** | High | Central domain | Medium — validation, POC Sandbox fields, concurrent edits. |
| **Drafts & submit-again** | Medium–High | Recovery path | Medium — user confusion if API fails silently. |
| **Win / loss** | Medium–High | Project-level | Medium — currency/MRR helpers, permission boundaries. |
| **Accounts / projects** | High | Tied to storage | Medium — large account lists, merge tooling mostly offline. |
| **Admin split (System / Configuration)** | High | Role-gated | Low–Medium — many sub-panels; test after flag changes. |
| **Sandbox Access (ex–POC)** | Medium | Reads `type === 'poc'` | Medium — date cutoffs (Jan 2026), filters vs expectations. |
| **Reports V2** (charts, tabs, filters) | Medium | Heavy client + `DataManager` | **Higher** — large activity sets, Chart.js, tab state. |
| **Pricing calculator sync** | Medium (flag **off** default) | API + DB + UI | Medium — 403 when disabled, link/delete flows, env keys. |
| **CSV import / export** | Medium | Client + storage | Medium — large files, validation, timeouts. |
| **Normalized dual-write** | Medium–High | Async after storage | Low–Medium — failure is non-blocking; possible drift if investigated. |
| **GitHub Actions backups** | Medium | Daily + pre-deploy workflows upload **artifacts** only (no backup JSON committed to Git). | Medium — requires secrets; download artifacts from Actions for retention. |
| **Migration / preload** | Low–Medium (env dependent) | Separate from daily UX | Higher if CSV paths wrong or keys huge. |

---

## 3. Suggested order for your next push

1. Set **`APP_MAINTENANCE_MODE=false`** on Railway when you want users to use the app again; leave **`true`** for full lockdown (no login, no API except allowed read-only endpoints).  
2. Run **`npm run syntax-check`** and deploy.  
3. Smoke-test login (Bearer session persists across refresh) and Reports when maintenance is off.

---

*Generated for internal planning; update this file as features ship.*
