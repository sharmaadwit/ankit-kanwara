# Analytics-first access & reports plan

**Status:** Plan (migration mode on hold).  
**Goals:** (1) Default login to Analytics for 50+ viewers; (2) Scale analytics with caching; (3) Add HTML/monthly reports into the app and align with email reports.

---

## 1. Analytics as default (first tab after opening URL)

**Current:** Login page shows **Presales User Login** as first tab (active), **Analytics Access** as second.

**Target:**  
- **First tab (default):** Analytics Access (password-only).  
- **Second tab:** Presales User Login (username + password).  
- Optional: remember last-used tab in `localStorage` so returning users see their previous choice.

**Implementation outline:**
- In `pams-app/index.html`: swap tab order and default active tab so Analytics is first and active (e.g. `data-tab="analytics"` first with `class="login-tab active"`, Presales second).
- In `pams-app/js/auth.js`:
  - On init (e.g. when showing login screen), set default tab to `'analytics'` (e.g. `this.currentLoginTab = 'analytics'` and call `switchLoginTab('analytics')` when no session).
  - Optionally: read `localStorage.getItem('pams_last_login_tab')` and use it as default; on successful login/submit set `localStorage.setItem('pams_last_login_tab', tab)`.
- Ensure analytics form is the one visible when the page loads (no presales form).

**Result:** Anyone opening the URL sees Analytics first; presales users switch to the second tab to log in.

---

## 2. Strategies for 50+ people accessing analytics (caching & scale)

**Challenges:** Many concurrent read-only users; same analytics payload for the same month/period; avoid overloading DB and app server.

**Recommended strategies (in order of impact):**

| Strategy | What | Why |
|----------|------|-----|
| **1. Server-side response cache (in-memory or Redis)** | Cache `GET /api/...` that serves analytics (or the data used to build it) per `month` (and optional filters). TTL e.g. 5–15 minutes. | Same 50 users viewing “Jan 2026” get one computed response; DB hit once per TTL. |
| **2. HTTP cache headers** | For analytics/data APIs: `Cache-Control: public, max-age=300` (5 min) or similar. | Browsers and any CDN/proxy can cache; fewer requests to your server. |
| **3. Precomputed snapshot per month** | Nightly or on-demand job that precomputes analytics for “last month” / “current month” and stores in DB or blob. API serves the snapshot. | Heavy aggregation runs once; 50 users just read the snapshot. |
| **4. Read-only replica (if DB grows)** | Point analytics reads to a read replica. | Keeps reporting load off the primary DB. |
| **5. Static export (optional)** | For “last month’s report”, generate a static HTML/PDF and serve from storage; link from Reports. | Maximum scalability for that view; no live DB for that page. |

**Practical first steps:**
- Add a **server-side in-memory cache** (e.g. key = `analytics:${month}:${hash(filters)}`, value = JSON, TTL 5–10 min) in the route or service that builds analytics. Invalidate on new data if needed (or accept short staleness).
- Set **Cache-Control** on the analytics API response so browsers cache for a few minutes.
- If you already have a “monthly analytics” API used by the Reports view, apply caching there first.

**Session/auth note:** Analytics users use the shared analytics password (no per-user DB writes). Sessions can be lightweight (e.g. cookie marking “analytics-only”); no need to cache per user, only per month/filters.

---

## 3. Reports: same HTML in app + monthly customization

**Context:**
- You have existing **HTML** report assets (e.g. in `docs/archive`: `enhanced_presales_tracker.html`, `PAMS V1.html`; and possibly report layouts from past work).
- You have **“email reports.pdf”** at `C:\Project PAT Master Folder\email reports.pdf` describing the desired email report layout/content.
- You want the **same reports** available **inside the app’s Reports view**, **customizable**, and **per month** (same structure, different data/month).

**Plan:**

1. **Review “email reports.pdf”**  
   - Manually open the PDF and list: sections, tables, charts, and text that should appear in “the” monthly report.  
   - Align with existing in-app reports (see `docs/ADMIN_SPLIT_AND_REPORTS_REVIEW.md`: Presales Reports, Sales View, Regional Data, Product Level Data).  
   - Define one “canonical” monthly report structure (sections + placeholders for month and data).

2. **Add report content into the app’s Reports view**  
   - **Option A – Embedded HTML:** Add a section or tab in the Reports view that loads HTML report “templates” (stored as static files or in DB). The app injects the current **month** and **data** (from existing analytics APIs) into the template (e.g. replace `{{month}}`, `{{activitiesTotal}}`, or a simple data-binding step).  
   - **Option B – Same layout as current Reports, plus “Monthly report”:** Reuse the current Reports UI (charts/tables); add a “Monthly report” subsection that mirrors the email report structure (same sections and tables) and uses the same data as the rest of Reports, with a month selector.  
   - Recommendation: start with **Option B** so one code path serves both the interactive Reports view and the “monthly report” view; then, if needed, add an HTML export that matches the email report layout.

3. **Monthly customization**  
   - **Month selector:** Already present in Reports; ensure every block (charts, tables, “monthly report” section) respects the selected month.  
   - **Customization:** Allow admin to toggle which sections are visible and optionally which columns/metrics to include (stored in existing config or a small “report config” blob). Same report structure for each month; only data and selected options change.

4. **Email reports (later)**  
   - Use the same data and structure as the in-app monthly report to generate HTML for email (e.g. from `server/services/email.js`) so the PDF spec in “email reports.pdf” is reflected in both the in-app report and the emailed report.

**Spec (from email report screenshots):**  
See **`docs/MONTHLY_EMAIL_REPORT_SPEC.md`** for the full 8-page structure (summary, use cases, wins, activity donut, call types, region activity, missing SFDC, activities by user). The PDF wasn’t readable in-code; the spec was derived from your attached images. Another format (e.g. HTML/Word) can be used to cross-check.

**Concrete next steps:**
- [x] Write spec from email report screenshots → `MONTHLY_EMAIL_REPORT_SPEC.md`.
- [ ] In the **Presales analytics dashboard** (Reports view), add a **“Monthly report (PDF)”** section with:
  - Month selector (same as Reports).
  - **“Download PDF”** – render the 8-page layout and trigger print-to-PDF or server PDF.
  - **“Run AI to analyse insights”** – on-demand analysis of the data for that month; store result for “Cube Analysis Top Highlights” / use-case narrative.
  - **“Add or remove wins and losses”** – UI to include/exclude which wins (and losses) appear in the report view and in the PDF.
- [ ] Reuse existing report logic (`reports-v2.js`, `app.js`) and wire data into the 8-page template; add any missing aggregations (call types, activities by user).
- [ ] (Later) Optional report customization (sections on/off) and “Email this report” / scheduled email.

---

## 4. Summary

| Item | Action |
|------|--------|
| **Default to Analytics** | Make Analytics the first and default login tab; Presales second. Optionally remember last tab in localStorage. |
| **50+ users** | Add server-side cache (and Cache-Control) for analytics API; consider precomputed monthly snapshot and read replica if needed. |
| **Reports in app** | Add the same report structure (aligned with email reports.pdf) into the Reports view; month selector; same reports per month with customizable sections. |
| **Email reports** | Align in-app monthly report with the layout in “email reports.pdf”; use that for future email/PDF generation. |

Migration mode work is on hold; this plan focuses only on analytics default, scaling, and reports.
