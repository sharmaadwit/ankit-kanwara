# January / February activities loss – cause and fix

## What was happening

External activities are stored **by month** in sharded keys: `activities:2026-01`, `activities:2026-02`, etc. A manifest (`__shard_manifest:activities__`) lists which month buckets exist.

On **save**, the previous logic:

1. Built month buckets from the **current in-memory list** only.
2. Wrote those buckets to storage.
3. **Deleted any bucket** that existed on the server but was **not** in that list (“stale” buckets).

If the in-memory list was ever **incomplete** (e.g. one bucket failed to load, manifest was missing months, or cache was partial), a save would **delete** the missing months from storage. So January and February could disappear after any save that ran with a partial list.

## Fix (deployed)

In **`pams-app/js/remoteStorage.js`** – `shardActivities()`:

- We **no longer delete** existing month buckets.
- We only **write** buckets for months that are in the current payload.
- The manifest is set to the **union** of existing buckets and the buckets we just wrote.

So a partial list can no longer wipe other months. Existing month buckets stay until you overwrite them with new data for that month.

## Recovery if data was already lost

If January or February activities were already removed from the server:

1. **From a backup**  
   If you have a storage snapshot from before the loss (e.g. `backups/storage-snapshot-*.json` or a pre-deploy snapshot), restore the `activities`-related data using your restore script (e.g. `restore-storage-from-snapshot.js` or the process in `docs/DEPLOY_WITH_BACKUP.md`). For sharded storage, that means restoring the `__shard_manifest:activities__` and all `activities:YYYY-MM` keys that existed in the backup.

2. **From Drafts**  
   If any lost activities were saved as drafts after a failed write, they may still appear under Drafts; submit them again after the fix is deployed.

3. **Prevent recurrence**  
   Deploy the fix so future saves never delete month buckets. Regular backups remain recommended.
