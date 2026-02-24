# Plan summary – implemented and next steps (waiting for your go-ahead)

## Done in this session

1. **Entered by default to “myself”**  
   - `getDefaultActivityOwnerFilter()` now returns the current user’s id (or `'mine'`) for everyone. Admins still see “All activities” in the dropdown but the default selection is “My activities”.

2. **Accounts view error fixed**  
   - `loadAccountsView` was failing when `this.accountFilters` was undefined.  
   - `accountFilters` is now initialised at the start of `loadAccountsView` and in initial app state with `{ search, industry, salesRep, region }`.  
   - Missing handlers added: `handleAccountFilterChange(key, value)` and `resetAccountFilters()` so Industry/Sales Rep/Region changes reload the list.  
   - **Search** now updates `accountFilters.search` and reloads (so it works together with Region/Industry/Sales Rep).

3. **Entered by moved to top (Activities filters)**  
   - **Sidebar (classic):** “Entered By” is now the first filter, then Type, Industry, Region, etc.  
   - **Card activities bar:** “Entered By” is first, then Search, Industry, Channel, Timeframe.

4. **Regional filter on Accounts**  
   - Accounts filters now include **Region** (dropdown from `DataManager.getRegions()`).  
   - Filtering uses account’s `salesRepRegion` or `region`.  
   - `accountFilters.region` and reset are wired.

5. **Account cards: Projects, Activities, Notes (no separate detail page)**  
   - **Classic and card** account cards now show:  
     - **Projects** (existing block)  
     - **Activities** – last 8 activities (date, type, optional notes snippet)  
     - **Notes** – `account.notes` if present, otherwise “—”  
   - No new account detail page; all on the card.  
   - **Note:** `account.notes` is only displayed. Editing notes would require an “Edit account” flow that supports a notes field (not added in this pass).

6. **Admin: Sales Leaders section**  
   - **System Admin → Users & Access → Sales Leaders.**  
   - One row per region (from **Regions**); each row has a dropdown of **system users**.  
   - Selecting a user saves them as that region’s sales leader (`DataManager.getSalesLeaders()` / `saveSalesLeaders()`).  
   - Stored as `region → userId` for future “sales leader login” that will limit data to that region.  
   - **Leaders you named (for reference):**  
     - India South: **Vijay** → in data as **Vijay Kumar** (vijay@gupshup.io).  
     - India North: **Kaushal** → **Kaushal Menghaney** (kaushal.menghaney@gupshup.io).  
     - India West: **Sujal** → **Sujal Shah** (sujal.shah@gupshup.io).  
     - Africa & Europe: **Shashi** → **Shashi Bhushan** (shashi.bhushan@gupshup.io).  
     - LATAM: **Bruno** → **Bruno Montoro** (bruno.montoro@gupshup.io).  
     - ROW: **Clifton** → **Clifton David** (clifton@gupshup.io) – in data under **SEA**; if you use “ROW” as a region, add it in Regions and assign Clifton there, or map ROW to SEA.  
     - MENA: **Mukul Yadav** – **not found** in current system/sales users. Add him as a user (System Users or Sales Users) and then assign him as sales leader for MENA in Sales Leaders.

---

## Agreed scope (from your answers)

- **Analytics → Sales leader login (later):**  
  - Replace current “analytics” login with **sales leader login**.  
  - Each region has one leader (assigned in Sales Leaders).  
  - When they log in, **limit data to their region only** (e.g. regional report: accounts interacted in the month, etc.).  
  - Architecture is in place (Sales Leaders store + UI); actual login and region scoping to be implemented when you give the go-ahead.

- **CXO vs regional:**  
  - Regional leaders see **only their region**.  
  - CXOs get a **different** report/dashboard (to be defined later).

- **Monthly report (8‑page style) – keep:**  
  - You want the **same report as in the images** in the analytics view.  
  - **Download whole page as PDF/Images** – keep; do **not** scrap this.  
  - Only the **admin-level cache for 50+ analytics users** is scrapped (no need to implement that caching for now).

---

## Not done in this session (waiting for go-ahead)

1. **Sales leader login**  
   - Change “Analytics” login to “Sales leader” login (same UX: password or simple auth).  
   - Resolve current user → region from Sales Leaders.  
   - Restrict all analytics/report data to that region (e.g. “accounts interacted in the month” for that region only).

2. **Regional report in analytics**  
   - A **regional report** showing **all accounts interacted in the month** (for the selected region, or for the leader’s region when logged in as sales leader).

3. **Monthly report (8‑page) in app + PDF/Image download**  
   - Add the 8‑page report (from `MONTHLY_EMAIL_REPORT_SPEC.md`) into the analytics/reports view.  
   - “Download whole page” as **PDF** or **Images** (e.g. one image per page).  
   - Optional later: “Run AI to analyse insights”, “Add or remove wins and losses” for that view.

4. **CXO report**  
   - Different report/dashboard for CXOs (to be specified).

---

## Clarifications (if any)

- **Mukul Yadav (MENA):** Add him as a system/sales user so he can be selected as sales leader for MENA in Admin → Sales Leaders.  
- **ROW vs SEA:** If “ROW” is a separate region, add it under Regions and assign Clifton there; otherwise treat ROW as SEA and assign Clifton for SEA.  
- **Account notes editing:** Right now notes are only displayed. If you want editable notes, we can add an “Edit account” flow that includes a notes field.

---

## Next step

Confirm if this matches what you want, and give the go-ahead to implement (in order you prefer):

1. Sales leader login + region-scoped data.  
2. Regional report (accounts interacted in the month).  
3. Monthly 8‑page report in analytics view + PDF/Image download.
