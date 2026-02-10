# Cookie / session mismatch – how we proceed

When the **session cookie** doesn’t match what the server expects (expired, invalid, or from another device), storage API calls can return **401 Unauthorized**. This doc describes how the app handles that and how to proceed.

## Current behaviour

1. **Storage auth today**  
   `/api/storage` is protected by `requireStorageAuth`, which accepts:
   - **x-admin-user** header (set after login from `currentUser.username`), or  
   - **x-api-key** / query `apiKey` if `STORAGE_API_KEY` is set.  
   The server does **not** yet require a valid session cookie for storage. Cookies are still sent (`credentials: 'include'`).

2. **When the server returns 401** (e.g. after Phase 3 when storage is gated by session cookie):
   - **Draft retention:** Any in-flight save that used `setItemAsyncWithDraft` (e.g. activity save, win/loss save, accounts save) has already created or updated a **draft** with the full payload. The 401 event is fired after a short delay so that the draft is updated with *"Session expired. Please sign in again."* before the session is cleared. Drafts are stored in **localStorage** (`__pams_drafts__`) and survive session clear.
   - **In-progress forms:** Before clearing the session, the app runs **capturePendingSubmissionsToDrafts()**: if the **activity modal** or **win/loss modal** is open and has meaningful data, that form state is saved as a draft (e.g. *"Activity (in progress)"* or *"Win/Loss update"*). So the user’s current form is not lost.
   - **Async path** (`performRequestAsync`): the client fires a `remotestorage:unauthorized` event (after the above draft updates) and throws. Local backup (`__pams_backup__*`) is left as-is.
   - **App** listens for `remotestorage:unauthorized`, runs capture above, then clears the session, shows the login screen, and notifies: *"Session expired or invalid. Your work was saved to Drafts. Sign in and submit from Drafts."*
   - User signs in again; on success, reconcile runs. They can open **Drafts**, use **Submit again** (or **Edit** for in-progress activity forms) to retry. So we maximise data retention: submissions and in-progress forms are in drafts and can be retried once the session is valid.

3. **Conflict (409)** is separate:  
   Optimistic lock (If-Match) failed: someone else (or another tab) saved. The client either merges (e.g. sync path) or keeps a draft and shows *"Conflict – someone else saved. Submit again to merge."* No cookie mismatch; just data conflict.

## Procedure summary

| Situation | What happens | What to do |
|----------|----------------|------------|
| **401 from storage** (cookie invalid/expired) | Event `remotestorage:unauthorized` → session cleared → login screen shown; local backup kept | User signs in again; reconcile runs and merges server + local; continue as normal. |
| **409 from storage** (version conflict) | Merge when possible (sync path), or draft + message (async). Local backup updated after merge. | User can "Submit again" to push merged state, or resolve in UI. |
| **Reconcile fails** (e.g. 401 during login merge) | Reconcile catches per-key; logs warning; DataManager cache cleared. No crash. | User is already on the app; next save or refresh will retry. If 401, the next storage call will trigger the 401 flow above. |

## Implementation details

- **Event:** `remotestorage:unauthorized` is fired from `remoteStorage.js` when any async storage request gets `res.status === 401`.
- **Handler (app.js):** On that event, call `Auth.clearSession()`, `Auth.showLoginScreen()`, and show a short notification so the user knows why they see the login screen.
- **Local backup:** Keys under `__pams_backup__*` are **not** cleared on 401. So after re-login, reconcile can merge server state with this device’s last-good state (newer wins).

## Optional: force re-login from UI

If you add a "Session invalid – sign in again" message with a button, that button can call the same flow: `Auth.clearSession()`, `Auth.showLoginScreen()`. No need to clear local backup.
