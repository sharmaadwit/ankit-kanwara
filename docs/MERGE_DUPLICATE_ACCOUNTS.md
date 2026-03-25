# Merge duplicate accounts

Use the script to find accounts with the **same normalized name** (lowercase, trimmed, spaces collapsed) and merge them into one. Activities and projects are moved to the account you keep.

---

## 1. Dry run (creates the plan file)

From the **Project PAT** directory (where `package.json` is):

```bash
npm run merge-duplicates
```

Or:

```bash
node server/scripts/merge-duplicate-accounts.js
```

This writes **`merge-plan.json`** in the project root with one group per duplicate set. Each group has:

- `normalizedName` – the shared name used for grouping
- `keepAccountId` – the account that will be kept (default: first by id)
- `mergeAccountIds` – the account ids that will be merged into the kept one

---

## 2. Edit the plan (optional)

Open **`merge-plan.json`** and, if you want to keep a different account for a group, change **`keepAccountId`** to that account’s id. You can also remove a group from the `groups` array to skip merging that set.

Example:

```json
{
  "groups": [
    {
      "normalizedName": "acme corp",
      "keepAccountId": "acc-123",
      "mergeAccountIds": ["acc-456", "acc-789"]
    }
  ]
}
```

To keep `acc-456` instead, set `"keepAccountId": "acc-456"` and put the others in `mergeAccountIds`: `["acc-123", "acc-789"]`.

---

## 3. Apply the merge

After saving `merge-plan.json`:

```bash
npm run merge-duplicates-apply
```

Or:

```bash
node server/scripts/merge-duplicate-accounts.js --apply
```

The script updates the `accounts` and `activities` storage values: merged accounts are removed, their projects and activities are attached to the kept account.

---

## Plan file location

Default path: **`merge-plan.json`** in the project root (same folder as `package.json`).

Override with env:

```bash
MERGE_PLAN_PATH=/path/to/my-plan.json node server/scripts/merge-duplicate-accounts.js --apply
```

---

## If you get "Connection timeout"

The database may not be reachable from your machine (e.g. Railway is only reachable from its own network). You can:

1. **Generate the plan from a backup (no DB needed)**  
   Export a storage snapshot (e.g. `npm run backup` with `REMOTE_STORAGE_BASE` set to your app URL), then run:
   ```bash
   node server/scripts/merge-duplicate-accounts.js --from-file=backups/storage-snapshot-YYYY-MM-DDTHHMMSS.json
   ```
   That writes `merge-plan.json`. Edit it, then run `--apply` from somewhere the DB **is** reachable (e.g. Railway one-off, or a machine with the right `DATABASE_URL`).

2. **Increase timeout**  
   If the DB is reachable but slow, set a longer timeout before running:
   ```bash
   set PGPOOL_CONNECTION_TIMEOUT_MS=20000
   npm run merge-duplicates
   ```

## Requirements

- **Dry run:** Either a reachable database (same env as the app: `DATABASE_URL` or `PG*` in `.env`), or a snapshot file with `--from-file`.
- **Apply:** Database must be reachable; use `.env` in the project root.
- Backup: run a storage backup before `--apply` so you can restore if needed.
