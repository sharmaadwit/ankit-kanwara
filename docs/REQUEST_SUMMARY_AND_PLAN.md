# Request Summary, Your Answers & Plans

## 1. Full Summary of Requests

### A. POC Admin / Sandbox – Data cutoff & auto-close
- **Cutoff:** No data up to Dec 2025; only new requests from Jan 2026 in Sandbox Access.
- **Auto-close:** Pre–Jan 2026 POC/sandbox requests → **auto-closed** (excluded from active lists).
- **Cutoff rule (your answer):** Use **submission date** from the migrated data and add **7 days** to get the **end date**. Use this end date for determining what is auto-closed / in scope.
- **Migration / review:** Exclude auto-closed from migration data review. Still allow attaching to same project/account in migration mode; no POC Admin–level info required.

### B. POC Sandbox – Rename, move, layout
- **Rename:** “POC Sandbox” / “POC Admin” → **“Sandbox Access”**.
- **Move:** Sandbox Access lives **only under Configuration** (not under System Admin). **Confirmed.**
- **Layout:** Fix cramped layout for Sandbox Access view.

### C. System Admin & Configuration – Reorg
- **Project Health:** Move into **Configuration** (placement: **Configuration → Analytics → Project Health**; “Analytics” grouping used for consistency). *Your call was “both work” – we’re going with Analytics subsection.*
- **Reports in Configuration:** **Remove** (main screen already has Reports).

### D. Dashboard – Last activity & remove “This week”
- **Remove:** The **“This week”** box.
- **Add:** **Last activity submission** – who submitted last and when (to build pressure). Uses **submission timestamp**, **all activities** (internal and external). **Confirmed.**

### E. Notifications – Plan only
- **Who sees it:** **Admins** to start. **Plan only** for now; no build yet.
- **Goal:** Admins know there is a Custom Sandbox request (e.g. bell/badge) when logging in. Email/Slack later.

### F. Bug: Inside sales → India West (NEW)
- **Issue:** People you added to **Inside sales** are appearing or being moved to **India West**. Need to stop fighting this bug.
- **Actions:**  
  1. **Investigate** where region is set/overwritten (sales rep assignment, default region, migration, etc.).  
  2. **Add logging** where region is assigned or updated (e.g. “region set to X for user/rep Y”) so we can trace changes.  
  3. **Test with logs** (e.g. assign to Inside sales, reload, check logs).  
  4. **Review current logs on Railway** to see if existing logs already show region changes; if not, ensure new logging is deployed and visible there.

---

## 2. Your Answers (Locked)

| Question | Your answer |
|----------|-------------|
| Cutoff date / rule | Use **submission date** from migrated data **+ 7 days** = **end date** (for auto-close / scope). |
| Sandbox Access only under Configuration? | **Yes.** |
| Project Health placement | Both OK; we use **Configuration → Analytics → Project Health**. |
| Last activity definition | **Submission timestamp**, **all activities** (internal + external). |
| Notifications – who, build? | **Admins** only to start; **plan only** for now. |

---

## 3. New Plans

### Plan 1: Bug fix – Inside sales → India West
1. **Trace code** that sets or updates region (sales reps, users, accounts, defaults).
2. **Add targeted logs** when region is set/updated (e.g. log: source, previous value, new value, context).
3. **Reproduce** “add to Inside sales then see India West” and confirm logs show the change.
4. **Check Railway logs** for existing region-related entries; if missing, deploy new logging and verify in Railway.
5. **Fix** the logic (e.g. stop overwriting with default “India West”, or fix migration/load order).

### Plan 2: Sandbox / POC cutoff & auto-close
1. **Define “submission date”** in your data model (field name, source in migrated data).
2. **Compute end date** = submission date + 7 days per item.
3. **Apply cutoff:** e.g. treat items with end date before 2026-01-01 as auto-closed (or your chosen cutoff date).
4. **Filter Sandbox Access** so only non–auto-closed (e.g. from Jan 2026) show in the active list.
5. **Migration / review:** Exclude auto-closed from migration data review; still allow attaching to project/account in migration mode without POC Admin–level info.

### Plan 3: UI reorg – Sandbox Access, Configuration, Project Health
1. **Rename** POC Sandbox / POC Admin → **Sandbox Access** everywhere (nav, titles, routes).
2. **Move** Sandbox Access from System Admin to **Configuration** only; remove from System Admin.
3. **Add** “Analytics” subsection under Configuration; move **Project Health** there.
4. **Remove** Reports from Configuration.
5. **Improve** Sandbox Access layout (spacing, structure) so it doesn’t feel cramped.

### Plan 4: Dashboard – Last activity, remove “This week”
1. **Remove** the “This week” box from the dashboard.
2. **Add** “Last activity submission” box: **who** submitted and **when** (use submission timestamp, all activities).
3. **Backend/data:** Ensure “submission” timestamp is stored and available for the latest activity (internal + external).

### Plan 5: Notifications (plan only – no build yet)
- **Audience:** Admins only to start.
- **In-app:** Bell/badge so admins see “Custom Sandbox request pending” when logging in (placement TBD: header bell vs sidebar badge vs both).
- **Later:** Notification settings, email and/or Slack.
- **No implementation** until you approve this plan and we’re ready to build.

---

## 4. Notifications Feature – Plan (Admins only, no build)

### 4.1 Scope (Phase 1)
- **Who:** Admins only.
- **What:** “Pending Custom Sandbox requests” (and optionally other actionable items later).
- **Where:** TBD – header bell and/or sidebar badge on Admin/Configuration.
- **How:** Badge count (or dot) from same source of truth as Sandbox Access pending list; optional dropdown with link to Sandbox Access.

### 4.2 Investigation / design choices (when we build)
- Where region is set (to fix Inside sales → India West) so we don’t conflict with notification logic.
- Bell in header vs badge on nav vs both.
- Number vs dot; “mark as read” or not.

### 4.3 Future phases (unchanged)
- Phase 2: Notification settings, email or Slack.
- Phase 3: More event types (e.g. other approvals) reusing same badge/dropdown.

---

## 5. Resolved (from your answers)

1. **Cutoff:** Use **submission date + 7 days** = end date. Active = end date ≥ 2026-01-01; auto-closed = end date &lt; 2026-01-01.
2. **Closed / Archive:** Show closed with a **“Migrated data”** tag; add this tag **all around** where relevant.
3. **Inside sales:** It is a **region**; sales members are within this region. Bug fix: preserve existing region when syncing sales reps (no overwrite with default list).

## 6. Backup check

- **Daily backup:** Workflow `.github/workflows/daily-backup.yml` runs at 02:00 UTC (`cron: '0 2 * * *'`) and on `workflow_dispatch`. To verify it ran automatically: GitHub repo → **Actions** → “Daily storage backup” → check runs for the expected dates. If secrets `REMOTE_STORAGE_BASE` and `REMOTE_STORAGE_USER` are set, the job should run and commit `backups/storage-snapshot-latest.json`.
