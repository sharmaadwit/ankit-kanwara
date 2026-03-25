# Application load and performance

What affects “Preparing workspace” / first-view load, and what was optimized.

---

## What was causing slowness

1. **Multiple round-trips on load**  
   On login or when opening the app with an existing session, the UI needed:
   - `internalActivities`, `accounts`, `users`, and `activities` from the server.  
   Previously: one batch (3 keys) + a separate request for `activities`, then the first view called `getAllActivities()` which triggered more fetches because cache was invalidated and not filled from the batch.

2. **Reconcile not awaited**  
   After login, reconcile (refetch entity data) was started with `setTimeout(..., 0)` and the app immediately switched to the first view. The view then tried to load data before reconcile finished, causing duplicate requests and a slower first paint.

3. **No reconcile on initial load with cookie session**  
   When the app loaded with an existing cookie session (bootstrap returned a user), we went straight to the first view without running reconcile. The first view then did 3–4 storage GETs (activities, internalActivities, accounts, users) with no prior warm-up.

---

## Optimizations in place

1. **Single batch including activities**  
   Reconcile now fetches all four keys in one request: `internalActivities`, `accounts`, `activities`, `users` (batch supports up to 20 keys). One network round-trip instead of two.

2. **DataManager cache filled from batch**  
   After the batch response, `DataManager.setCacheFromBatch(items)` is called so `cache.accounts`, `cache.activities`, `cache.internalActivities`, and `cache.users` are set from the same response. The first view then uses this cache and does not issue extra GETs.

3. **Reconcile awaited before showing the main view**  
   In `handleSuccessfulLogin()` we now `await window.__REMOTE_STORAGE_RECONCILE__()` before switching view. After login, the first screen loads from cache.

4. **Reconcile on init when session exists**  
   When the app loads and bootstrap already has a user (cookie session), we run and await reconcile before calling `switchView()`. So “open app with existing session” also gets one batch and a warm cache before the first view renders.

5. **Server-side**  
   - Storage reads use a short in-memory cache (`STORAGE_READ_CACHE_TTL_MS`, default 3s) to avoid repeated DB hits for the same key.  
   - Config (bootstrap/config) is cached 30s in `appConfig` service.  
   - Batch GET uses a single DB query: `WHERE key = ANY($1::text[])`.

---

## Optional tuning

- **STORAGE_READ_CACHE_TTL_MS** (env): increase to 5000 for 5s cache if you want fewer repeated reads within a short time (e.g. quick tab switches).
- **Console timing**: `[PAMS init] loadBootstrap: Xms`, `[PAMS init] reconcile: Xms`, and `[PAMS init] total (prepare workspace): Xms` help see where time is spent.
- **Server logs**: `bootstrap` and `bootstrap_failed` log duration for the bootstrap endpoint.

---

## What still affects load time

- **Network**: Latency to the server and size of the batch response (activities blob can be large).
- **DB**: Cold or slow Postgres can make the single batch query slower.
- **Decompression**: Large compressed storage values are decompressed synchronously on read; for very large blobs this can add a few tens of ms on the server.
