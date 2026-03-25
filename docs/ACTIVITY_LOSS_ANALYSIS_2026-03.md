# Activity loss analysis (past week) and root cause

## Backup counts (past 7 days)

| Snapshot | Date (file mtime) | Activity count |
|----------|-------------------|----------------|
| 2026-02-27, 28, 03-01 | Mar 1 | 5289–5303 |
| **2026-03-02** | Mar 2 | **2632** ← large drop |
| 2026-03-02-07 … 2026-03-04 | Mar 3–4 | 6214–6278 |

**Finding:** On **March 2** a single snapshot had only **2632** activities (down from **5303**). Later snapshots recovered to 6214+. So a **full overwrite with a partial list** likely happened once (e.g. one client saved a stale or partial list and overwrote the server). Merging backups by id (newer wins) recovers the maximum set; duplicates are ignored.

## Why data can be lost after logging

1. **Server accepts blind overwrite:** The storage API **PUT** for `activities` (and shards) **replaces** the value. It does not merge with existing data. So if a client sends a list that is missing some activities (e.g. stale cache, failed earlier fetch, or a bug that sent only one shard), the server stores that and everyone sees the trimmed set.

2. **Client path:** When a user adds an activity, the app:
   - Clears cache, calls `getActivities()` (async GET from server),
   - Appends the new activity,
   - Calls `saveActivities(activities)` → **PUT** that full list.
   If the GET returned a partial list (e.g. network/cache issue, or server had already been overwritten), the subsequent PUT overwrites with that partial list and **trims** everyone’s data.

3. **No merge on PUT:** The **sync** storage path in the client has merge-on-conflict logic; the **async** path (used in production) does a direct PUT. So every save is a full replace. One bad partial save can cause org-wide loss until the next good backup or restore.

## What we did

- **Merge script** now collects activities from:
  - `data.activities` (legacy array)
  - `data['activities:YYYY-MM']` (all shards)
  - Manifest buckets when present
- **MERGE_DAYS=7** limits merge to backups from the last 7 days.
- **Restore:** Prefer restoring from the **single best snapshot** (e.g. `storage-snapshot-latest.json` or `storage-snapshot-2026-03-04.json`) which has the highest count. The merged snapshot dedupes by id across all files, so it can yield a lower total if the same id appears in both legacy and shards; use merged restore only when you need to combine multiple different backup dates.

## Recommendations

1. **Short term:** Restore from merged snapshot (see restore steps in WHERE_TO_LOOK_ACTIVITIES.md). Have users export local cache if they have extra activities (see USER_LOCAL_CACHE_EXPORT.md).
2. **Medium term:** Add **server-side merge** for `activities` (and activity shards) on PUT: read current value, merge by id (newer wins), then write. That way a single partial payload cannot overwrite the full dataset.
3. **Ongoing:** Keep hourly/deploy backups; run merge + restore after any suspected loss.
