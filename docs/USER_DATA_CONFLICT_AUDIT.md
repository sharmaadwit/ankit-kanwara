# Audit: Where user data is saved and conflict handling

After deploying the fix (reconcile on login, account deep-merge, internal-activities safeguard), this doc lists **every storage key** that receives user-entered data and whether it can conflict when multiple users or tabs edit at once.

All user-entered data goes through `localStorage` (or the remote-storage proxy in production). The table below summarizes conflict handling.

## Summary table

| Storage key | What it holds | Conflict handling | Risk if two users edit at once |
|-------------|----------------|-------------------|---------------------------------|
| **accounts** | Accounts + nested **projects** | Deep merge by account id; projects merged by project id; 409 retry; backup recovery; reconcile on login | **Protected.** User B's save does not wipe User A's new project on same account. |
| **activities** | External (customer) activities; sharded by month | GET-before-PUT merge by id; dedupe by (account, project, date, type); 409 retry; reconcile on login | **Protected.** |
| **internalActivities** | Internal activities | Merge by id; 404 safeguard (throw if server empty and we have data); dedupe; 409 retry; reconcile on login | **Protected.** |
| **regions** | Sales regions list | Last-write-wins (no merge) | **Possible overwrite** if two admins edit regions at once. Lower risk (admin-only, infrequent). |
| **users** | App users (login/roles) | Last-write-wins | **Possible overwrite** if two admins edit users at once. |
| **industries** | Industry list | Last-write-wins | Same as above. |
| **globalSalesReps** | Sales rep roster | Last-write-wins | Same as above. |
| **presalesActivityTarget** | Target config | Last-write-wins | Same as above. |
| **industryUseCases**, **pendingIndustries**, **pendingUseCases**, **suggestionsAndBugs** | Config / feedback | Last-write-wins | Low traffic. |
| **analyticsAccessConfig**, **analyticsTablePresets** | Analytics settings | Last-write-wins | Per-user or admin; lower conflict chance. |

## Notes

- **Calls** are not a separate key: "Customer Calls" are activities with `type: 'customerCall'` in the same **activities** array, so they are covered by the activities merge/safeguards.
- **Projects** are nested inside **accounts**; they are protected by `mergeAccountsDeep` (server projects kept and merged by project id with client changes).
- **Reconcile on login** runs after login and merges server + local backup (newer wins) for `accounts`, `internalActivities`, and `activities`, then clears DataManager cache so the UI reflects the merged state.
- To reduce overwrite risk for **regions** / **users** / **industries** in the future, we could add merge-by-id in `remoteStorage.js` for those keys (same pattern as activities); until then, avoid having two admins edit the same config at the same time.

## Related

- **OTHER_CAUSES_DATA_LOSS.md** – Other causes of data loss (404, 409, network, multi-tab, etc.) and mitigations.
