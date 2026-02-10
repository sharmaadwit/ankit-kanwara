# Stabilization approaches (PAMS_MASTER §8)

Concrete options for finishing **§8.1 (server-only fetch, reconcile, async callers)** and **§8.2 (Phase 3 auth cutover)**. Pick one approach per area and then implement in the suggested order.

---

## 1. Server-only fetch, no local cache (§8.1)

**Goal:** DataManager and UI must not use in-memory cache or local backup as source of truth. Reads come from the server (or a short-lived “last fetch” that is explicitly invalidated).

### Approach A – Last-fetch with explicit invalidate (recommended)

- **Idea:** Keep a per-key “last fetch” in DataManager (e.g. `_lastFetch[key] = { data, at }`). TTL optional (e.g. 60s) or no TTL.
- **Read path:**  
  - If `invalidateCache(key)` was called (or key not in lastFetch), call `getItemAsync(key)` (or entities API), store in `_lastFetch[key]`, return.  
  - Else return `_lastFetch[key].data`.  
  So UI still gets one in-memory copy, but it is **server-backed** and only valid until invalidate.
- **Invalidate when:**  
  - After any successful PUT for that key (or for activities, any activity save).  
  - On navigation to a view that needs fresh data (e.g. open Activities → invalidate `activities*` and related).  
  - Optional: on a “Refresh” button or after “Submit all” drafts.
- **Pros:** Smallest change set; avoids N requests per view; easy to reason about (“server-backed, invalidate on write/nav”).  
- **Cons:** Still in-memory; must remember to invalidate everywhere a write or external change can affect the key.

**Implementation steps:**

1. In DataManager, rename or repurpose `cache` to `_lastFetch` and treat it as “last server fetch” only.
2. Remove any read path that uses `localStorage` (or local backup) as source of truth for accounts/activities/users; all those reads go through `getItemAsync` (or entities API) when `_lastFetch` is missing or invalidated.
3. After every successful `setItemAsync` / `setItemAsyncWithDraft` (and after draft submit success), call `invalidateCache(key)` for the key (and related keys, e.g. activity shard manifest).
4. At the start of `loadActivities`, `loadAccounts`, `loadConfigurationPanel`, etc., call `invalidateCache` for the keys that view needs, or pass a “forceRefresh” flag that skips `_lastFetch` and refetches.

---

### Approach B – No cache at all (always fetch)

- **Idea:** Remove DataManager cache entirely. Every `getAccounts()`, `getActivities()`, `getUsers()` (when used for entity data) calls `getItemAsync` / entities API.
- **Invalidate:** Not needed; no cache.
- **Pros:** Simplest mental model; always fresh.  
- **Cons:** More requests; need to avoid duplicate concurrent requests (e.g. two components calling `getActivities()` at once). Can add a small request-dedup layer (e.g. in-flight promise per key) to avoid thundering herd.

**Implementation steps:**

1. In DataManager, stop populating and reading `this.cache` for accounts, activities, users, and any key that is “entity” data.
2. Ensure every read path for those keys goes through `getItemAsync` (or entities API). Optionally add a `getItemAsyncDedup(key)` that reuses an in-flight promise for the same key.
3. In remoteStorage, ensure `getItem` (when it proxies to server) does not merge with local backup for these keys; or gate local backup so it is only used for “offline draft” recovery, never for normal reads.

---

### Approach C – Phased by key

- **Idea:** Apply “server-only + last-fetch” first to **high-impact keys only**: `activities*`, `accounts`, `users`. Leave other keys (e.g. `industryUseCases`, `regions`, `globalSalesReps`) as-is or with a later phase.
- **Pros:** Limits blast radius; can ship and validate before touching config/roster.  
- **Cons:** Two modes for a while; need to document which keys are “server-only” and which still use cache/backup.

**Implementation steps:**

1. Define a list of “entity” keys: e.g. `accounts`, `activities`, `activities:*`, `internalActivities`, `users`.
2. For those keys only, implement Approach A or B. For all other keys, keep current behavior until a later phase.
3. In remoteStorage, for entity keys do not use local backup in the read path (or use it only for offline draft recovery).

---

## 2. Reconcile (§8.1)

**Goal:** With server-only fetch, reconcile should not “merge server + local backup” as source of truth. It should become “refresh from server” or “push drafts and resolve conflicts into drafts”.

### Approach A – Reconcile = refetch only (recommended)

- **Idea:** “Reconcile” no longer merges server and local backup. It only:  
  (1) Refetch from server the keys the app cares about (e.g. activities, accounts, users), and  
  (2) Update the DataManager last-fetch (or trigger a refresh so UI refetches).  
  Optionally: before refetch, “push” any pending drafts (submit to server); if a push fails with 409, leave that item in Drafts.
- **Local backup:** Do not read from `__pams_backup__` in the normal read path. Keep writing last-good to backup only for “offline draft” or disaster recovery; never merge backup into the data shown in the UI.
- **Implementation:**  
  - In remoteStorage, change reconcile so it does not call `getLocalBackup` and merge. It only triggers refetch (e.g. emit event “reconcile-refresh” and listeners call `invalidateCache` + refetch, or call a new `DataManager.refreshFromServer(keys)`).  
  - Optionally: add a “Submit all drafts” step at the start of reconcile; then refetch.

### Approach B – Reconcile = push drafts, then refetch

- Same as A, but explicitly: first try to submit all drafts; for each 409 or failure, leave in Drafts. Then refetch from server and update UI.
- Ensures “conflicts” end up as drafts and user can fix and retry from Drafts page.

---

## 3. FB8 – Async callers (§8.1)

**Goal:** All callers that need accounts, activities, or users use the async path (getItemAsync or entities API), not sync getItem or cache-only.

### Approach – Audit and migrate callers

1. **List call sites**  
   Grep for: `DataManager.getAccounts`, `DataManager.getActivities`, `DataManager.getAllActivities`, `DataManager.getUsers`, `DataManager.getIndustries`, `DataManager.getRegions`, and any `getItem`/cache read for entity keys.  
   Ensure every call site either:  
   - Already `await`s an async method (e.g. `getItemAsync` under the hood), or  
   - Is updated to `await DataManager.getAccounts()` etc., and the DataManager method itself uses `getItemAsync` (or entities API) when cache is invalid or absent.

2. **DataManager methods**  
   For `getAccounts`, `getActivities`, `getUsers`, `getIndustries`, `getRegions`, etc.:  
   - Implementation must use `getItemAsync` (or entities API) when returning data (either always, or when last-fetch is invalid).  
   - Remove or narrow sync fallbacks that read from `localStorage` or local backup for entity data.

3. **UI entry points**  
   Ensure `loadActivities`, `loadAccounts`, `loadConfigurationPanel`, reports, analytics, etc., all `await` the DataManager async methods and do not rely on sync cache.  
   (You already fixed activity filters to await; same pattern everywhere.)

4. **Optional: entities API for analytics**  
   For the analytics view (and any place that only reads activities for read-only display), consider switching to `GET /api/entities/activities?month=YYYY-MM` instead of getItemAsync for the whole activities blob. Reduces payload and avoids repeated large reads when 20–30 users are on analytics.

---

## 4. Phase 3 cutover – Cookie auth (§8.2)

**Goal:** Client uses `POST /api/auth/login` and session cookie; roster from `GET /api/users`. No storage `users` or client-set `X-Admin-User` as the primary auth path.

### Preconditions

- Migrate users to DB: run `server/scripts/migrate-users-to-db.js` (or equivalent); verify user count and that admins can log in.
- Server already has: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/users`, session store, and session cookie set on login.

### Pros and cons: Cookie-first vs Cookie-only

| | Cookie-first with header fallback (4A) | Cookie-only (4B) |
|--|----------------------------------------|------------------|
| **Pros** | Existing clients (X-Admin-User / API key) keep working; gradual rollout; no big-bang cutover. | Simpler auth model; single code path; no header/API-key handling. |
| **Cons** | Two code paths (cookie + header); more surface to test and maintain. | All clients must send cookie; no fallback for scripts or legacy clients until they are updated. |

**Recommendation:** Use 4A first; after all clients use cookie auth, optionally remove header fallback (4B) in a later release.

---

### Approach A – Cookie-first with header fallback (recommended)

- **Server**  
  - Add **session middleware**: reads session cookie, resolves to user, sets `req.user` and (for existing storage/entity logic) `req.headers['x-admin-user'] = req.user.username`.  
  - Protect `/api/storage` and `/api/entities` with this middleware: if cookie present and valid → allow and set X-Admin-User; if no cookie but valid `X-Admin-User` or API key in header → allow (fallback).  
  - So existing header-based or API-key callers still work during rollout.

- **Client**  
  - **Login:** On submit, `POST /api/auth/login` with `credentials: 'include'`, body `{ username, password }`. On 200, store returned user in memory (e.g. `Auth.currentUser`); do not store password. Redirect or load app.  
  - **All API calls:** Use `credentials: 'include'` for every `fetch()` to `/api/storage`, `/api/entities`, `/api/auth`, and admin routes. Cookie is then sent automatically.  
  - **Roster:** Replace “load users from storage” with `GET /api/users` (with `credentials: 'include'`). Cache result in memory or last-fetch per view; no storage `users` key for auth.  
  - **Logout:** Call `POST /api/auth/logout` with `credentials: 'include'`; clear in-memory user; redirect to login.

- **Feature flag (optional):** e.g. `window.__USE_COOKIE_AUTH__ = true` or server env `FORCE_COOKIE_AUTH=true`. When true, login form uses only POST /api/auth/login and roster uses only GET /api/users; when false, keep current header/storage behavior for a staged rollout.

### Approach B – Cookie-only (no fallback)

- Same as A but remove header/API-key fallback for storage and entities. All clients must use cookie. Use after all users are on a client that sends cookies (e.g. after a release and a short transition period).

---

## 5. Suggested order of work

| Step | Area | Approach (suggestion) | Notes |
|------|------|------------------------|--------|
| 1 | **Phase 3 cutover** | Cookie-first with header fallback (4A) | Unblocks “server-only” mentally; roster from API; auth is clear. |
| 2 | **Server-only / no cache** | Last-fetch with invalidate (1A) or Phased (1C) | Reduces stale data and aligns with §3. |
| 3 | **Reconcile** | Refetch only (2A) | Stops merging backup into UI; optional “push drafts then refetch”. |
| 4 | **FB8 async callers** | Audit and migrate (3) | Ensures every caller awaits and uses getItemAsync/entities. |
| 5 | **Local backup** | Gate or remove from read path | In remoteStorage, do not use backup for entity keys in normal reads; optional for offline draft only. |

If you want minimal risk, do **1 → 3 → 4 → 2 → 5**: get auth and roster right first, then simplify reconcile and async, then introduce last-fetch and finally narrow local backup.

---

## 6. References

- **PAMS_MASTER.md** – §3 (direction), §4 (phases), §8 (not yet done), §10 (code review suggestions).
- **MIGRATION_CLEANUP_PLAN.md** – Migration flow when you run it (separate from stabilization).
- **remoteStorage.js** – `saveLocalBackup`, `getLocalBackup`, reconcile logic, `getItem`/`setItem` proxy.
- **data.js** – DataManager cache, `getAccounts`, `getActivities`, `getUsers`, `invalidateCache`.
