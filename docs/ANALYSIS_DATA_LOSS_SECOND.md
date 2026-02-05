# Second analysis: data loss and win/loss impact

This document is a second pass over storage, logs, and code paths to find anything that could cause data loss (including win/loss).

---

## Terminology: “accounts” vs user accounts

- **accounts** (storage key `accounts`) = **Customer/company accounts** in the app—the form data: accounts with projects, win/loss, industries, etc. This is business data, not login identity. When we say “30+ accounts per person,” we mean 30+ **customer accounts** (companies/opportunities) that a user might create or manage in a month.
- **User accounts** = System users who log in (stored separately, e.g. admin/users). Not the same as the `accounts` key.

---

## 1. What we already fixed or added

| Item | Status |
|------|--------|
| 404 on activities → client throws, no overwrite with empty | Done (remoteStorage throws when serverJson null for activities) |
| Drafts for activities + internalActivities + **accounts** (win/loss) | Done (storageKey in draft, resubmit to correct key) |
| Server: archive before overwrite, pending on 409 | Done (storage_history, pending_storage_saves) |
| Duplicate checks on add + merge dedupe | Done |
| Rate limiting on storage and admin | Done (express-rate-limit) |
| Log 404 on GET key | Done (logger.warn('storage_get_404', { key })) |

---

## 2. Root cause that can still hurt: 404 on GET for `accounts`

**Risk:** Win/loss data lives in the `accounts` key (customer/company accounts, not user accounts). When the client saves accounts (e.g. after a win/loss update), it does:

1. `getItem('accounts')` → GET /api/storage/accounts  
2. If **404**, the client gets `null` and treats it as “no server data”  
3. It merges **client payload with `[]`** and PUTs the result  
4. So one **transient 404** (network, load, or key missing) can make the client overwrite server accounts with only what that tab had → **data loss**

**Why 404 can happen:**

- Key was never created (new deploy, no seed).  
- Key was deleted (someone or a script called DELETE on `accounts`).  
- Transient server/DB issue (connection, timeout) that returns 404.  
- Bug or misconfiguration in routing.

**Mitigations in place:**

- **Logging:** Every GET that returns 404 now logs `storage_get_404` with `key`. Check Railway (or your log sink) for `storage_get_404` and `key: 'accounts'` (or `activities`, `internalActivities`). If you see that, investigate immediately.  
- **Drafts:** If the **PUT** fails (e.g. 409 or network), the payload is stored in a draft; we now resubmit to the correct key (including `accounts`).  
- **No overwrite on activities when server empty:** For the `activities` key we throw and create a draft instead of merging with empty.
- **Accounts:** There is **no limit** “” **no limit** (no cap on account count) on how many customer accounts you can have. When the server returns 404 (no data) for accounts, we do not block the save—we merge with empty and save. Recovery comes from **local backup** on the next save (see section 4).
- **Local backup recovery:** When saving `accounts` (customer accounts) or `internalActivities`, if the server has **fewer items than our local backup** (e.g. server 17, backup 100), we merge server with backup first, then with our payload—so we **restore the difference from local cache** before saving. Safety: backup max age 72h, valid shape only.

**Recommendations:**

1. **Never DELETE `accounts` (or `activities` / `internalActivities`) in production** unless you are doing a controlled restore. Avoid scripts or admin actions that delete these keys.  
2. **Ensure keys exist after deploy:** On first deploy or after DB reset, either run a minimal seed that creates empty `accounts` / `activities` / `internalActivities`, or have a one-off script that PUTs `[]` for each so GET never 404s.  
3. **Monitor logs:** Alert or weekly review on `storage_get_404` with `key` in `['accounts','activities','internalActivities']`.

---

## 3. Other code paths checked

### 3.1 Storage write paths (server)

- **PUT /:key**  
  - Archives previous value to `storage_history`, then upserts.  
  - On 409 (conditional PUT), saves to `pending_storage_saves` and returns conflict to client.  
  - Logs `storage_write` with key and count for list keys.  
- **DELETE /:key** and **DELETE /**  
  - No archive; use only for intentional key or full clear.  
  - **Recommendation:** Do not call DELETE on `accounts` / `activities` / `internalActivities` in production.

### 3.2 Client write paths

- **accounts:** All go through `DataManager.saveAccounts()` → `localStorage.setItem('accounts', ...)`. With remote enabled, that goes through `remoteStorage.setItem('accounts', ...)`: merge with server (getItem), then PUT. If GET returns 404, merge is with `[]` (see above).  
- **activities:** Same idea; but for the main `activities` key we **do** throw if server returns null/empty, so we don’t overwrite.  
- **internalActivities:** Merge path; if GET 404 we merge with `[]` (same risk as accounts, but usually smaller dataset).  
- **Sharding:** Activities can be stored in shards (`activities:YYYY-MM`). Manifest and buckets are updated in one flow; old buckets are deleted. If a PUT of a shard or manifest fails after some have succeeded, we could have partial state. Drafts and retries reduce this; we don’t have a second bug identified here beyond “retry and use drafts”.

### 3.3 DB and size limits

- **storage.value** is PostgreSQL `TEXT` (effectively up to ~1GB). Not a practical limit for your payloads.  
- **API body:** `express.json({ limit: '20mb' })` – sufficient for large accounts/activities payloads.

### 3.4 Logs that exist today (useful for diagnosis)

- **storage_write** – key, conditional, count (for list keys), transactionId.  
- **storage_conflict** – key, message (409 conditional PUT).  
- **storage_get_404** – key (NEW), transactionId.  
- **storage_pending_failed** – message.  
- **storage_read_failed** / **storage_write_failed** – key, message.  
- **http_request** – method, path, statusCode, durationMs.

Search logs for: `storage_get_404`, `storage_conflict`, `storage_write_failed`, and `REMOTE_ACTIVITIES_LOAD_FAILED` (client-side, so only in browser console unless you log it).

---

## 4. What else can cause numbers to drop (e.g. 17 → 100 or high → low)?

Besides 404 on GET (covered above), other possible causes:

| Cause | What happens | Mitigation |
|-------|--------------|------------|
| **404 on GET** | Server returns no data; client merges with empty and PUTs; server had more, now overwritten. | No limit on accounts; we always allow save. **Local backup recovery** (below) restores the difference on the next save. |
| **Partial read** | Server or client only returns/reads part of data (bug, truncation). | Backup recovery: if server count &lt; backup count, we merge backup into server before save. |
| **Race / two tabs** | Two sessions; one overwrites the other with older data. | Conditional PUT (If-Match) causes 409; client merges and retries; server saves rejected payload to pending. |
| **DELETE on key** | Someone or a script deletes `accounts` (or activities). | Don’t DELETE in production; log 404; restore from backup or local cache. |
| **Sharding partial write** | For activities, only some shards written; manifest out of sync. | Retry and drafts; backup recovery not yet applied to activities shards (could add later). |
| **DB/storage failure** | Write fails mid-way; next read gets old or partial state. | Archive before overwrite; restore from storage_history or snapshot. |

### How "restore from local cache" works (plain English)

**There is no limit on how many customer accounts you can have.** We never block a save based on account count.

When you save customer accounts (or internal activities), the app does this:

1. **Read from server** – It asks the server: "What do you have for `accounts` right now?" The server might return 100 accounts, or 17, or nothing (404).

2. **Compare with this device's last-good backup** – On every *successful* save we store a copy in this browser under `__pams_backup__accounts`. So we have "what we last saved successfully."

3. **If the server has *fewer* items than that backup** (e.g. server says 17, backup has 100): We **merge server with backup** (by id): we take the 17 from the server and add back any items from the backup that aren't in those 17. Then we merge *that* with your current changes and save. So the "missing" data (the 83 in this example) is **restored from this device's cache** before we overwrite. The drop is recovered on the next save from this browser.

4. **Safety on that merge:** We only use the backup if it's **less than 72 hours old** (so we don't pull in very old or wrong-device data). We only use it if it **looks valid** (e.g. for accounts: array of objects with id). We only merge when **backup has more items than server**; we never replace newer server data with an older backup.

So: **if the same scenario happens again** (server drops from 100 to 17), the next time someone saves from a browser that had a good backup, the app will put the missing accounts back from local cache before saving. You can also do a full restore from server backups (pre-deploy, daily) if needed.

 So the “missing” data (the difference between server and last-good backup) is restored from this device’s cache before we overwrite. You still have server backups (pre-deploy, daily) for full restore if needed.

---

## 5. Customer accounts and backups (no limit on accounts)

- **Terminology:** "Accounts" = **customer/company accounts** (form data: companies, projects, win/loss). Not user accounts (login).
- **No 404 block:** When the server returns 404 (no data) for accounts, we do *not* block the save or create a draft. We merge with empty and save. Recovery comes from **local backup** on the next save (see section 4). **There is no limit on how many customer accounts a person can have.**
- **Local backup:** Every successful save updates the local backup. So after a good save, the next save will use “server vs backup” to recover if server dropped Backup merge safety: max age 72h, valid shape only.
- **Drafts:** If a save fails (409, network), the payload goes to My drafts with `storageKey: 'accounts'`; user can Submit again. Admin can use All drafts for server-side pending.

---

## 6. Optional hardening (not done yet)

- **Admin audit log:** Log every admin action (apply pending draft, user change, etc.) to a table or log stream for “who did what when”.

---

## 7. Checklist for “we need this up and running”

1. **Restore win/loss if needed:**  
   `npm run compare-backups` (or with two backup paths), then restore `accounts` from the better backup using `RESTORE_KEYS=accounts` and the restore script.

2. **Confirm rate limiting:**  
   Env: `RATE_LIMIT_STORAGE_MAX`, `RATE_LIMIT_ADMIN_MAX` (optional). Defaults 150 and 100 per 15 min per IP.

3. **Check logs for 404s:**  
   Search production logs for `storage_get_404` and `key: 'accounts'` (or activities/internalActivities). If any, investigate and ensure keys exist and are not deleted.

4. **Don’t delete critical keys in production:**  
   No DELETE on `accounts`, `activities`, or `internalActivities` unless you are doing a controlled restore.

5. **Drafts and backups:**  
   Users can use My drafts / All drafts to recover failed saves. Keep pre-deploy and daily backups and know how to restore (see DEPLOY_WITH_BACKUP and SECURITY_AND_DATA_LOSS).

---

## Summary

The only remaining **structural** risk identified for data loss (including win/loss) is **404 on GET for `accounts`** (or other merge keys), which causes the client to merge with empty and PUT, potentially overwriting good server data. We now **log every such 404** and recommend **never deleting** those keys and **ensuring they exist** after deploy. Rate limiting and existing drafts/backups/archiving are in place to keep the system stable and recoverable.
