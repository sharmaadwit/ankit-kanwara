# Migration Mode – What’s Done vs What’s Missing (Pre-Deploy)

Use this to confirm what works today and what to build before or after deploy. Reference: [MIGRATION_MODE_SPEC.md](MIGRATION_MODE_SPEC.md).

---

## ✅ Implemented

| Area | What’s done |
|------|----------------------|
| **Migration mode toggle** | Admin → Configuration → Feature Flags: “Migration mode” On/Off. Default Off. Stored in `feature_flags.migrationMode`. |
| **Migration mode UI when On** | Yellow banner; sidebar restricted to migration-relevant items; Log Activity button hidden. |
| **Sidebar in migration mode** | Accounts, Activities, Projects (Project Health), Configuration. (+ Migration dashboard, Suggestions, Wins added in code – see below.) |
| **Redirect when enabling** | If on Dashboard/Reports/Suggestions when mode is turned On, redirect to Accounts (or Migration dashboard). |
| **Existing account merge** | Admin can merge accounts (merge-account modal in app.js). Not migration-specific. |
| **Existing CSV import** | `bulkImport.js` + Import view for CSV. Generic import; no migration draft/confirmed store or “confirm” flow. |
| **Existing activity source** | `activity.source === 'migration'` and `isMigrated` in data.js for normalization; no UI to load migration CSV into app. |
| **Backup / snapshot** | Pre-deploy snapshot script (build number + full storage); deploy checklist. |
| **Migration data loading** | Migration dashboard: "Load migration CSV" (file upload). POST `/api/migration/import` parses CSV (date ≤ Jan 2026), writes draft; **industry ignored for internal activities**. |
| **Draft vs confirmed store** | `migration_draft_*` and `migration_confirmed_*` keys. "Confirm draft" copies draft → confirmed; "Confirm migration" promotes confirmed to main. |
| **Migration dashboard counts** | Real counts from GET `/api/migration/stats`; activity months in reverse order (confirm month first). |

---

## ❌ Not Implemented (Gaps)

### 1. Migration data loading

- **Spec:** Load migration CSV (`pams_migration_ready_v3.csv`); filter by activity date ≤ Jan 2026; parse MM-DD-YY as DD/MM/YY; vague account names → internal activities.
- **Current:** No in-app load of migration CSV. CSV lives in repo (`Project-PAT-LocalArchive/...`). No “Import migration CSV” or “Load migration data” that populates a **migration draft** store.
- **Needed:** Migration-specific import (file upload or path) that creates **draft** accounts/projects/activities (and internal activities for vague names), with date/industry/field mapping per spec.

### 2. Draft vs confirmed store

- **Spec:** All migration items in **draft** until confirmed; **separate store** for confirmed migrated data; do not merge into main until admin “Confirm migration”.
- **Current:** Single store (main app storage). No `migration_draft_*` or `migration_confirmed_*`; no “Confirm” action that moves from draft → confirmed.
- **Needed:** Separate storage keys or namespace for migration draft and confirmed; UI to “Confirm” account/activity/project and “Confirm migration” (promote to main).

### 3. Migration dashboard (counts and progress)

- **Spec:** Migration dashboard with **X / Y accounts pending for review**, **s / t projects pending**, **total vs confirmed activities** (e.g. “X of Y activities confirmed”), month-wise filter, confirm month first (reverse from Dec 2025).
- **Current:** No dedicated Migration dashboard view with these counts. (Placeholder view can be added – see “Add before deploy” below.)
- **Needed:** A view that reads from migration draft/confirmed (or main store if reusing it for now) and shows pending/confirmed counts; month filter; “confirm month first” flow.

### 4. Confirm and approve flows

- **Spec:** Presales can **confirm** activities in migration mode; admin **confirm all** at account level; **checkbox + merge** at project level; anomaly → **ask admin to confirm**.
- **Current:** No “Confirm” on account/activity/project for migration; no “Confirm all” at account level; no project-level merge in migration context; no anomaly confirmation prompt.
- **Needed:** “Confirm” button/state on rows; “Confirm all” for account; project merge (checkbox + merge); admin confirmation when system detects anomaly.

### 5. Wins section and correlation

- **Spec:** **Separate Wins** section; correlate with migration data; win/loss date; flag wins without account/activities; if no SFDC link use other keys.
- **Current:** Win/Loss view exists but is not migration-specific; no Wins correlation with migration CSV; no “unmapped wins” list or flagging.
- **Needed:** Migration Wins view or section; parse Wins file (e.g. 2025 Wins with SFDC xlsx); correlate by account/SFDC/date; flag unmapped; link to accounts/activities.

### 6. Suggestions (“Find best”) in migration

- **Spec:** **Suggestions** – find best account, best-fit industry, duplicate candidates.
- **Current:** “Suggestions and Bugs” view exists; no migration-specific “find best” or duplicate-candidate list driven by migration data.
- **Needed:** In migration mode, Suggestions tab/view that shows best-fit industry, duplicate account candidates, and “find best” account for a row (using existing mapping scripts’ output if available).

### 7. Admin-only and rep features

- **Spec:** Tag people/accounts to reps; admin **reassign** (e.g. left reps); **presales groupings** filter (e.g. Mridul + Purushottam); **remove unused accounts**; after migration **flag duplicates** and way to fix.
- **Current:** No rep tagging/reassign in migration context; no presales groupings; no “remove unused accounts”; duplicate detection exists in bulkImport but not post-migration duplicate flagging for accounts.
- **Needed:** Admin UI to assign/reassign accounts to reps; presales groupings config and filter; “Remove unused accounts” (with snapshot warning); “Check duplicates” and merge/fix flow after migration.

### 8. Industry best-guess and “convert to internal”

- **Spec:** **Best-guess industry** from canonical list; show **existing vs suggested** for account; option to **convert an activity to internal** if tagged incorrectly.
- **Current:** Account edit has industry; no “suggested” industry in UI; no “Convert to internal” on activity in migration context.
- **Needed:** When editing account in migration mode, show suggested industry (from mapping); on activity, “Convert to internal” action.

### 9. Month filter and “confirm month first”

- **Spec:** **Month-wise filter**; when migrating, **confirm month first** (reverse from Dec 2025).
- **Current:** No month filter in migration views; no “confirm month” step.
- **Needed:** Month selector in migration Activities (and dashboard); flow to “confirm” a month before next (e.g. Dec 2025 → Nov 2025).

---

## Add before deploy (minimal) — done

1. **Migration dashboard view** – Added. “Migration” in sidebar (only in migration mode) with placeholder: “Migration data not loaded yet” and “Accounts pending: —”, “Projects pending: —”, “Activities confirmed: — / —”.
2. **Suggestions and Wins in migration nav** – In migration mode, sidebar shows: **Migration**, **Accounts**, **Activities**, **Projects**, **Suggestions**, **Wins**, **Configuration**. Suggestions and Wins open existing views; access allowed in migration mode even if feature flags would hide them otherwise.
3. **Redirect to Migration dashboard** – When migration mode is turned On, land on Migration dashboard. Initial view when app loads in migration mode is Migration dashboard.

---

## Deploy recommendation

- **Safe to deploy:** Migration mode toggle; restricted nav; hidden Log Activity; Migration dashboard with **Load CSV**, real counts, **Confirm draft** and **Confirm migration (promote to main)**; draft/confirmed store. Client-side normalization (data.js) continues to apply to activities in main store (`source`, `monthOfActivity`, `isMigrated`). Migration mode defaults **Off**; no impact until enabled.
- **Remaining (post-deploy):** Wins correlation, rep reassign, presales groupings, per-item confirm/merge in UI, “Convert to internal”, suggested industry in account edit. See gaps 4–9 above.
