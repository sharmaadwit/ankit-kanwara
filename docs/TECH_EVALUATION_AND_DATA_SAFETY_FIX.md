# Tech evaluation & data safety fix (once and for all)

**Roles:** Tech evaluator (app critique) + Server expert (data loss root cause and fixes).

---

## Part 1 – Tech evaluator: app critique

### What’s working well

- **Reports V2:** Single reporting surface (Presales, Sales, Regional, Monthly PDF, AI), period selector, Cube Analysis and use cases driven from data. Card and standard interfaces both use V2.
- **Remote storage:** Async path with drafts, `lastVersion` for optimistic locking, outbox, and 409 merge-retry on the client for activities.
- **Server-side activity merge:** For `activities` and `activities:YYYY-MM`, the server **merges** incoming PUT with current (by id, newer wins) instead of blind overwrite. That directly addresses the “partial list overwrites everyone” failure mode.
- **Targeted activity APIs:** `POST /activities/append` and `POST /activities/remove` allow create/update/delete without sending the full list; used when remote storage is on for new activities and edits.
- **Backups and history:** `storage_history` and `pending_storage_saves` (Lost & Found), deploy/hourly snapshots, merge script for restore.
- **If-Match required for activities:** Server rejects activity PUTs without `If-Match`, reducing accidental overwrites with stale data.

### What’s not working or is risky

| Area | Issue | Impact |
|------|--------|--------|
| **Accounts PUT** | Server does **not** merge `accounts` on PUT. A single partial or stale `saveAccounts()` overwrites the whole key. | Org-wide account/project loss if one client sends a partial or old list. |
| **deleteAccount when remote** | `deleteAccount()` calls `saveActivities(filteredActivities)` (full list minus that account’s activities). Server merge **keeps** all activities by id, so “deleted” activities are **not** removed; only accounts are updated. So deleting an account does not remove its activities on the server when using merge. | Orphaned activities for the “deleted” account, or confusion when data reappears. |
| **Multiple tabs / stale lastVersion** | If two tabs load and only one refetches, the other can still PUT with an old or empty `If-Match`. Server merge protects activities, but 409 handling and UX (e.g. “Submit again overwrites”) could be clearer. | Conflicts and user confusion; possible overwrites for **accounts** (no merge). |
| **Init and backfill** | When remote is on, backfill and migration cleanup are skipped on init (good). Any remaining code path that does a full-list activity PUT right after load (e.g. from cache or a stray event) could still send a partial list; server merge makes that less harmful for activities only. | Mostly mitigated for activities; accounts and other keys still at risk. |
| **Sync path and 409** | Sync `setItem` path can hit 409; doc says it doesn’t update `lastVersion` there. So a later “Submit again” might use wrong version. | Edge-case conflicts and retries. |
| **Draft “Submit again” semantics** | Last-write-wins is documented but not clearly shown in UI (“Submitting again will replace current data with this draft”). | Users may overwrite others’ data without realising. |
| **Restore from backup** | No UI for “Restore from backup”; console-only. Restoring can re-submit and create duplicates if some drafts were already submitted. | Confusion and duplicate data if used incorrectly. |

### Summary (evaluator)

- **Activities:** Server merge + If-Match + append/remove APIs are the right direction; remaining risk is mostly accounts, deleteAccount semantics, and multi-tab/stale-version UX.
- **Accounts:** Same “partial list overwrites everyone” risk that activities used to have; no server-side merge.
- **UX and ops:** Conflict messaging, optional refetch on tab focus, and backup restore UX would improve safety and operability.

---

## Part 2 – Server expert: why data was lost and how to fix it for good

### Root cause (both months)

1. **Blind overwrite (historically)**  
   A client sent a **full-list PUT** with a **partial or stale** list (e.g. 2632 instead of 5303). The server **replaced** the key with that list. One bad PUT could trim data for everyone until restore from backup.

2. **How it happened**  
   - Stale or empty `lastVersion` (e.g. new tab, or no GET after login).  
   - Client thought it had the “full” list (e.g. from cache or failed GET).  
   - One full-list PUT (e.g. after add/edit or init) overwrote server with that list.

3. **What’s already in place**  
   - **Activities:** Server **merges** on PUT for `activities` and `activities:YYYY-MM` (`mergeActivitiesPayload`). So a partial payload is merged with current; no trim by omission.  
   - **If-Match required** for activities; no write without a version.  
   - **Archive before write** (`storage_history`), **Lost & Found** (409 payloads), **backups**, and client 409 merge-retry for activities.

### Why loss can still happen

| Cause | Status | Note |
|-------|--------|------|
| Partial **activities** PUT | **Mitigated** | Server merge prevents trim. |
| Partial **accounts** PUT | **Not mitigated** | Still full overwrite. |
| Stale **If-Match** | **Partial** | 409 returns current value; client can retry. But if client doesn’t retry or user discards, no merge. |
| **deleteAccount** with full-list activity save | **Wrong behaviour** | Server merge keeps all activities by id; “deleted” activities are not removed. |
| **Multi-tab** / first-save race | **Partial** | lastVersion set on reconcile; no refetch on tab focus. |
| **Accounts** overwrite | **Risk** | Any partial or stale saveAccounts() can wipe accounts for everyone. |

---

## Part 3 – Fix once and for all (concrete list)

### Tier 1 – Server: make overwrites impossible for list keys

1. **Server-side merge for `accounts` (same idea as activities)**  
   - Add `isAccountsStorageKey(key)` (e.g. `key === 'accounts'`).  
   - In the PUT handler, for that key: read current value, **merge** with incoming (e.g. by `account.id`; newer `updatedAt`/timestamp wins; nested projects merged by `project.id`).  
   - Write the **merged** result instead of raw incoming.  
   - Effect: a partial or stale `saveAccounts()` can no longer wipe the whole account list.

2. **Optional: merge for `internalActivities`**  
   - Same pattern: merge by id (and optionally by a stable signature if no id), newer wins.  
   - Prevents one partial PUT from trimming internal activities org-wide.

3. **Keep activities merge and If-Match**  
   - No change; keep requiring If-Match for activities and merging on PUT.

### Tier 2 – Client: stop full-list activity PUT where possible

4. **deleteAccount when remote**  
   - Do **not** call `saveActivities(filteredActivities)`.  
   - For each activity with `accountId === accountId`, call `removeActivityViaServer(activityId)` (POST `/activities/remove`).  
   - Then call `saveAccounts(accounts)` (account removed from list).  
   - Effect: server state matches intent; no reliance on “omission” in a full list (which merge would ignore anyway).

5. **Ensure no full-list activity PUT on init**  
   - Already skipped: backfill and migration cleanup when remote.  
   - Verify no other path (e.g. event or timer) does `saveActivities(...)` immediately after load without user action; if any, remove or guard so that when remote, we only use append/remove for activities.

### Tier 3 – UX and operability

6. **Conflict draft UX**  
   - When a draft’s error is “Conflict – someone else saved…”, show a short line: **“Submitting again will replace the current saved data with this draft.”**  
   - Reduces accidental overwrite, especially for accounts once they use merge.

7. **Refetch on tab focus (optional but recommended)**  
   - When the tab gains focus and last refetch for entity keys (e.g. activities, accounts) was more than N minutes ago (e.g. 2), trigger a reconcile (GET and set `lastVersion`).  
   - Reduces multi-tab and long-idle stale overwrites.

8. **Sync path 409**  
   - In the sync `setItem` path, on 409 with `error.updated_at`, set `lastVersion[key] = error.updated_at` before merge/retry so a later “Submit again” uses the right version.

9. **Restore from backup (optional)**  
   - Add a “Restore from backup” control in Drafts when backup exists, with a clear warning that it can create duplicates if some drafts were already submitted.

### Tier 4 – Observability and ops

10. **Log PUT size for list keys**  
    - Already have `extractPayloadCount` and `logStorageWrite`.  
    - Add an alert or dashboard when activity/account count **drops** between consecutive PUTs (e.g. count today &lt; 0.9 × count yesterday) so you can detect trim early even with server merge.

11. **Backup verification**  
    - Periodic job or checklist: restore from latest backup into a staging key or DB and compare counts (e.g. activities, accounts) to production.  
    - Ensures backups are valid and restores are practiced.

---

## Implementation order (recommended)

| Order | Item | Effort | Impact |
|-------|------|--------|--------|
| 1 | Server merge for `accounts` | Medium | Stops org-wide account loss from one partial save. |
| 2 | deleteAccount: use remove endpoint per activity when remote | Small | **Done:** `data.js` deleteAccount now calls `removeActivityViaServer(activityId)` for each activity when remote, then saveAccounts. |
| 3 | Conflict draft UX (one-line warning) | Small | Fewer accidental overwrites. |
| 4 | Sync path: set lastVersion on 409 | Small | Correct retries. |
| 5 | Refetch on tab focus (after idle) | Medium | Fewer stale overwrites. |
| 6 | Merge for `internalActivities` | Small | Same safety as activities. |
| 7 | Restore-from-backup UI + warning | Small | Safer recovery. |
| 8 | Alerts / checks on count drops | Low | Early detection. |

---

## Checklist for “no more data loss” (target state)

- [ ] **Activities:** Server merges on PUT; If-Match required; append/remove used for create/update/delete when remote.  
- [ ] **Accounts:** Server merges on PUT (by account id, nested projects by project id).  
- [ ] **internalActivities:** Server merges on PUT (optional but recommended).  
- [ ] **deleteAccount:** When remote, uses POST `/activities/remove` per activity then saveAccounts (no full-list activity PUT to “delete” by omission).  
- [ ] **No full-list activity PUT** on init or background when remote; only user-driven or explicit append/remove.  
- [ ] **Conflict UX:** Users see that “Submit again” replaces current data.  
- [ ] **lastVersion:** Set on 409 in both async and sync paths; refetch on tab focus after idle.  
- [ ] **Backups:** Automated, verified, and restore tested; optional alert on large count drops.

Once Tier 1 and Tier 2 are in place, the main remaining vectors for org-wide loss (partial overwrites and deleteAccount semantics) are addressed; Tier 3–4 harden behaviour and ops further.
