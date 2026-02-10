# Async storage upgrade – summary

This doc summarizes the **async storage + cookie auth** upgrade (FB8 + Phase 3 direction).

## What was done

1. **Backup**  
   Git tag `v1.0.1-pre-async` created for rollback.

2. **DataManager**
   - **Async get:** `getAccounts()`, `getActivities()`, `getUsers()`, `getInternalActivities()`, `getAllActivities()`, `getAccountById()`, `getUserById()`, `getActivitiesByProject()`, `getAvailableActivityMonths()`, `getAvailableActivityYears()`, `getRegionUsage()` now return Promises. They use `getItemAsync` when available and fall back to sync `localStorage.getItem` for initial load.
   - **Async save:** `saveAccounts()`, `saveActivities()`, `saveUsers()`, `saveInternalActivities()` use `setItemAsyncWithDraft` for conflict handling (draft on 409), with sync fallback.
   - **Async CRUD:** `addAccount`, `updateAccount`, `deleteAccount`, `addActivity`, `updateActivity`, `deleteActivity`, `addInternalActivity`, `updateInternalActivity`, `deleteInternalActivity`, `addUser`, `updateUser`, `deleteUser`, `addProject`, `updateProject`, `mergePendingIndustryInto`, `mergePendingUseCaseInto`, `removeRegion`, `pruneUnusedRegions`, `ensureDefaultUsers()`, `initialize()` are async where they touch entity storage.

3. **Reconcile**
   - `reconcileOnLogin()` and `reconcileOnLoginImpl()` are async and use `getItemAsync` / `setItemAsync` so reconcile no longer blocks.

4. **Drafts**
   - Single-draft submit and “Submit all” use `setItemAsyncWithDraft` (and async DataManager where applicable). Retries go through async path.

5. **Cookie auth**
   - `remoteStorage.js`: fetch uses `credentials: 'include'`; sync XHR uses `xhr.withCredentials = true` so session cookies are sent.

6. **App.js view loaders and helpers**
   - Dashboard, activities, accounts, win/loss, project health, SFDC compliance, reports, stats, and related helpers are async and use `await` for DataManager/reconcile where needed.
   - `loadCardDashboard`, `loadCardActivitiesView`, `loadCardAccountsView`, `loadCardWinLossView`, `loadCardProjectHealthView`, `loadCardSfdcComplianceView`, `loadCardReportsView`, `loadWinLossView`, `loadSfdcComplianceView`, `loadProjectHealthView`, `updateStats`, `loadRecentActivities`, `getWinLossProjectsDataset`, `getProjectOwnerMap`, `computeProjectHealthData`, `computeSfdcComplianceData`, `calculateMissingSfdcStats`, `getAccountActivityCount`, `buildAccountProjectsMarkup`, `editAccount`, `populateWinLossMonthFilter` (and any similar entry points) are async and await DataManager/reconcile as needed.

7. **DOMContentLoaded**
   - `DataManager.ensureDefaultUsers()` is awaited before `App.init()`.

## Remaining call sites (optional follow-up)

Some UI handlers or legacy paths may still call DataManager without `await` (e.g. `promptProjectSfdcLink`, merge/delete account modals, analytics/resolve filters, classic accounts view). If a given path throws or shows wrong data, make the handler `async` and `await` the DataManager call(s). Search for `DataManager.get` / `DataManager.save` / `DataManager.add` / `DataManager.update` / `DataManager.delete` and add `await` where the result is used.

## Testing

- Load app → dashboard, activities, accounts, win/loss, project health, SFDC, reports.
- Log activity (external + internal); check Drafts on conflict or failure.
- Edit/merge/delete account; edit/delete activity.
- Trigger reconcile (login with remote storage); confirm “Syncing…” and no hang.
- Cookie auth: after Phase 3 cutover, confirm login sets cookie and API calls send it (`credentials: 'include'`).

## Rollback

To roll back to pre-async state:

```bash
git checkout v1.0.1-pre-async
# or deploy that commit from your CI
```

Then redeploy from that commit (e.g. push to `main` or trigger Railway from that ref).
