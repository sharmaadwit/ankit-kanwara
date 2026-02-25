# Run cleanup and size report on Railway

The database uses Railway’s internal URL, so these scripts must run **inside Railway** (same network as the DB).

## Option 1: Railway CLI (recommended)

From your machine, in the project directory:

```bash
# Install Railway CLI if needed: npm i -g @railway/cli
railway link   # link to your project once
```

**1. Analyze current disk usage**

```bash
railway run npm run db-size-report
```

**2. Delete all data before June 2025 and run VACUUM**

```bash
railway run bash -c "export DELETE_BEFORE_DATE=2025-06-01; node server/scripts/cleanup-logs-and-history.js"
```

(On Windows PowerShell with Railway CLI:  
`railway run powershell -Command "$env:DELETE_BEFORE_DATE='2025-06-01'; node server/scripts/cleanup-logs-and-history.js"`)

**3. Or use retention-based cleanup (e.g. keep last 90 days)**

```bash
railway run npm run cleanup-logs-and-history
```

To change retention, set env in Railway dashboard (e.g. `LOGIN_LOGS_RETENTION_DAYS=90`) or:

```bash
railway run bash -c "export LOGIN_LOGS_RETENTION_DAYS=90; export STORAGE_HISTORY_RETENTION_DAYS=90; node server/scripts/cleanup-logs-and-history.js"
```

## Option 2: Railway dashboard

1. Open your Railway project → your service (or a one-off shell).
2. Add **Variables**: e.g. `DELETE_BEFORE_DATE=2025-06-01` for the “before June 2025” cleanup.
3. Run a one-off command (if your plan supports it), e.g.:
   - `node server/scripts/db-size-report.js`
   - `node server/scripts/cleanup-logs-and-history.js`

## What the cleanup does when `DELETE_BEFORE_DATE=2025-06-01`

- **login_logs**: deletes every row with `created_at < 2025-06-01`
- **activity_logs**: deletes every row with `created_at < 2025-06-01`
- **storage_history**: deletes every row with `archived_at < 2025-06-01`
- Then runs **VACUUM** on those three tables to reclaim disk.

Data from 2025-06-01 onward is kept.
