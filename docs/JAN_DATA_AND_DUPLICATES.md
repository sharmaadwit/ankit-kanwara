# Jan data fix and duplicate detection

## What was wrong

1. **January count too high (e.g. 264 instead of ~100)**  
   - Merge had saved **all activities** (external + internal) into the `activities` key, so internal activities were stored in both `activities` and `internalActivities` and were **double-counted** in the UI.  
   - Month was sometimes taken from **submission time** (`createdAt`) instead of **user-entered activity date** (`date` / `monthOfActivity`), so activities from other months could appear in January.

2. **Yashas showing 70 (wrong)**  
   - Same double-count: if the same activity appeared in both lists, filtering by owner “Yashas” could count it twice.

## Fixes applied

### 1. Only user-given activity date for January (and all months)

- **`DataManager.resolveActivityMonth(activity)`** now uses only:
  - `monthOfActivity` (when valid `YYYY-MM`), then
  - `activity.date`
- It **no longer** uses `createdAt`. So “Jan” = activities where the **user-entered date** (or `monthOfActivity`) is January, not submission date.

### 2. Deduplication in `getAllActivities()`

- **External list:** Drop any activity whose `id` is in `internalActivities` (fixes merge corruption where internal was written into `activities`).
- **External list:** Keep only the **first occurrence** of each `id` (removes duplicates within the external list).
- Result: internal activities are never double-counted; duplicate ids in external are shown once.

### 3. Month filters use only activity date

- Dashboard “last month” and “this month”, card view grouping, timeframe filter “This month” / “Last month”, and custom month logic all use **only** `resolveActivityMonth` or `activity.date` (no `createdAt` fallback for month).

## Finding duplicates (script)

**In the browser (hosted app, after login):**

1. Open DevTools (F12) → Console.
2. Paste and run the contents of `scripts/find-activity-duplicates.js`.

**With Node and a backup JSON:**

- The backup file should have `{ "activities": [], "internalActivities": [] }` (e.g. from an export or storage snapshot that exposes those keys).
- Run:  
  `node scripts/find-activity-duplicates.js path/to/backup.json`

The script reports:

- Count in `activities` vs `internalActivities`
- **In BOTH keys** (merge corruption)
- **Duplicate ids** within the external list
- Counts **by month** (user activity date only) and **by user**
- **Jan 2026** count and **Yashas** count (name contains “yashas”)

After deploying the code fixes, refresh the app and re-check January and Yashas; the script helps confirm how many duplicates were in the data before/after.
