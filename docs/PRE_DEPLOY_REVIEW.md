# Pre-deploy review: local vs remote

## Summary

- **Remote (origin/main):** Has our Accounts/filters/Sales Leaders commit + a snapshot commit. Does **not** have the 3 bug fixes in `pams-app/js/activities.js`.
- **Local:** Has the same commits plus **uncommitted** changes in `pams-app/js/activities.js` with **3 bug fixes** (Issue #1, #4, #9).

**Gap:** The 3 fixes exist only locally. Deploying from remote would ship without them. Commit and push `activities.js` so the next deploy includes the fixes.

---

## The 3 fixes in `activities.js` (local only)

### 1. Issue #1 – Hide Use Case / Products for Customer Call & POC

- **What:** For activity types **Customer Call** and **POC**, the "Primary Use Case" and "Products Interested" project fields are redundant, so they are hidden.
- **How:** Added `id="projectUseCasesGroup"` and `id="projectProductsGroup"` to the two form groups. In `showActivityFields()`, when `type === 'customerCall' || type === 'poc'`, set both groups to `display: none`; otherwise `display: block`.
- **Review:** Logic is correct. The two groups are siblings of `#activityFields`, so updating `activityFields.innerHTML` does not remove them.

### 2. Issue #4 – Focus "Other" text when shown

- **What:** When the user selects "Other" for a dropdown, the "Other (please specify)" text field is shown and should receive focus.
- **How:** After `otherText.style.display = 'block'` and `otherText.required = true`, added `otherText.focus()`.
- **Review:** Improves UX; no downside.

### 3. Issue #9 – Persist Products and Use Cases on project when saving activity

- **What:** When saving an activity, the selected "Products Interested" and "Primary Use Case" values were not written back to the project, so the project could be out of sync.
- **How:** In the block that updates an existing project (before `DataManager.saveAccounts`), added:
  - If `selectedProjectProducts` has items, set `project.productsInterested` (with "Other: …" from `projectProductsOtherText`).
  - If `selectedUseCases` has items, set `project.useCases` (with "Other: …" from `useCaseOtherText`).
- **Review:** Correct. Optional: for Customer Call/POC we hide the fields but still have `selectedProjectProducts`/`selectedUseCases` in memory; we still write them back. That keeps the project in sync if the user had previously selected and then switched type; no bug.

---

## Other local vs remote differences

| Item | Local | Remote | Action |
|------|--------|--------|--------|
| `pams-app/js/activities.js` | Has 3 fixes above | No fixes | **Commit and push** |
| `docs/AUTH_AND_LEADERS_SPEC.md` | Present (commit 32b26d5) | Not on remote | Push (branch has diverged; pull then push) |
| `backups/storage-snapshot-latest.json` | Older | Newer (snapshot on deploy) | Ignore; backup only |

---

## Recommended steps before deploy

1. **Commit** the 3 bug fixes in `activities.js`.
2. **Pull** from origin (merge or rebase) to get the latest snapshot commit if needed.
3. **Push** so remote has both the Auth spec and the activities fixes.
4. Deploy from remote (or let Railway auto-deploy from `main`).

After that, online and local will be aligned and the next deploy will include the 3 fixes.
