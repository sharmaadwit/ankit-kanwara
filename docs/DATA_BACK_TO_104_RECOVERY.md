# Data went back to 104 – what happened and how to recover

## What likely happened

Your docs mention **"168 → 104"**-style drops. When "data went back to 104" it usually means:

1. **Server returned 404** for a key (`internalActivities`, or less often `accounts`) – key missing, transient error, or DB glitch.
2. **A client had 104 items in memory** (stale cache from an earlier load).
3. That client **saved** (e.g. added/edited an internal activity or account). The app did GET → 404 → treated as "no server data" → merged server `[]` with client’s 104 → PUT 104.
4. So **one save overwrote the real list** with the smaller cached list (104). Anything that existed only on the server (e.g. 129 − 104 = 25 items) was lost.

**Activities (external)** are already protected: we **throw** when the server returns empty, so we never overwrite with a partial list. **internalActivities** did not have that check until now.

---

## What we changed (this session)

- **internalActivities:** When the server returns **empty** (404 or no data) and the **client payload has items**, we now **throw** and do not PUT. The user sees an error and the data goes to **My drafts** so they can refresh and resubmit. That prevents a stale client (e.g. 104 items) from overwriting a larger server list (e.g. 129).

---

## How to recover now (restore from backup)

1. **Pick a backup that has the higher count**  
   Use a snapshot from **before** the drop (e.g. a backup that shows 129 internal or the total you expect). Good candidates:
   - `backups/storage-snapshot-latest.json` (if it was taken when data was correct)
   - `backups/merged-recovery.json` (if you have it)
   - Any `backups/pre-deploy-*.json` or `backups/cleanup-pre-jan-2026-*.json` from when counts were right

2. **Restore that snapshot to production**  
   From the project root, with env set:

   ```bash
   set REMOTE_STORAGE_BASE=https://your-app.up.railway.app/api/storage
   set REMOTE_STORAGE_USER=admin
   set STORAGE_API_KEY=your-api-key
   node server/scripts/restore-storage-from-snapshot.js path/to/backup.json
   ```

   Use the path to the backup file you chose (e.g. `backups/storage-snapshot-latest.json`). The script PUTs each key from the backup to the server, overwriting current storage. **So pick a backup you trust.**

3. **Check counts in the backup (optional)**  
   In Node or a script:

   ```js
   const d = require('./backups/your-backup.json').data || require('./backups/your-backup.json');
   console.log('internalActivities', (d.internalActivities || []).length);
   console.log('activities:2026-01', (d['activities:2026-01'] || []).length);
   console.log('accounts', (d.accounts || []).length);
   ```

   Restore the file that has the numbers you expect (e.g. 129 internal, not 104).

4. **After restore**  
   Tell users to **refresh** the app. If anyone had failed saves, they can use **My drafts** to resubmit after refresh.

---

## Correlating "404 unknown" with who was active

If your **inside logs** show **`storage_get_404`** with **username: "unknown"**, that request had **no `X-Admin-User` header** (old client or request from something other than the app). To see who else was logged in in the last hour (and correlate by time):

```bash
# List logins in last hour excluding you (replace with your username)
npm run logins-last-hour -- ankit.kanwara
# or
node server/scripts/logins-last-hour.js ankit.kanwara
```

That prints who logged in, how many times, last seen, and IP. Match the **time** of the 404 in your logs with who was active then – that user may be on an old build that doesn’t send the header, or the 404 came from a different source (e.g. script, another tab). **As of this change, every `storage_get_404` log line now includes `username`** (or `"unknown"` when the header is missing).

---

## Going forward

- **Server:** Check Railway (or your log sink) for **`storage_get_404`** and `key: 'internalActivities'` (or `accounts`). If you see that, the key was missing or DB had a hiccup – fix the key (e.g. PUT `[]` once) and investigate.
- **Client:** The new safeguard stops a partial list from overwriting when the server says "no data." Users get an error and a draft instead of silent data loss.
- **Backups:** Keep taking daily or pre-deploy snapshots so you always have a "last good" file to restore from.
