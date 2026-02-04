# Parallel Processing and Data Loss Fix

## Problem

The app was **not** safe for parallel use. Data could be lost when:

- Multiple browser tabs were open and both saved (activities, accounts, internal activities).
- Multiple users edited the same data at the same time.
- Rapid successive saves (e.g. bulk add) overlapped.

Cause: **read–modify–write without concurrency control**. Each save did:

1. GET full blob (activities/accounts)
2. Modify in memory
3. PUT full blob

If two requests did this in parallel, the last PUT overwrote the other, so one set of changes was lost.

## Solution: Optimistic Locking + Merge on Conflict

### Backend (storage API)

- **GET `/api/storage/:key`**  
  Response now includes `updated_at` (version) with the value:
  `{ key, value, updated_at }`.

- **PUT `/api/storage/:key`**  
  - **Without `If-Match`**  
    Same as before: unconditional upsert, response `204`.
  - **With `If-Match: <updated_at>`**  
    Update only if the current row’s `updated_at` equals `If-Match`.  
    - Success: `200` and `{ key, updated_at }`.  
    - Conflict (someone else updated): `409` and `{ message, value, updated_at }` (current server value).

So each key has a version (`updated_at`); clients send it on PUT and the server rejects conflicting writes with 409.

### Frontend (remoteStorage)

- **Version cache**  
  For each GET that returns `key` and `updated_at`, the client stores `lastVersion[key] = updated_at`.

- **Conditional PUT**  
  When saving, the client sends `If-Match: lastVersion[key]` when that key has a cached version.

- **Conflict handling (409)**  
  For **activities**, **accounts**, and **internalActivities**:
  1. Refetch current server state (GET/compose).
  2. **Merge by id**: keep server items whose id is not in “our” list, then append “our” list (our items win for same id).
  3. Retry save once with the merged payload.

So parallel or overlapping saves no longer overwrite each other silently; one may get 409 and then retry with a merged state, avoiding data loss.

### What is safe now

- **Multiple tabs**: Each tab has its own version cache; if both save, one may get 409, merge, and retry.
- **Multiple users**: Same: last writer still “wins” for a given id, but other users’ rows are kept via merge.
- **Rapid saves**: Version is updated after each successful conditional PUT (200 response), so the next save uses the new version.

### What is unchanged

- **Single-key keys** (e.g. `accounts`, `internalActivities`) use the same optimistic locking and merge-on-409.
- **Sharded activities** use the same idea: manifest and each bucket key have their own version; conditional PUT and merge-on-409 apply when saving activities.

## Testing

- `server/__tests__/storage.test.js` includes:
  - GET returns `updated_at`.
  - Conditional PUT with valid `If-Match` returns 200 and new `updated_at`.
  - Conditional PUT with stale `If-Match` returns 409 and current value/version.

## Summary

The app is now **ready for parallel processing** in the sense that:

1. **Optimistic locking** (version/`If-Match`) prevents silent overwrites.
2. **Merge on 409** for activities, accounts, and internalActivities preserves both your changes and others’ when conflicts occur.
3. You may still see a rare “Conflict” or need a refresh if many users edit the same id at once; in that case the merge strategy (our list wins for same id) keeps data consistent without dropping other users’ rows.

If you were losing data before, it was almost certainly due to the read–modify–write race. With this fix deployed, that class of data loss should stop.
