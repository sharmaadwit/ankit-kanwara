# Plan review and questions (before building)

**Summary of your requests**

1. **Login per sales leader** – You will provide leaders per region; login should be per sales leader.
2. **Activities filters** – Move **Entered by** to the **top** of the filter list in the Activities section.
3. **Accounts section** – Fix why it’s empty; add **regional filters**.
4. **Analytics** – Add a **regional report** showing **all accounts interacted in the month**; scrap the current “analytics update”; make reports **different for regional leaders vs CXOs**.
5. **Monthly report PDF** – Keep as planned (download, Run AI insights, add/remove wins and losses).
6. **Account view** – Show **Projects** and **Activities** (in addition to whatever is shown today).

---

## What I found in the codebase

### Activities – “Entered by” position
- **Sidebar (classic):** In `index.html`, the Activities sidebar has filters in this order: Type → Industry → Region → Activity Type → Date Range → Custom dates → **Entered By** → Sort By → Reset.
- **Card view:** In `app.js` (card activities), the filter bar order is: Search → Industry → Channel → Timeframe → **Owner**.
- **Planned change:** Move “Entered by” / “Owner” to the **first** filter in both UIs (before Type in sidebar, before Industry in card bar).

### Accounts – why it might be empty
- **Classic mode:** Content is rendered into `#accountsContent` by `loadAccountsView()` (back link, filter bar with Search / Industry / Sales Rep, then account cards). Data comes from `DataManager.getAccounts()` (cache → async storage or `localStorage`).
- **Card mode:** `loadCardAccountsView()` replaces the whole `#accountsView` with a card grid; no `#accountsContent` in that path.
- **Possible causes for empty:**
  - **No data:** `getAccounts()` returns `[]` (e.g. new env, or accounts stored under a different key/API).
  - **Wrong view/interface:** If something forces card layout but card view has a bug, or vice versa.
  - **Permissions/redirect:** Analytics-only users are forced to Reports; they never see Accounts. So “empty” could also mean “I don’t see Accounts at all” (nav) vs “I see Accounts but the list is blank” (data).
- **Planned change:** Add **region** to account filters (dropdown from `DataManager.getRegions()` or account’s `salesRepRegion`). Optionally ensure one clear “no accounts” message when the list is empty and add a small guard so we don’t rely on a missing `accountsContent` (e.g. if only card view is used).

### Account view – Projects and Activities
- Today, account **cards** (both classic and card) show: name, industry, sales rep, **activity count**, and a **Projects** block (`buildAccountProjectsMarkup`). There is **no** dedicated “account detail” page (click account → single-account view).
- So “In account view, show Projects and Activities” could mean:
  - **Option A:** In the **list**, each card already shows Projects; add an **Activities** list/summary (e.g. count + last N or expandable list) on each card.
  - **Option B:** Add a **detail view** when you click an account: one page with Account info + **Projects** + **Activities** (full list for that account).
- **Planned assumption:** Implement **Option B** (account detail view with Projects + Activities) unless you prefer only enriching the existing cards (Option A).

### Analytics – regional report and roles
- You want to **scrap the current analytics update** and have:
  - **Regional leaders:** A **regional report** showing **all accounts interacted in the month** (for their region).
  - **CXOs:** A **different** report/dashboard.
- **Clarifications needed:**  
  - For “login per sales leader”: is that **one login per region** (e.g. “India South leader”, “MENA leader”) with a **shared password per role**, or **individual accounts** (username/password) for each named leader?  
  - When you say “I will give you the leaders of each region”, do you mean: region → leader name/email (and we map that to a user/role), or a list of usernames that should have “regional leader” access?  
  - Should regional leaders **only** see their region’s data (accounts interacted in the month, etc.) and CXOs see all regions?

### Monthly report PDF
- Still in scope: section in Presales analytics dashboard, **Download PDF**, **Run AI to analyse insights**, **Add or remove wins and losses** for that view. No change to that plan.

---

## Questions before building

1. **Login per sales leader**
   - One **shared login per region** (e.g. “Regional leader – India South” with one password), or **separate accounts** per named person (each leader has their own username/password)?
   - Will you provide: list of regions + leader email/name, or list of usernames that are “regional leaders” (and we assign region in admin)?

2. **Regional leaders vs CXOs**
   - Should regional leaders see **only** their region (accounts interacted, activities, etc.) and CXOs see **all regions**?
   - For “regional report showing all accounts interacted in the month”: is that a **table/list of account names** (with optional columns like activity count, last activity date) for the selected month and region?

3. **Accounts “empty”**
   - When you say “Accounts section is empty”, do you mean:  
     (a) The **list is blank** (no account cards), or  
     (b) You **don’t see the Accounts section at all** (e.g. missing in nav or access)?  
   - Are you on **classic** or **card** layout when this happens?

4. **Account view – Projects and Activities**
   - Do you want a **dedicated account detail page** (click account → full page with Account info + Projects + Activities), or only **more info on the existing cards** (e.g. expandable Activities list on each card)?

5. **Regional filters in Accounts**
   - Should the region filter use the **same region list** as elsewhere (e.g. India South, MENA, India North, LATAM, India West, Africa & Europe, SEA, Inside Sales, Govt)?  
   - Filter by account’s **sales rep region** (e.g. `salesRepRegion`) or by **activity region** (accounts that had at least one activity in that region)?

Once you confirm these, I’ll implement: Entered by first, Accounts fix + region filter, account detail (Projects + Activities), then analytics regional report and login/role model as specified.
