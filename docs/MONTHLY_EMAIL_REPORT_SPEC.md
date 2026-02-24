# Monthly Presales Update Report – Spec (from email report PDF / screenshots)

This spec matches the **8-page “Presales Update” email report** (e.g. 28th Edition) so we can automate it in the dashboard and offer PDF download, AI insights, and configurable wins/losses.

---

## Report structure (8 pages)

### Page 1 – Summary & intro
- **Header:** Date/time, title “Gupshup Technology India Pvt Ltd Mail - Presales Update [Edition]”
- **Logo:** Gupshup
- **Email metadata:** Subject “Presales Update [Edition]”, From, To, Cc, Date sent (optional in PDF)
- **Intro text:** e.g. “We are trying out a new monthly report format. Please feel free to reach out…”
- **Key metrics box (blue):**
  - **Total Activity:** single number (e.g. 283)
  - **January 2026** (or selected month)
  - Pills: **Internal** count, **External** count, **Wins** count
- **Definition:** “Internal activities are presales-led, non-customer activities…”
- **Section heading:** “Cube Analysis Top Highlights - Global” (lead-in to next page)

### Page 2 – Use cases across industries
- **Title:** “USE CASES FIRST: 5 USE CASES ACROSS INDUSTRIES”
- **Subtitle:** “What each use case is, where it shows up, and the overall takeaway from the data.”
- **Five content boxes (e.g. light blue, rounded):**
  1. **Lead gen & onboarding** – Industries list; description; regional highlights (e.g. MENA, LATAM, India South/North)
  2. **Loyalty & retention** – Industries; description; e.g. “LATAM’s strongest win theme (21 won)”
  3. **Support & FAQ** – Industries; description; e.g. “Highest pipeline share in MENA (54%)…”
  4. **Sales discovery & AI recommendation** – Industries; description; regional strengths
  5. **Operational automation** – Industries; description; regional examples
- Data source: use-case/industry analytics and pipeline/wins data (or AI-generated highlights).

### Page 3 – Wins (selected month)
- **Title:** “Wins - January 2026” (month from selector)
- **Layout:** Grid of win cards (e.g. 3×3), each card:
  - **Client name**
  - **MRR:** value + currency (₹ or $)
  - **OTD:** (optional) value + currency
  - **Use case:** short description
  - **Presales rep:** name
- **Data source:** Win/loss data for the month; **configurable:** “Add or remove wins and losses that are going into that view” (admin/user can include/exclude specific wins).

### Page 4 – Activity breakdown (donut)
- **Title:** “Activity breakdown”
- **Subtitle:** “Overall Activity”
- **Donut chart:** centre text “283 Total” (or selected month total)
- **Segments (with counts in legend):**
  - Customer Calls (e.g. 183)
  - Internal (e.g. 57)
  - Pricing (e.g. 18)
  - POC (e.g. 11)
  - SOW (e.g. 10)
  - RFX (e.g. 4)
- **Data source:** Same as current Reports “Activity breakdown” (by activity type); external + internal.

### Page 5 – Call types
- **Title:** “Call types”
- **Chart:** Horizontal bar chart
- **Bars (example order):** Demo (56), Discovery (48), Scoping Deep Dive (46), Q&A (14), Follow-up (10), Customer Kickoff (7), Internal Kickoff (2)
- **Data source:** Activity type / call type from activities (e.g. `callType` or type mapping).

### Page 6 – Region activity
- **Title:** “Regional intelligence” / “Region Activity”
- **Subtitle:** “January 2026 (External Only)”
- **Chart:** Vertical bar chart – **Y:** Activity count, **X:** Regions (India South, MENA, India North, LATAM, India West, Africa & Europe, SEA, Inside Sales, Govt)
- **Data source:** Activities for month, grouped by region (external only); same as current “Region Activity” in Reports.

### Page 7 – Missing SFDC opportunities
- **Title:** “Missing SFDC opportunities”
- **Subtitle:** “External activities where project/account has no SFDC link. January 2026.”
- **Chart:** “Missing opps by region” – vertical bar chart, **Y:** Number of opps, **X:** Same regions
- **Data source:** Activities (external) for month where account/project has no SFDC link, by region; same as current “Missing SFDC” in Reports.

### Page 8 – Presales individual activity
- **Title:** “Presales individual activity” / “Activities by user”
- **Chart:** Horizontal bar chart – users (e.g. by email) vs activity count (e.g. 0–48)
- **Data source:** Activities for month grouped by presales user (e.g. `assignedUserEmail` or `userId`).
- **Footer (optional):** “Thanks Adwit Sharma” or configurable sign-off.

---

## Dashboard section to build

1. **Location:** Inside the **Presales analytics dashboard** (Reports view), add a section: **“Monthly report (PDF)”**.
2. **Controls:**
   - **Month selector:** Same as existing Reports month (e.g. January 2026).
   - **“Download PDF”** button: Renders the 8-page layout above with current data and selected month, then triggers browser print to PDF or server-generated PDF.
   - **“Run AI to analyse insights”** button: One-time (or on-demand) run that analyses the data for the selected month and produces narrative highlights (e.g. for “Cube Analysis Top Highlights” and/or use-case boxes). Store result so the report can show “AI-generated insights” until next run.
   - **“Add or remove wins and losses”** option: UI (e.g. checklist or toggle list) of wins/losses for the month; user can include/exclude which ones appear in the Wins page (Page 3) of the report. Selections persisted (e.g. in config or per-user/per-report state).
3. **Data:** Reuse existing APIs and report logic where possible (e.g. `getMonthlyAnalytics`, win/loss from projects, activity breakdown and region/Missing SFDC from `reports-v2.js` and `app.js`). Add any missing aggregations (e.g. call types, activities by user) from current activity data.
4. **Automation:** Report layout should be data-driven (templates with placeholders); same structure every month, data and month label change. Optionally: schedule monthly email with this PDF attached (reuse `server/services/email.js` and same HTML/PDF).

---

## Relation to existing code

- **Reports view** already has: Activity breakdown (donut), Region Activity, Missing SFDC, and related charts in `app.js` and `reports-v2.js`.
- **HTML sources:** You combined two HTML files to create this email; the layout above should be recreated in the app (or as a server-rendered template) so it’s one automated flow, not manual HTML paste. Existing `docs/archive/enhanced_presales_tracker.html` and similar are references; the canonical structure for the monthly PDF is this 8-page spec.
- **PDF:** We don’t read the PDF directly; this spec is derived from your **screenshots** of the email report. If you have another format (e.g. Word or HTML), that can be used to double-check layout and wording.
