# Production test checklist (post-deploy)

Run these after pushing the async + cookie/draft-retention update to production. Use two browsers (or one normal + one incognito) for multi-user tests.

---

## 1. Single user – happy path

- [ ] **Login** – Presales login (e.g. admin / your password) works; dashboard loads.
- [ ] **Analytics login** – Switch to Analytics tab, enter analytics password; analytics view loads.
- [ ] **Log activity** – Log one external and one internal activity; both appear in the list.
- [ ] **Edit account** – Accounts → Edit an account (name/industry/sales rep); save; change is visible.
- [ ] **Win/Loss** – Open a project, set status Won/Lost with SFDC link and MRR; save; status updates.
- [ ] **Reports** – Open Reports, switch Presales/Sales/Regional tabs; month navigation works; no blank charts.
- [ ] **Drafts** – If you have any drafts, open Drafts, click “Submit again” on one; it either saves or shows a clear error.

---

## 2. Session invalid (401) and drafts

- [ ] **Draft on 401** – *(Only if your server returns 401 for storage when not logged in)* Log in, start logging an activity (fill form), then in another tab or via devtools clear the session cookie and trigger a storage request (e.g. save). You should see “Session expired…” and the login screen; open Drafts and confirm an “Activity (in progress)” draft is there. Log in again, open Drafts → Edit that draft; form should restore; save and confirm it submits.
- [ ] **Win/Loss draft on 401** – Same idea: have Win/Loss modal filled, force 401 (e.g. clear cookie), then after re-login go to Drafts and “Submit again” on the Win/Loss draft; update should apply.

---

## 3. Two users at once (same data)

Use **two browsers** (or one normal + one incognito), different users if you have two accounts.

- [ ] **Both view dashboard** – User A and User B open the app and dashboard; both see data without errors.
- [ ] **Both open same view** – User A and User B both open Activities (or Accounts). No console errors; lists load.
- [ ] **A logs activity, B refreshes** – User A logs a new activity and saves. User B refreshes the Activities list; the new activity appears (or appears after a short delay if you have sync).
- [ ] **B logs activity, A sees it** – User B logs another activity. User A refreshes or reopens Activities; B’s activity appears.
- [ ] **Conflict (same entity edited)** – User A opens Edit Account on “Acme”. User B also opens Edit Account on “Acme” and saves a change (e.g. industry). User A then saves a different change (e.g. name). One save may get a conflict; you should see a message like “Conflict – someone else saved. Submit again to merge.” and a draft; “Submit again” from Drafts should merge/retry without losing data.

---

## 4. Two users – Win/Loss and reports

- [ ] **A updates Win/Loss** – User A sets a project to Won with SFDC + MRR and saves. User B opens Win/Loss view and refreshes; the project shows as Won.
- [ ] **B updates different project** – User B sets another project to Lost and saves. User A’s Win/Loss view (after refresh) shows both updates.
- [ ] **Reports for both** – User A and User B open Reports and switch months/tabs; no errors, charts load. If both have access to the same data, numbers should be consistent.

---

## 5. Quick smoke (after any deploy)

- [ ] Login → Dashboard loads.
- [ ] Open Activities, Accounts, Win/Loss, Reports; no blank screens or console errors.
- [ ] Log one activity and update one Win/Loss; both save.
- [ ] Logout and login again; data still there.

---

## If something fails

- Check browser console (F12) for errors.
- Check Network tab for failed requests (401, 409, 500).
- For 409: use Drafts → “Submit again” to retry; confirm draft payload looks correct.
- For 401: confirm session/cookie; re-login and check Drafts for captured forms/submissions.
