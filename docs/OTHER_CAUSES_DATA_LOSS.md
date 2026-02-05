# Other causes of periodic data loss (beyond User A/B overwrite)

We fixed **User B saving the same account wiping User A’s changes** with account deep-merge and **save logging** for retrieval. Here are other things that can still cause data to be saved, show in reports, then disappear or get out of sync.

---

## 1. **404 on GET (server says “no data”)**

- **What:** Client does GET for a key (e.g. `accounts`, `activities`). Server returns 404 (key missing, DB glitch, or transient error). Client treats it as “no server data” and merges with empty, then PUTs.
- **Effect:** One request’s payload can overwrite real data. You may see data in the UI/report until the next load or another user’s save, then it’s gone.
- **Mitigations:** We log `storage_get_404` with `key` on the server. We don’t overwrite activities when server returns empty (we throw and use drafts). For accounts/internal we have local-backup recovery when server has fewer items than backup. **Action:** Monitor logs for `storage_get_404`; ensure keys exist after deploy (seed or one-off PUT of `[]`).

---

## 2. **409 conflict without retry**

- **What:** Client PUTs with `If-Match`. Server returns 409 (someone else updated). If the client doesn’t merge and retry, that save is “lost” from the server (we store it in `pending_storage_saves` so admins can apply it).
- **Effect:** User sees “saved” or report increments, but the server never applied that version. Next load or another user’s save shows the other version.
- **Mitigations:** We retry on 409 with merge for activities/accounts/internal. Rejected payloads go to pending drafts (admin can apply). **Action:** Use “All drafts” in admin to apply any pending saves if users report missing updates.

---

## 3. **Network / tab closed before save completes**

- **What:** User hits Save; request fails (network drop, timeout) or user closes the tab before the response. Server may never receive the PUT, or the client never gets 200.
- **Effect:** Data looks saved in the UI until refresh; report might show it if it was already in cache; after refresh or another device, it’s gone.
- **Mitigations:** Drafts: failed saves stay in “My drafts” so the user can resubmit. **Action:** Remind users to check “My drafts” after flaky network and not to close the tab until they see success.

---

## 4. **Multiple tabs / devices**

- **What:** Same user (or different users) has two tabs or two devices. Tab A loads data, Tab B saves. Tab A still has old data; if Tab A saves later without refetching, it can overwrite Tab B’s save (we mitigate this with GET-before-PUT and, for accounts, deep-merge).
- **Effect:** Intermittent “my change disappeared” after someone else (or same user elsewhere) saved.
- **Mitigations:** We always GET before PUT and merge; for accounts we deep-merge so B’s save doesn’t wipe A’s projects. **Action:** Encourage refresh before editing if they use multiple tabs/devices.

---

## 5. **Browser storage cleared**

- **What:** User or IT clears site data / localStorage. Local backup and drafts are lost. If the server had a bad state (e.g. 404 had been used and overwrote data), there’s no local recovery.
- **Effect:** Data that was only in local backup or drafts is gone; server state is whatever was last successfully PUT.
- **Mitigations:** We can’t prevent clearing. We log saves (server + in-app activity log) so you can see who saved what and when for recovery. **Action:** Rely on server-side backups and activity logs for restore; avoid clearing storage in production.

---

## 6. **Report “incremented” from cache, server different**

- **What:** UI shows a report built from in-memory/cached data (e.g. “2 wins”). Server actually has 1 win (e.g. one save failed or was overwritten). User doesn’t refresh, so they think both are saved.
- **Effect:** Report shows a number that doesn’t match server; after refresh or on another device, the number drops.
- **Mitigations:** We now use `monthOfWin` for win/loss month so dashboard and reports align with the same logic. Save logging (server + in-app) helps correlate “who saved when” with what’s on the server. **Action:** If users report “report showed X then dropped,” check activity logs and server logs for that time window and key.

---

**Summary:** Besides the User A/B account overwrite we fixed, periodic “saved then lost” can still come from: 404 on GET, 409 without successful retry, network/tab closed before save, multiple tabs/devices, browser storage cleared, and reports reflecting cache while server state differed. We’ve added merge/retry, drafts, local-backup recovery, and save logging to reduce and trace these.
