# Data and disk growth – what’s causing it

Even with a single user and no recent “big” changes, you can see:

- **Network egress spikes** (~2 MB) when you use the app (e.g. after login).
- **Postgres disk at 600 MB** (volume full).

Nothing new needs to be “added” for this – it’s normal behavior that accumulates over time.

---

## 1. Network egress spike (why ~2 MB when you log in)

On **every login** the app runs a “reconcile” that refetches entity data from the server:

1. **One batch request**  
   `GET /api/storage/batch?keys=internalActivities,accounts,users`  
   Returns all three blobs in a single response (often the largest part of the spike).

2. **One activities request**  
   `GET /api/storage/activities`  
   Returns the full activities list (can be 100s of KB to over 1 MB depending on count and fields).

So the **2 MB egress** is mostly the app sending you:

- `internalActivities` + `accounts` + `users` (batch)
- `activities`

That’s by design (full refetch on login). With a lot of activities/accounts, the response size grows and you get a visible spike. No new bug – just large payloads.

**If you want to reduce it later:** you’d need to change the reconcile strategy (e.g. only refetch changed keys, or paginate activities) – not done here.

---

## 2. Disk growth (why Postgres is at 600 MB)

The main consumers are:

| Source | Why it grows |
|--------|-------------------------------|
| **`storage`** | One row per key; `value` is JSON (e.g. `activities`, `accounts`, `internalActivities`, `users`). As you add activities/accounts, these blobs get bigger. |
| **`storage_history`** | **Every time** a storage key is updated, the **previous** value is copied here (“The Insurance”). There is **no retention** – rows are never deleted by the app. So every save to `activities` (and other keys) adds another large row. This table can dominate disk over time. |
| **`login_logs`** | One row per login attempt; no automatic retention. |
| **`activity_logs`** | Has 14-day retention (old rows deleted periodically). |

So the spike isn’t from a new feature; it’s from:

- Normal use (more activities/accounts → bigger `storage` rows).
- **Unbounded `storage_history`** – every update to big keys (especially `activities`) adds another full copy to history.

---

## 3. What to do

### See what’s using space

From the project root (with `DATABASE_URL` or Railway env set):

```bash
node server/scripts/db-size-report.js
```

This prints:

- Table sizes (so you see `storage`, `storage_history`, etc.).
- Top 20 `storage` keys by value size.
- `storage_history` row count and size.

Run it on Railway (e.g. one-off run with `railway run node server/scripts/db-size-report.js`) or locally with the same `DATABASE_URL`.

### Delete old logs and history (recommended)

One script cleans **login_logs**, **activity_logs**, **storage_history**, and runs **VACUUM**:

```bash
node server/scripts/cleanup-logs-and-history.js
```

Defaults: keep last 90 days of login_logs, 14 days of activity_logs, 90 days of storage_history. To **delete all log data up to now** (keep nothing), run:

```bash
set LOGIN_LOGS_RETENTION_DAYS=0
set ACTIVITY_LOGS_RETENTION_DAYS=0
set STORAGE_HISTORY_RETENTION_DAYS=0
node server/scripts/cleanup-logs-and-history.js
```

(On Windows PowerShell use `$env:LOGIN_LOGS_RETENTION_DAYS=0` etc.; on Unix/Mac use `export`.) Optional env: `LOGIN_LOGS_RETENTION_DAYS=30` etc. to use different retention.

**Ongoing:** The app now enforces **login_logs** retention (90 days) automatically on each login write, so login_logs won’t grow unbounded. activity_logs already had 14-day retention.

To only trim storage_history:

```bash
node server/scripts/cleanup-storage-history.js
```

Then:

- **Increase the Postgres volume size** in Railway (e.g. 600 MB → 1–2 GB) so you’re not constantly at the limit.
- Optionally run `cleanup-storage-history.js` on a schedule (cron or scheduled task) so history doesn’t fill the disk again.

---

## Summary

| What you see | Cause |
|--------------|--------|
| **Network spike (~2 MB)** | Login reconcile: batch (internalActivities + accounts + users) + full activities. Large but expected for current design. |
| **Disk at 600 MB** | Big `storage` values + **unbounded `storage_history`** (every update archives the old value, no retention). |

So the “data spike” is from existing behavior (reconcile payloads + history growth), not from a new bug. Use the scripts above to inspect and reduce disk usage, and increase the Postgres volume so the app isn’t running on a full disk.
