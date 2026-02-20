# Migration Mode – Specification, Questions & Field Mapping

This doc defines the **Migration mode** experience (toggle = must), what the admin sees when it’s On, and how migration sheet fields map to PAMS. Use it to validate behaviour before build.

---

## 1. Migration mode toggle (must-have)

- **Where:** Admin-only (e.g. Configuration or System Admin). “Migration mode: On / Off.” Default **Off**.
- **When On:** Only the migration experience is visible (simplified nav and views below). Normal dashboard, reports, and full nav are hidden.
- **When Off:** Normal app; no migration UI.
- **Data scope:** Migration mode **ignores all data post Jan 2026**. Only rows with activity date ≤ 2026-01-31 are included. All data up to December (and through Jan 2026) is in the source document; post–Jan 2026 is excluded from migration import and views.

---

## 2. What the admin sees when Migration mode is On

**Left navigation (only these):**

- **Accounts** – Account-level data: list (e.g. alphabetical), duplicates section, merge/update, International account, best-fit Industry, tag to rep. **Confirm all** at account level. Option to **remove unused account names** so only imported accounts remain before/after migration.
- **Projects** – Project-level data: **all projects view per account** with **option to merge** (select by checkbox, merge at project level). Map/attach to accounts, set use cases, win/loss; project-level rep when account is International.
- **Activities** – Activity-level data: map/attach to accounts and projects; **presales can confirm** activities in migration mode (not only admin). Option to **convert an activity to internal** if tagged incorrectly. Month-wise filter; when migrating, **confirm month first** (months in reverse from Dec 2025).
- **Suggestions** – “Find best” suggestions: e.g. best-fit account, best-fit industry, duplicate candidates.
- **Wins** – **Separate section** for Wins. All wins must be marked; correlate with migration data (Wins may appear in migration data too; if no SFDC link we find/correlate by other keys). Flag wins without account/activities.
- **Merge / update** – Merge duplicates (project-level: checkbox + merge; account-level: confirm all). Bulk update (e.g. assign account to rep, set industry).

**Dashboard (Migration mode):**

- **Migration dashboard** showing:
  - **X / Y accounts pending for review** (and **s / t projects pending for review**).
  - Total activities vs **confirmed** activities (e.g. “X of Y activities confirmed”).
  - Month-wise filter; confirm month first when migrating (reverse from Dec 2025).
- **Anomaly handling:** If the system finds an anomaly (e.g. duplicate, vague account, missing link), **ask admin to confirm** before applying.

**Internal activities and vague accounts:**

- **Internal activities:** Mark them **complete** and **clean** (no account/project required). Provide an option to **convert an activity to internal** if it was tagged incorrectly (e.g. external with wrong/vague account).
- **Vague account names:** Do **not** create external activities for them; **add those rows as internal activities** (same as Category = internal). No account/project needed.

**People and accounts ↔ reps:**

- **Tag people and accounts to reps.** Admin can assign accounts (and activities) to a sales rep. Important for **left reps** (e.g. Ankit Chaddha): their accounts/activities should be reassignable.
- **Conflicts to validate:** Only show **conflicts that need validation** for those reps (e.g. “Ankit Chaddha” – show list of accounts/activities still tagged to them for reassignment). Admin can bulk reassign to another rep.
- Admin can **review** “who is assigned to whom” and **reassign** when a presales rep has left.
- **Filterable data (admin option):** Admin can define **presales groupings** so data is filterable by combined view – e.g. “Mridul” combined with “Purushottam Singh” (show data for both presales users as one filter). Groupings are by **presales user** (Presales Username / assigned user). Admin-level option to create and select these groupings.

---

## 3. Field mapping: Migration sheet → PAMS

Source: **pams_migration_ready_v3.csv** (columns below). PAMS stores **accounts** (with nested **projects**), **activities** (external), **internalActivities** (internal).

**CSV columns (from header):**

| # | Column name | Sample / notes |
|---|-------------|----------------|
| 0 | Activity Category | `external` or `internal` |
| 1 | Date | e.g. 31-05-2025 |
| 2 | Presales Username | e.g. mariana.ribeiro@gupshup.io |
| 3 | Activity Type | e.g. Customer Calls, POC, SOW |
| 4 | Account Name | Company or vague (webinar, person name) |
| 5 | Project Name | e.g. Marketing, "Marketing, Commerce" |
| 6 | Sales Rep Name | e.g. Fernando Bueno |
| 7 | Industry | e.g. Education, BFSI |
| 8 | SFDC Link | URL or OPP id |
| 9 | Products | e.g. Ai Agents \| Journey Builder |
| 10 | Channels | e.g. WhatsApp |
| 11 | Call Type | e.g. Discovery, Scoping / SOW |
| 12 | Description | Long text (can have commas/newlines) |
| 13 | Time Spent Type | (optional) |
| 14 | Time Spent Value | (optional) |
| 15 | Internal Activity Name | (if internal) |
| 16 | Internal Topic | (if internal) |
| 17 | Internal Description | (if internal) |

**Mapping to PAMS:**

- **Activity date (date of call):**
  - **Source format:** In the migration sheet the “date of call” is stored as **MM-DD-YY**. **Reverse to DD/MM/YY** for display and for deriving the actual calendar date (treat as DD/MM/YY when parsing).
  - **Use month of activity** as the primary dimension: `activity.monthOfActivity` (YYYY-MM). For `activity.date`: if the row has a value in the “date of call” field, use it (parsed as above); **if “date of call” is empty or missing, default to the last date of that month** (e.g. 2025-01-31 for January 2025). Do **not** use submission timestamp for activity date or month.

- **Activity Category** (column 0) and **vague Account Name:**  
  - `internal` → create/update in **internalActivities** (mark complete, clean).  
  - `external` with **vague account name** (webinar, person name, blank, etc.) → **add as internal activities** (do not create external activity or account).  
  - `external` with valid account name → create/update in **activities**.  
  - In the Activities UI: option to **convert an activity to internal** if it was tagged incorrectly.

- **Account Name** (4) → used to **match or create** PAMS account. Resolve to `account.id` for storage. New accounts get `account.name`, `account.industry` (from column 7, mapped to canonical), `account.salesRep` / `salesRepEmail` / `salesRepRegion` from Sales Rep Name (6) or leave for later tagging.

- **Project Name** (5) → used to **match or create** project under account. Stored as `project.name` and/or parsed into `project.useCases[]` (e.g. “Marketing, Commerce” → use cases Marketing, Commerce).  
  **Uncertainty:** Project Name is sometimes a use case list, sometimes a single project name; need rule (e.g. one project per row with that name, or split by comma for use cases).

- **Presales Username** (2) → map to PAMS user (by email); store as `activity.assignedUserEmail` or `activity.userId`.  
  **Uncertainty:** If user not in PAMS, create placeholder user or leave unassigned and flag for “tag to rep”.

- **Activity Type** (3) → map to PAMS activity type (e.g. Customer Calls → `customerCall`, POC → `poc`). Store as `activity.type`.  
  **Uncertainty:** Exact enum in PAMS (customerCall, poc, sow, demo, …); need mapping table from CSV type string to PAMS type.

- **Sales Rep Name** (6) → resolve via `globalSalesReps` to get email/region; store on **account** (or **project** if International account) as `salesRep`, `salesRepEmail`, `salesRepRegion`.  
  **Uncertainty:** Rep not in list → leave blank or add to “unmapped rep” for admin to assign.

- **Industry** (7) → **best-guess** map to canonical PAMS industry list. In the UI show **existing** (current value) and **suggested** (system guess) as options so the account trigger / review can accept or change. Store as `account.industry`.

- **SFDC Link** (8) → store **only at project level** (`project.sfdcLink`). **No account-level SFDC links.** One link per row → attach to the project created/matched for that row. Use SFDC (and migration data) to correlate Wins when Wins file has no SFDC link.

- **Products** (9) → optional; PAMS may have `project.productsInterested` or similar – confirm field.  
  **Uncertainty:** Where to store (project vs activity).

- **Channels** (10), **Call Type** (11) → optional; store on activity if PAMS has these fields.  
  **Uncertainty:** Schema may not have them; could add or skip.

- **Description** (12) → store as `activity.summary` (external) or internal activity description field.  
  **Uncertainty:** Truncation if length limit in DB/UI.

- **Time Spent Type / Value** (13–14) → store if PAMS has time-spent fields.  
  **Uncertainty:** May not exist in schema.

- **Internal Activity Name / Topic / Description** (15–17) → for rows with Category = internal; map to **internalActivities** schema (name, topic, description).  
  **Uncertainty:** Internal activity schema in PAMS (exact field names).

- **Industry for internal activities:** **Ignore.** Do not set or suggest industry for internal activities (previous form had challenges with industry on internal). Only external accounts get industry (best-guess from column 7).

---

## 4. Date rule (no submission timestamp for activity date)

- **Use only the logged activity date** from the migration sheet (column **Date** / “date of call”) for:
  - `activity.date` and `activity.monthOfActivity`
  - Filtering by month, dashboard “activities this month”, and any reporting by activity date.
- **Source:** Date of call in sheet is **MM-DD-YY**; reverse/parse as **DD/MM/YY** for correct day/month. If “date of call” is empty, **default to the last day of the activity month** (e.g. 2025-01-31 for Jan 2025).
- **Do not use** submission timestamp or `createdAt` for “date of activity” or month placement.

---

## 5. Migrated data storage, backup, snapshot and deploy

- **Draft until confirmed:** All migration items (accounts, projects, activities) are created and held in **draft** state. They are **only saved** (to the migration-confirmed store) when the user/admin **confirms** them. No write to the main app or to confirmed migration store until confirmation.
- **Separate store for confirmed migrated data:** Confirmed data lives in a **separate duplicate of the database** (full copy), so there are no issues when transferring from that store into the main app. **Do not** merge into main data when Migration mode is turned off. When admin is ready, they explicitly **confirm migration** to promote the confirmed migration data into the main app.
- **Current backup (before migration/deploy):** Must include **full details and full database save**. This backup is a **different duplicate of the current database** (separate copy), so we don’t have issues when we transfer from that into the main app.
- **Snapshot is mandatory:** **Full application with all its data** – full application snapshot + full database. Take and name it before any deploy or migration promote.
- **Backup and deploy:** Backup all data (full DB duplicate), share the previous build name, then deploy.

- From the migration CSV (by row prefix): **external** 2923, **internal** 69. Rows with **vague account name** (even if Category = external) are **added as internal activities**; no external activity or account created for them. Internal activities are marked complete and cleaned; option in UI to **convert an activity to internal** if tagged incorrectly.

---

## 6. Post-migration: accounts and duplicates

- **Remove unused accounts (optional flow):** Provide a way to **remove unused account names** so that **only imported accounts** are brought in (e.g. “Start migration with clean accounts” or “Drop non-imported accounts” – admin confirms). Use with care; snapshot before use.
- **After migration complete:** When migration is completed (or when admin runs “Check duplicates”), **flag to admin about duplicates** (e.g. possible duplicate accounts) and **give them a way to fix** (merge or mark as not duplicate).

---

## 7. Wins correlation

- **Wins file** (e.g. 2025 Wins with SFDC xlsx) has a **win/loss date** column; use it for correlation and display. Read the file structure to align columns (Account, SFDC Id, Project, win/loss date, etc.).
- **Wins may appear in migration data too.** Correlate Wins from the Wins file with migration CSV. If a Win has **no SFDC link**, use other keys (account name, project, presales user, **win/loss date**) to find matching migration row(s) and link them.

---

## 8. Hosted application and mapping

- **Review the hosted application** for the data and mapping (you have access). Align migration field mapping and UI with what the hosted app actually stores and displays.

---

## 9. Resolved (answers)

1. **“Post Jan” cut-off:** **Post Jan 2026** – ignore all data after Jan 2026. All data up to December is in the document (through Dec 2025 / Jan 2026 as per source).
2. **Backup:** Current backup = **full details + full database save**; a **separate duplicate of the current database** so we don’t have issues when transferring into the main app.
3. **Rep groupings:** By **presales** user (Presales Username / assigned user).
4. **Confirm month first:** Process months **in reverse from Dec 2025** (Dec 2025, then Nov 2025, …).
5. **Draft stage:** **Yes** – all migration items in **draft** until confirmed; **only saved when confirmed**.
6. **Wins:** There is a **win/loss date** in the Wins file; read the file for column layout.
7. **Internal activity schema:** Use **exact PAMS schema** – see §9.1 below.

### 9.1 PAMS internal activity schema (exact)

Use this for mapping CSV columns 15–17 and for vague-account rows added as internal:

| PAMS field | Type | Notes |
|------------|------|--------|
| `id` | string | Generated on add. |
| `createdAt`, `updatedAt` | ISO string | Set on create/update. |
| `userId` | string | PAMS user id (from Presales Username). |
| `userName` | string | Username / email. |
| `date` | ISO date (YYYY-MM-DD) | Activity date; use month of activity, default last day of month if missing. |
| `type` | string | Internal activity type (e.g. from CSV or “Internal”). |
| `timeSpent` | string | e.g. `"2 hour(s)"` or `"1 day(s)"` from CSV Time Spent if present. |
| `activityName` | string | CSV “Internal Activity Name” or summary for vague-account. |
| `topic` | string | CSV “Internal Topic”. |
| `description` | string | CSV “Internal Description” or external Description for vague-account. |
| `isInternal` | boolean | `true`. |
| `details` | object | Optional: `pocEnvironmentName`, `assignedStatus` (for POC/internal workflows). |

Migration: CSV columns 15–17 → `activityName`, `topic`, `description`. Vague-account rows: use Account Name or Description as `activityName`/`description`; set `topic` if available; no account/project.

**Any other questions?** None at this time. If edge cases appear during build (e.g. Wins file row offset, exact CSV column index for win/loss date), resolve from the actual file or ask once.

---

## 10. Suggestions

1. **Migration mode layout:** Use a single “Migration” top-level view with sub-tabs or left nav: Accounts | Projects | Activities | Suggestions | Merge/Update | Dashboard. Hide normal sidebar (Dashboard, Activities, Accounts, Win/Loss, Reports, Admin except Migration toggle) when Migration mode is On.

2. **Confirm all at once:** Provide “Confirm all visible” or “Confirm selected” for activities that are already linked to account/project, so the “confirmed” count can grow quickly after mapping.

3. **Export progress:** Let admin export a simple report: total vs confirmed activities, list of unmapped wins, list of activities still tagged to left reps – for handoff or audit.

4. **Reassign by rep:** In Suggestions or a dedicated “Reassign” section, list reps (e.g. Ankit Chaddha); for each, list accounts and activities still assigned; admin selects target rep and bulk reassigns.

5. **Vague-account list:** A dedicated “Activities with vague account name” list (or filter in Activities) with one-click “Mark as internal” or “Assign to account X” to clean up misclassified rows.

6. **Wins without account/activities:** A dedicated “Unmapped wins” list (Red) with columns: Win identifier, Account (if any), Linked activities count; admin can attach account and/or activities from here.

7. **Backup before bulk actions:** Before “Merge all duplicates” or “Reassign all for rep X”, require or strongly suggest a backup (e.g. snapshot) so we can restore if needed.

---

## 11. Summary table: CSV column → PAMS (and uncertainties)

| CSV column | PAMS target | Notes / uncertainty |
|------------|-------------|----------------------|
| Activity Category / vague account | internalActivities vs activities | Internal + vague account name → internal. Option to convert activity to internal. |
| Date | activity.date, monthOfActivity | Source MM-DD-YY → parse as DD/MM/YY. If empty, default to last day of month. |
| Presales Username | activity.userId / assignedUserEmail | Map to PAMS user; else flag for tagging. |
| Activity Type | activity.type | Need CSV type → PAMS type enum mapping. |
| Account Name | account.name, account.id (resolve) | Match or create; duplicates/merge in Migration UI. |
| Project Name | project.name, project.useCases | One project per row or split use cases – confirm. |
| Sales Rep Name | account.salesRep (or project if International) | Resolve via globalSalesReps; else unmapped rep. |
| Industry | account.industry | Best guess from list; show existing vs suggested. |
| SFDC Link | project.sfdcLink only | No account-level SFDC. |
| Products | project.productsInterested? | Confirm field. |
| Channels, Call Type | activity? | Add or skip if not in schema. |
| Description | activity.summary (or internal description) | Truncate if needed. |
| Time Spent 13–14 | activity? | If schema has it. |
| Internal 15–17 | internalActivities | Map to activityName, topic, description per §9.1. |

---

## 12. Next step

Once the mapping in §11 is confirmed, implement in this order:

1. **Snapshot (mandatory)** – full application + all data before any deploy or migration promote.
2. **Migration mode toggle** – gate entire migration UI; ignore data post Jan 2026.
3. **Draft until confirmed**; separate DB duplicate for confirmed migrated data; do not merge into main until admin “Confirm migration”.
4. **Simplified nav** – Accounts, Projects, Activities, Suggestions, **Wins** (separate section), Merge/update, Dashboard.
5. **Dashboard** – X/Y accounts pending, s/t projects pending; month-wise filter; confirm month first when migrating.
6. **Activity date** – month of activity; date of call MM-DD-YY → DD/MM/YY; if missing, last day of month.
7. **Internal / vague** – internal rows + vague account names → internal activities; option to convert activity to internal.
8. **Industry** – best guess; show existing vs suggested.
9. **Wins** – correlate with migration data; flag no account/activities; if no SFDC link use other keys.
10. **Presales confirm** – presales can confirm activities in migration mode; anomaly → ask admin to confirm.
11. **Project merge** – checkbox + merge at project level; account-level confirm all; all projects view per account with merge.
12. **Backup + previous build name** then deploy; after migration complete flag duplicates and give way to fix.
13. **Filterable data** – admin option for **presales** groupings (e.g. Mridul + Purushottam combined); reverse from Dec 2025 for month order.
14. **Remove unused accounts** option; SFDC project-only, no account-level.
