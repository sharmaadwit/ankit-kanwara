# Account merge fix – And Whyte / January count

## What was going wrong

### 1. Merge not persisting (still showing two accounts)

- **Cause:** The merge step was saving **all activities** (external + internal) into the `activities` key via `getAllActivities()` and `saveActivities(activities)`.
- On the **hosted app**, `activities` is stored remotely (sharded by month). Writing the combined external+internal list could:
  - Trigger API errors (e.g. payload size, server validation), so the save failed and the merge never completed.
  - Corrupt data (internal activities written into the external activities store).
- There was **no error handling**: if `saveActivities` or the subsequent `deleteAccount` threw, the UI didn’t show a clear error, so it looked like “merge did nothing.”

### 2. Impact on January (and other) activity counts

- **Cause:** The same bug – saving `getAllActivities()` into `activities` – meant internal activities were written into the external activities store.
- After a merge, the app could effectively **double-count** internal activities (once from `activities` and once from `internalActivities`), or the server could reject/truncate the payload, leading to inconsistent counts (e.g. wrong “269 for Jan”).
- So the **merge could have contributed** to the incorrect January count; the earlier fix (using `monthOfActivity` for monthly grouping) addresses how months are computed; this fix stops the merge from corrupting the activity store.

## Fix applied

1. **Merge now updates and saves only external (customer) activities**
   - Uses `DataManager.getActivities()` instead of `DataManager.getAllActivities()`.
   - Only activities with `accountId === sourceAccountId` are reassigned to the target account; then `saveActivities(externalActivities)` is called.
   - Internal activities stay in the `internalActivities` key and are not written to `activities`.

2. **Error handling**
   - `saveActivities(externalActivities)` is wrapped in try/catch; on failure a notification is shown and the merge stops.
   - `DataManager.deleteAccount(sourceAccountId)` is wrapped in try/catch; on failure a notification explains that activities were moved and suggests refreshing and trying the merge again.

3. **Success message**
   - The success notification now includes how many activities were moved (e.g. “3 activities moved”) when applicable.

## What you should do

1. **Retry the merge for And Whyte**
   - After deploying this fix, run the merge again (source → target).
   - If the save fails, you’ll see a clear error; check the browser console for details and any network/API errors.

2. **If merge still doesn’t persist**
   - Check the browser console (F12 → Console) and Network tab when you click Merge.
   - Look for failed requests to `/api/storage` or similar and note the status code and response.
   - Share that (and any console errors) so we can fix server-side or payload issues.

3. **January count**
   - The earlier change (using `monthOfActivity` for monthly grouping) should correct the January count.
   - This merge fix prevents future merges from corrupting the activity store and affecting counts.
