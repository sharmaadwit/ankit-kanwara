# PAMS – Planned Work, Backlog & Thoughts

Single place for **what is next**, **backlog items**, and **open decisions**. Items are numbered by category. **Build 1–4 are deployed**; remaining backlog and new features are below.

---

## 1. Activities

| No. | ID  | Name | Description | Decision / note |
|-----|-----|------|-------------|-----------------|
| 1.1 | #1  | Completed-all-activities button + report | “I have completed all activities for \<Month\>”; track who; report. | **Deployed.** |
| 1.2 | #5  | Activity date default = last logged | Default activity date to last logged (project or user). | |
| 1.3 | FB2 | Activities refresh on date change | Refetch/re-render so activity moves to correct month after date change. | **Deployed.** |
| 1.4 | FB4 | Remember last activity date | Per user; default to last used date. | **Deployed.** |
| 1.5 | FB5 | Sort by logged + default “My activities” | Sort by logged date; default filter “My activities”. | **Sort by logged date;** default **“My activities”**. |
| 1.6 | FB1 | Enablement: optional with warning | When Enablement type and days/hours empty: allow save with warning. | **Optional** with warning when days/hours empty. |

---

## 2. Win/Loss & projects

| No. | ID  | Name | Description | Decision / note |
|-----|-----|------|-------------|-----------------|
| 2.1 | FB6 | Wins: default project when only one | When account has only one project, default win/loss to it. | Clarify: display vs auto-set on save, then implement. |
| 2.2 | #6  | Project names → use case + month | Naming guide/bulk; migration-only. | For migration run. |

---

## 3. Industries & use cases

| No. | ID  | Name | Description | Decision / note |
|-----|-----|------|-------------|-----------------|
| 3.1 | FB3 | Industry/use case merge UX | Merge: type merged name, pick base candidate, tweak, confirm. | **Type merged name**, pick one candidate as base, tweak, confirm. |

---

## 4. Backups & operations

| No. | ID  | Name | Description | Decision / note |
|-----|-----|------|-------------|-----------------|
| 4.1 | FB7 | 15-day snapshot retention | Dated backup files + latest; keep last 15. | **Deployed** (daily-backup.yml). |
| 4.2 | FB8 | Async callers | All callers use async DataManager APIs. | Largely done; verify in production. |

---

## 5. Auth & technical (stabilization)

| No. | Name | Description | Note |
|-----|------|-------------|------|
| 5.1 | Phase 3 cookie cutover | Set `FORCE_COOKIE_AUTH=true`, run user migration; client uses POST /api/auth/login + cookie. | Code deployed (cookie-first with header fallback). |
| 5.2 | Cookie-only (remove header fallback) | After all clients use cookie auth, remove X-Admin-User / API-key fallback. | Optional, after cutover. |
| 5.3 | Server-only fetch (optional) | Remove or narrow local backup for non-entity keys; optional “last fetch” TTL. | Entity keys already phased. |
| 5.4 | Reconcile (optional) | “Submit all drafts” then refetch. | Already refetch-only for entity keys. |
| 5.5 | Analytics at scale | For 20–30 concurrent viewers: prefer GET /api/entities/activities?month= or batched reads. | |

---

## 6. Migration

| No. | Name | Description | Note |
|-----|------|-------------|------|
| 6.1 | Migration cleanup plan | Migrated Data tab, Account/Project merge, work on copy, admin overwrite. | Full flow when running migration. |

---

## 7. Reports & communications (discussed / planned)

| No. | Name | Description | Note |
|-----|------|-------------|------|
| 7.1 | Reports enhancements | Presales reports improvements; analytics table presets; PDF export for reports. | Align with other agents’ reports work. |
| 7.2 | **Download mail for periodic sending** | Feature to generate and **download** an email (body/content) that can be sent periodically (e.g. monthly summary). User downloads the mail, then sends it manually or via their mail client on a schedule. | Discussed for periodic distribution. |
| 7.3 | Email notifications | Notifications (e.g. feature toggle, CSV failure, login anomaly) via Gmail OAuth; extend to optional report digests. | Server has `email.js` and `notifications.js`; env: GMAIL_*. |
| 7.4 | Export functionality | Export data (activities, accounts, reports) to CSV/Excel or PDF. | General export beyond “download mail”. |

---

## 8. Optional / nice-to-have

| No. | Name | Description | Note |
|-----|------|-------------|------|
| 8.1 | Win of the month UI | UI highlight for featured win. | |
| 8.2 | Completed-activities validation | Validate vs target when 1.1 is built. | Depends on 1.1. |
| 8.3 | File attachments | Attach files to activities or accounts. | |
| 8.4 | Calendar integration | Sync activities or deadlines to calendar. | |
| 8.5 | Advanced analytics | Deeper analytics and visualizations. | |

---

## 9. Execution order – Build 1 to 4 (deployed)

**Status:** Build 1–4 have been implemented and **deployed**. Deploy = push to `main`; Railway (or host) builds and deploys.

| Build | Item   | What was done | Status |
|-------|--------|----------------|--------|
| **1** | **4.1** (FB7) | 15-day backup retention: dated snapshots + keep last 15 in daily workflow. | **Deployed.** |
| **2** | **1.3** (FB2) | Activities refresh on date change: after save, invalidate cache and refetch so list/cards re-render; activity appears in correct month. | **Deployed.** |
| **3** | **1.1** (#1) | Completed-all-activities: button “I completed all (this month)” + report section (who completed for which month). | **Deployed.** |
| **4** | **1.4** (FB4) | Remember last activity date: per user in localStorage; default date input when opening form; update after save. | **Deployed.** |

---

## 10. Next backlog (suggested order)

After Build 1–4, continue with:

1. **2.1** (FB6) – Wins: default project when only one  
2. **1.2** (#5) – Activity date default = last logged (if different from 1.4)  
3. **1.5** (FB5) – Sort by logged + default “My activities”  
4. **1.6** (FB1) – Enablement optional with warning  
5. **3.1** (FB3) – Industry/use case merge UX  
6. **6.1** – Migration cleanup plan  
7. **7.1–7.4** – Reports & communications (reports enhancements, download mail for periodic sending, email notifications, export) as prioritised

---

## 11. Reference

- **Deployed:** See `docs/DEPLOYED.md`.
- **Build ID / rollback:** Git commit SHA; deploy from that commit to roll back.
- **Deploy method:** Push to `main` (or run GitHub Actions “Deploy” workflow with branch to merge into `main`).
