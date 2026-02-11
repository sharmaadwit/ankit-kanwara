# Incident Runbook: DB Flap / App Crash Loop

Use this runbook when users report freezes, failed saves, or app downtime and logs show `ECONNREFUSED`, DB restarts, or repeated container restarts.

## Scope

- App: `server/index.js` startup and runtime DB behavior
- DB: PostgreSQL availability on Railway
- Health endpoints:
  - `/api/health` (simple readiness)
  - `/api/healthz` (detailed runtime state)

## 5-minute triage checklist

1. Confirm latest backend deploy is active.
   - Verify current commit hash in Railway deploy metadata.
   - Ensure the latest resilience commit is running (contains `/api/healthz` and runtime DB fields).

2. Check health endpoint immediately.
   - `GET /api/healthz`
   - Healthy:
     - `status: "ok"`
     - `db.reachable: true`
   - Degraded:
     - `status: "degraded"`
     - `db.reachable: false`
     - Runtime shows retry activity (`dbInitRetryScheduled`, `dbInitRetryCount`, recent `dbLastError*`).

3. Inspect application logs for crash indicators.
   - Critical bad signs:
     - `Unhandled 'error' event on BoundPool`
     - process exits after DB connection errors
   - Expected under transient DB issue:
     - `db_init_failed_retrying`
     - no process exit

4. Inspect DB logs for restart/recovery patterns.
   - Indicators of DB restart:
     - `starting PostgreSQL`
     - `database system was interrupted`
     - `automatic recovery in progress`
     - `database system is ready to accept connections`

5. Confirm recovery behavior.
   - App should remain online while DB is recovering.
   - `/api/healthz` should move from `degraded` to `ok` without requiring manual app restart.

## Fast commands

Replace `APP_URL` with your deployed backend base URL.

```bash
curl -s "APP_URL/api/healthz"
curl -s -o /dev/null -w "%{http_code}\n" "APP_URL/api/health"
```

## How to read `/api/healthz`

Example healthy:

```json
{
  "status": "ok",
  "db": { "reachable": true },
  "runtime": {
    "dbInitialized": true,
    "dbInitRetryScheduled": false,
    "dbInitRetryCount": 2,
    "dbLastErrorAt": null,
    "dbLastErrorCode": null,
    "dbLastErrorMessage": null,
    "dbLastSuccessAt": "2026-02-11T15:08:02.003Z",
    "uptimeSeconds": 643
  }
}
```

Example degraded:

```json
{
  "status": "degraded",
  "db": { "reachable": false },
  "runtime": {
    "dbInitialized": false,
    "dbInitRetryScheduled": true,
    "dbInitRetryCount": 17,
    "dbLastErrorAt": "2026-02-11T15:10:44.718Z",
    "dbLastErrorCode": "ECONNREFUSED",
    "dbLastErrorMessage": "connect ECONNREFUSED ...:5432",
    "dbLastSuccessAt": null,
    "uptimeSeconds": 112
  }
}
```

## Decision tree

- If app crashes or exits:
  - Treat as deploy drift or missing resilience code.
  - Force redeploy latest commit.
  - Verify logs no longer show unhandled pool error.

- If app stays up but health is degraded:
  - Primary issue is DB availability.
  - Check DB resource and restart events in Railway.
  - Keep app running; do not bounce repeatedly unless instructed.

- If `ERR_ERL_PERMISSIVE_TRUST_PROXY` appears:
  - Running build has old proxy config.
  - Redeploy build with `app.set('trust proxy', 1)`.

## Stabilization actions

- Keep app replica count conservative until DB stabilizes.
- Avoid rapid repeated redeploys during active DB outage.
- If DB restarts are frequent, review Railway DB plan/resources and platform events.

## Post-incident notes template

- Incident start time:
- Incident end time:
- User impact summary:
- `/api/healthz` snapshots (first and recovered):
- App log highlights:
- DB log highlights:
- Root cause category (`deploy drift`, `DB restart`, `both`):
- Corrective action taken:
- Follow-up task owner and due date:
