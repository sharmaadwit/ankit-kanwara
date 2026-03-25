# alhamra.ae + Siddharth + SOW – Investigation

## What you reported
- Account **alhamra.ae**
- **Siddharth.sign** (Siddharth) had added **SOW** activities to it
- Those activities no longer show

## Similar-sounding accounts (migrated data)

In the latest snapshot there are **three** similar accounts:

| Account name | Activities in snapshot | Types | Users |
|--------------|------------------------|-------|-------|
| **alhamra.ae** | 4 | all customerCall | nikhil.sharma@knowlarity.com |
| **Al Hamra** | 6 | all customerCall | gargi.upadhyay@gupshup.io |
| **Al Hamra Real Estate Development** | 2 | all customerCall | gargi.upadhyay@gupshup.io |

So the similar-sounding accounts **are** there in migrated data, but **none** of them have any SOW or any activities by Siddharth in any snapshot we have. If the SOW was in the **original migration source** (e.g. CSV/Excel before import), it may have been dropped during import (e.g. account name mismatch, or SOW type mapped to a different account). Worth checking the original migration file for rows with “Al Hamra” / “alhamra” and SOW and Siddharth.

## What was checked

### All local backups/snapshots
- **Earliest:** `backup-before-pre-jan-2026-cleanup.json`, `storage-snapshot-2026-01-21T0935.json`
- **Mid:** `storage-snapshot-2026-02-14.json` through `storage-snapshot-2026-02-26.json`, `pre-deploy-*`, `merged-for-restore-*`
- **Latest:** `storage-snapshot-2026-03-02*.json`, `storage-snapshot-latest.json`

### Findings

| Snapshot | Total activities | alhamra.ae activities | alhamra.ae SOW | alhamra.ae + Siddharth |
|----------|------------------|------------------------|----------------|-------------------------|
| All checked | varies | 2–4 | **0** | **0** |

- In **every** snapshot, **alhamra.ae** appears only with:
  - **Type:** `customerCall` (no SOW)
  - **User:** nikhil.sharma@knowlarity.com (no Siddharth)
  - **Ids:** e.g. `4a7a804b-d25a-403c-813d-4be0f8675a99`, `c9a794d4-bd77-45c5-9c3f-7d301b010b34`
- **Siddharth** (siddharth.singh@gupshup.io) **does** have SOW activities in the same snapshots (e.g. Daikin, Autostrad, Nestle, Vincitore realty, etc.) but **none** for account alhamra.ae.
- So **alhamra.ae + SOW + Siddharth** does **not** appear in any snapshot we have.

## Where the chain could be broken

1. **Never persisted**  
   SOW for alhamra.ae was added in the UI but save failed (network, 409, etc.) and was never successfully written to the server. If it only lived in drafts or one client, it would not be in server snapshots.

2. **Overwritten before merge**  
   Before server-side merge on PUT for `activities` was in place, a partial PUT (e.g. from another device/session with fewer activities) could overwrite the full list. If Siddharth’s SOW was in that full list, it would have been dropped in that overwrite. We would only see it in a snapshot **older** than that overwrite; if no snapshot was taken in that window, we’d have no copy.

3. **Different account / user**  
   Possibility of a different account name (e.g. typo, “Al Hamra” vs “alhamra.ae”) or a different user than siddharth.singh@gupshup.io. Our search was for accountName containing “alhamra” and userName/assignedUserEmail containing “siddharth”.

## Next step: search the live DB

The server has:
- **storage_history** – previous value of `activities` each time it was overwritten (before merge).
- **pending_storage_saves** – payloads that hit 409 (conflict) and were stored as “Lost & Found”.

Run the script below against the **production** DB (with `DATABASE_URL` or equivalent). It will:
- Scan **storage_history** for key `activities` and report any archived value that contains both "alhamra" and "sow" and "siddharth".
- Scan **pending_storage_saves** for `activities` and do the same.

If either contains a matching payload, that confirms the data existed at some point and was either overwritten (history) or conflicted (pending). You can then restore that payload or merge those activities back into current storage.

## How to run the DB search

From project root, with DB env set:

```bash
node server/scripts/search-storage-for-alhamra-sow.js
```

See `server/scripts/search-storage-for-alhamra-sow.js` for what it does and how to interpret the output.
