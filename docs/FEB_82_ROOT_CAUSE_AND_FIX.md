# Why February showed 82 activities – root cause and fix

## Root causes (all three)

### 1. Month filter ignored `monthOfActivity` (main cause of “82 for Feb”)
- **Where:** `getActivitiesInPeriodForAccounts()` in `pams-app/js/app.js` filtered by `date`/`createdAt` only.
- **Effect:** Migrated activities with `monthOfActivity: '2026-02'` but missing or different `date` were **excluded** from the February view. Only ~82 had `date` in 2026-02; the rest were excluded.
- **Fix:** Use `DataManager.resolveActivityMonth(a)` for the period filter (same as reports and elsewhere) so migrated Feb activities are included.

### 2. Restore script sent wrong PUT body (restores never persisted)
- **Where:** `restore-feb-into-activities-key.js` did `body: JSON.stringify({ value: array })`.
- **Effect:** Server received `value` as an array. It does `serializedValue = String(value)`, so it got a non-JSON string. Merge then parsed incoming as `[]`, so the merge result was just the existing data. **No restore ever wrote the merged list to the DB.**
- **Fix:** Send `body: JSON.stringify({ value: JSON.stringify(array) })` so the server gets a JSON string and merge works.

### 3. Caching (total count stuck at 82)
- Already addressed in earlier fixes: no stale fallback in `getItemAsync`, no server read cache for `activities`, and DataManager cache cleared when remote is on.

## What we changed

| File | Change |
|------|--------|
| `pams-app/js/app.js` | `getActivitiesInPeriodForAccounts()` now uses `DataManager.resolveActivityMonth(a)` so February (and any month) includes migrated activities with `monthOfActivity`. |
| `server/scripts/restore-feb-into-activities-key.js` | PUT body: `value: JSON.stringify(array)`; after main restore, also PUT `activities:2026-02` shard with Feb list. |

## After deploy

1. Run the restore script once (so the corrected PUT actually persists):
   ```bash
   REMOTE_STORAGE_BASE=https://your-app.up.railway.app/api/storage REMOTE_STORAGE_USER=user@example.com node server/scripts/restore-feb-into-activities-key.js
   ```
2. Hard-refresh the app (Ctrl+Shift+R). February should show the full count (e.g. 189), not 82.
