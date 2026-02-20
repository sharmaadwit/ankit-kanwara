# PAMS Migration Plan (Full Project)

Single reference for: industry/use case model upgrade, Migration mode, duplicate handling, mapping, and related gaps. Use with [REQUEST_SUMMARY_AND_PLAN.md](REQUEST_SUMMARY_AND_PLAN.md) and [CAI_CUBE_INDUSTRY_USECASE_MAPPING.md](../Presales%20Year%20End%20Report%202025%20-%2026/CAI_CUBE_INDUSTRY_USECASE_MAPPING.md).

---

## 1. App architecture (short restudy)

| Layer | Where | Notes |
|-------|--------|------|
| **Frontend** | `pams-app/` (HTML/CSS/JS) | DataManager, remoteStorage proxy, no framework. |
| **Backend** | `server/` (Express) | Storage API, auth, entities, admin routes. |
| **Storage** | PostgreSQL `storage` table | Key-value JSON; keys: `users`, `accounts`, `activities`, `internalActivities`, `industries`, `industryUseCases`, `regions`, `globalSalesReps`, etc. |
| **Account** | `accounts[]` | Each: `id`, `name`, `industry`, `salesRep`, `salesRepEmail`, `salesRepRegion`, `projects[]`. Projects: `id`, `name`, `useCases[]`, `status`, win/loss, MRR. |
| **Activity** | `activities` / `activities:YYYY-MM`, `internalActivities` | Linked to account/project/user; can have `source: 'migration'`, `isMigrated: true`. |
| **Industries** | `industries` (array) | Approved industry names. |
| **Use cases** | `industryUseCases` (object) | Per-industry only today. `universalUseCases` key exists in DataManager but is **not** used in Admin or activity forms. |

**Gaps relevant to migration:**

- No “Migration mode” toggle in Admin; migration cleanup runs once via `applyMigrationCleanupIfNeeded()` (localStorage version flag).
- Use cases in forms = `getUseCasesForIndustry(industry)` only (no union with universal).
- No account-level duplicate detection/merge UI (typos: Myntra vs mynrta).
- Multi-region same account: not clearly modelled (account-level vs project-level sales rep/region).

---

## 2. Industry & use case mapping (summary)

- **Industries:** Banking, Fintech, **Insurance** (all three distinct), plus Retail / eCommerce, Healthcare, B2B / Manufacturing, Automotive, Real Estate, Hospitality, Transportation, Sports, Gov / Citizen Services. See [CAI_CUBE_INDUSTRY_USECASE_MAPPING.md](../Presales%20Year%20End%20Report%202025%20-%2026/CAI_CUBE_INDUSTRY_USECASE_MAPPING.md).
- **Universal use cases (all industries):** Lead Qualification (New Sell), Customer Reengagement / Cross-Sell (Repeat Sell), In-Thread Commerce (Payments), Fulfillment & Support (Post Purchase).
- **Industry-specific use cases:** Stored in `industryUseCases[industry]`; in forms show **universalUseCases ∪ industryUseCases[industry]** (merged, sorted).
- **Data model change:** Keep `industryUseCases`; use `universalUseCases` in API and UI; forms and Admin must merge both when reading/writing use cases per industry.

---

## 3. Mapping list (for migration and Presales)

### 3.1 Industry mapping (source → PAMS canonical)

| Source (e.g. Presales / CAI) | PAMS canonical |
|------------------------------|----------------|
| Banking                      | Banking        |
| Financial Services           | Fintech        |
| BFSI (if not split)          | Banking or Fintech (rule TBD) |
| Insurance                    | Insurance      |
| Retail & eCommerce, Retail / eCommerce | Retail / eCommerce |
| Healthcare                   | Healthcare     |
| B2B / Manufacturing          | B2B / Manufacturing |
| Automative, Automotive       | Automotive     |
| Real Estate                  | Real Estate    |
| Hospitality                  | Hospitality    |
| Transportation               | Transportation |
| Sports                       | Sports         |
| Gov / Citizen Services, Government, Goverment (typo) | Gov / Citizen Services |
| Education, Media, IT & Software, F&B, CPG & FMCG, etc. | Add to canonical list if needed; else map to closest above. |

### 3.2 Use case mapping (source → PAMS)

- **Universal (all industries):** Lead Qualification (New Sell), Customer Reengagement / Cross-Sell (Repeat Sell), In-Thread Commerce (Payments), Fulfillment & Support (Post Purchase).
- **From Presales “Project Name”** (e.g. “Marketing”, “Marketing, Commerce”, “Support”): map to these four where possible; else add as **industry-specific** for the account’s industry, or as new universal after approval.
- Typo: Fullfillment → Fulfillment.

---

## 4. Migration mode (Admin toggle) – full spec in [MIGRATION_MODE_SPEC.md](MIGRATION_MODE_SPEC.md)

- **Goal:** Replace/adjust current migration flow with an **Admin-controlled Migration mode** so admins can enable/disable migration behaviour and see a dedicated migration UI.
- **Toggle is mandatory.** Default: Off. When On, left nav shows **only**: Accounts, Projects, Activities, Suggestions (find best), Merge/update; Migration dashboard (total vs confirmed activities); wins marked and wins without account/activities flagged; tag people/accounts to reps; admin can reassign (e.g. left reps like Ankit Chaddha) and validate conflicts.
- **Full behaviour, field mapping (CSV → PAMS), questions, and suggestions:** see **[MIGRATION_MODE_SPEC.md](MIGRATION_MODE_SPEC.md)**.
- **Implementation:** Add toggle in Admin; read flag in app.js; gate migration-only nav and views behind this flag.

---

## 5. Admin upgrade: Universal + industry-specific use cases

- **Backend / storage:**  
  - Persist **universalUseCases** (array); already in DataManager (`getUniversalUseCases`, `saveUniversalUseCases`). Ensure it is saved/loaded from same storage API as other config (e.g. remote storage).  
  - **industryUseCases** remains per-industry; meaning: “additional” use cases for that industry.  
  - **Effective use cases for industry I** = `universalUseCases` ∪ `industryUseCases[I]` (deduped, sorted).

- **Admin UI (Industry & Use Cases section):**  
  - **Block 1 – Universal use cases:** List of use cases shown in *all* industries. Add / Edit / Remove.  
  - **Block 2 – Industries:** Current list; select industry. **Edit** (rename), Add, Remove per industry – same as today, explicitly retained.  
  - **Block 3 – Industry-specific use cases:** For selected industry, list only the *extra* use cases (excluding universal). Add / Edit / Remove.  
  - **Block 4 – Pending (Merge and others):** Retain current behaviour. Pending industries and pending use cases: Accept / Reject / Merge into existing. No change to this block.  
  - Show short help text: “Universal use cases appear in every industry; industry-specific are added only for the selected industry.”

- **Activity / project forms:**  
  - When industry is selected, call a new DataManager method e.g. `getEffectiveUseCasesForIndustry(industry)` that returns merged universal + industry-specific, sorted.  
  - Use that list in dropdowns (and keep “Other” for new suggestions).

---

## 6. Duplicate handling (account level first)

- **Goal:** Handle duplicates at **account level** first (e.g. Myntra vs mynrta, or same account name with typos).
- **Approach:**
  1. **Detection:** Script or Admin tool: group accounts by normalized name (e.g. lowercase, trim, optional fuzzy/similarity). Report groups that look like duplicates (e.g. “Myntra”, “mynrta”, “Myntra “).
  2. **Review:** Admin sees list of duplicate groups; for each group choose “canonical” account and merge others into it (or delete duplicates after moving projects/activities to canonical).
  3. **Merge:** Merge = move all projects and activities from duplicate accounts to the canonical account; then delete duplicate accounts (or mark merged and hide). Update any references (e.g. activity.accountId).
  4. **Prevention:** On account create/save, optional “suggest possible duplicate” when normalized name is close to an existing account (e.g. Levenshtein or simple similarity). Admin can still save if intentional (e.g. different regions).

- **International account checkbox (account level):**
  - Add an **International account** checkbox at account level. When **checked**: sales rep relationship **moves to project level** (account-level sales rep not used; each project can have its own sales rep/region).
  - **Data model:** `account.internationalAccount` boolean. When true: `account.salesRep` / `salesRepEmail` / `salesRepRegion` can be empty; **project** has optional `salesRep`, `salesRepEmail`, `salesRepRegion` for per-project rep.
  - **UI:** Account card and list show “International (per project)” when `account.internationalAccount` is true. Edit account flow (and migration UI) sets this flag.
  - **Use for:** FedEx (one account, projects APAC, LATAM) and other multi-region same-company accounts.

---

## 7. Migration by section (Account → Project → Activity)

Migration is done **section-level** in the Migration mode UI:

1. **Account Level Data** – List accounts (e.g. alphabetically); duplicate groups in a dedicated section; confirm merge or not; set **Global account** where needed; set or confirm **best-fit Industry** from canonical list.
2. **Project Level Data** – Map/attach projects (from Win data or CSV) to accounts; set project-level sales rep when account is Global; set use cases and win/loss status.
3. **Activity Level** – Map/attach activities to accounts and projects; link migrated activities to the correct account/project.

Each section can have its own sub-views and validation. Best-fit industry and duplicate/merge decisions in the Account section drive Project and Activity mapping.

---

## 8. Win data / use case data (files and usage)

- **Presales Year End Report 2025 - 26:**  
  - `20205-26 data presales.xlsx`, `2025 Wins with SFDC-2026-02-02-17-56-23.xlsx`, `CAI Cube & 3p Connectors .xlsx`, `monthly fixed + total price-2026-01-26-17-43-07.xlsx`.  
  - Use for: industry/use case lists (CAI Cube), Wins (SFDC file), and activity/account names for mapping and duplicate ideas.
- **Project-PAT-LocalArchive (e.g. 2026-02-11_161551):**  
  - `pams_migration_ready_v3.csv`, `pams_migration_ready_v2.csv` – migration CSV with columns: Activity Category, Date, Presales Username, Activity Type, **Account Name**, **Project Name**, Sales Rep Name, **Industry**, SFDC Link, Products, etc.  
  - Use for: mapping Account Name → PAMS account (and duplicate detection); Project Name → use cases; Industry → PAMS industry.  
- **Scripts:** `compare-backups-winloss.js` (win/loss counts from backups); `migrate_industries.js`, `analyze_industries.js` (industry normalization).  
- **Wins file:** Parse **2025 Wins with SFDC** (e.g. `2025 Wins with SFDC-2026-02-02-17-56-23.xlsx`) to map Win/Loss rows to PAMS accounts/projects and to assign **match categories** (Strong / Medium / Weak) – see §9.
- **Suggestion:** Script(s) to extract unique Account Name + Industry + Project Name from CSV and Wins xlsx to drive mapping tables, duplicate candidates, and best-fit industry.

---

## 9. Win match categories (Strong / Medium / Weak)

After parsing Win data and comparing with activity and account data, classify each win/loss row into:

| Category | Colour | Meaning |
|----------|--------|--------|
| **Strong match** | **Green** | This account’s win/loss is **fully understood and mapped**: we have a clear link to the PAMS account and to the activities we have for it (e.g. same account name + SFDC link + activities in migration data). |
| **Medium match** | **Yellow** | Partially mapped: e.g. account exists and matches by name or SFDC, but not all activities or projects are linked; or Win row has account name but no matching activity set yet. |
| **Weak match** | **Red** | Unclear or unmapped: e.g. Win row has no matching account in PAMS, or no activities linked; needs manual review or creation. |

Definitions can be refined once Wins file structure is known (e.g. columns for Account, SFDC Id, Project, Win date). Migration UI shows these colours so admins can prioritise Green first, then fix Yellow/Red.

---

## 10. Best-fit Industry in Account merge section

In the **Account Level Data** (migration) section, for each account (and duplicate group):

- Show a **best-fit Industry** from the canonical PAMS industry list.
- Source of best-fit: analyse **all** available data (migration CSV, Wins file, any logged industry in activities for that account name). If the same account name appears with different industries in source data, use majority or most recent; if our analysis suggests a different industry than the most frequent in data, show that as “Suggested: X” for admin to validate.
- Admin can **confirm or change** industry before/after merge. This drives correct use-case list and reporting.

---

## 11. Other gaps and upgrades (suggested)

- **Backup before migration runs:** Always run backup (e.g. Daily backup or deploy workflow) before any bulk merge or migration import; keep a pre-migration snapshot.
- **Audit log:** Log migration-mode actions (e.g. “Account merge”, “Bulk attach to account”) in `activity_logs` or admin log for traceability.
- **Sandbox / cutoff:** Already in REQUEST_SUMMARY_AND_PLAN (submission date + 7 days, auto-close, “Migrated data” tag). Ensure Migration mode and Sandbox logic don’t conflict (e.g. migration mode can attach to accounts that are “closed” for Sandbox).
- **Performance:** Large activity/account lists during migration: consider batch or chunked UI/API for “Migrated data” tab and duplicate review.
- **Runbook:** Document step-by-step migration runbook (backup → enable Migration mode → run duplicate detection → review mapping → import/attach → disable Migration mode → verify counts) in a separate doc (e.g. P-012).

---

## 12. Resolved / agreed

- **Migration mode default:** Off.
- **Win data:** Parse 2025 Wins with SFDC xlsx; show Strong (Green) / Medium (Yellow) / Weak (Red) match categories.
- **Account merge section:** Best-fit Industry from canonical list (using all logged data); option for Global account; alphabetical account list; Duplicates section with confirm-merge or not.
- **Migration by section:** Account Level Data → Project Level Data → Activity Level.
- **Admin Industry & Use Cases:** Block 2 has Edit (rename) for industries; Block 4 (Pending – Merge and others) retained as-is. Universal + industry-specific use cases in Blocks 1–3.

---

## 13. Next: mapping for validation

Before implementation, produce a **best-fit mapping** for you to validate:

- **Industry:** From migration CSV and Wins (when parsed), unique Account Name → suggested PAMS industry; note where source has BFSI/Education/F&B etc. and suggest Banking vs Fintech vs Insurance or other canonical.
- **Accounts:** Alphabetical list of distinct account names; duplicate groups (normalized/fuzzy); suggested Global-account flag where same name appears in multiple regions.
- **Win match:** Once Wins file is parsed, sample of Strong / Medium / Weak examples and exact column usage.

See **MIGRATION_MAPPING_FOR_VALIDATION.md** (generated from scripts and data) for the mapping to approve.
