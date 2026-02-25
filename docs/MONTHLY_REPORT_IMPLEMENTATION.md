# Monthly Report – Implementation & Export

This doc describes how the **Monthly report (PDF)** tab works and how to use **Edit**, **Download PDF**, **Download charts as images**, and **Email** to share with the organisation.

---

## 1. What’s in the report (8 sections, matching the spec)

| Section | Content | Editable? |
|--------|---------|-----------|
| **Page 1 – Summary** | Total activity, Internal/External/Wins pills, “Cube Analysis Top Highlights” | Yes – **Edit report** → Highlights text |
| **Page 2 – Use cases** | 5 use-case cards (Lead gen, Loyalty, Support, Sales discovery, Operational automation) | Yes – **Edit report** → Use cases (5 text fields) |
| **Page 3 – Wins** | Grid of win cards (client, MRR, use case) | Yes – **Edit report** → Include/exclude wins + add manual wins |
| **Page 4 – Activity breakdown** | **Donut chart** (Customer Calls, Internal, Pricing, POC, SOW, RFx) | No – from data |
| **Page 5 – Call types** | **Horizontal bar chart** (Demo, Discovery, etc.) | No – from data |
| **Page 6 – Region activity** | **Vertical bar chart** by region (external only) | No – from data |
| **Page 7 – Missing SFDC** | **Vertical bar chart** by region | No – from data |
| **Page 8 – Presales by user** | **Horizontal bar chart** (activities per user) | No – from data |

All sections use the **current period** (month/year) from the Reports header.

---

## 2. All graphs are now real charts

- **Monthly report (PDF)** tab now renders the same chart types as the spec:
  - **Donut** for activity breakdown (with “Total” in the centre).
  - **Horizontal bar** for Call types and Presales by user.
  - **Vertical bar** for Region activity and Missing SFDC.
- These are drawn with Chart.js in the Monthly report view and are included when you **Download PDF** (print).

---

## 3. Edit report (highlights, use cases, wins)

- **Edit report** opens a modal for the **current period** (e.g. “January 2026”).
- **Cube Analysis Top Highlights**  
  - One text area.  
  - Shown on Page 1 under “Cube Analysis Top Highlights – Global” when not empty.
- **Use cases (5 boxes)**  
  - One line per use case.  
  - Default text is the standard bullets; you can replace with your own.
- **Wins**  
  - **Include/exclude:** list of wins in the period with checkboxes; only checked wins appear in the report.  
  - **Manual wins:** “+ Add manual win” adds a row (Client, MRR, Use case, Presales rep). Manual wins are appended to the wins grid on Page 3.
- **Save** stores overrides in `DataManager` (key `pams_reportOverrides`) **per period**, then re-renders the report.

---

## 4. Download and share with the organisation

### Download PDF

- **Download PDF** runs the browser **Print** dialog.
- Choose “Save as PDF” (or your system’s equivalent) to get a single PDF of the full Monthly report (all 8 sections, including charts).
- Print CSS hides the rest of the app and shows only `#monthlyReportPdfContent`.

### Download charts as images

- **Download charts as images** saves **one PNG per chart** (activity breakdown, call types, region, missing SFDC, presales by user).
- Filenames: `activity-breakdown-YYYY-MM.png`, `call-types-YYYY-MM.png`, etc.
- Use these in slides, Confluence, or email.

### Email report

- **Email report** opens the default mail client with subject:  
  `Presales Update [Period]` (e.g. “Presales Update January 2026”).
- You then:
  1. Attach the PDF you saved (or attach the chart PNGs).
  2. Add recipients and send.

(There is no in-app “send email with PDF attached”; that would require a backend endpoint and is not implemented here.)

---

## 5. Strategy summary

| Goal | How |
|------|-----|
| **See all graphs** | Open **Reports** → **Monthly report (PDF)**. All 5 chart sections use real Chart.js charts. |
| **Edit narrative / wins** | **Edit report** → set Highlights, Use cases, and Wins (include/exclude + manual) → **Save**. |
| **Download same as PDF** | **Download PDF** → in the print dialog choose “Save as PDF”. |
| **Download as images** | **Download charts as images** → 5 PNGs (one per chart). |
| **Send to organisation** | **Email report** (opens mailto) → attach the saved PDF and/or chart images → send. |

---

## 6. Data and storage

- **Charts:** Use the same period activities as the rest of Reports (including sales-leader region filter when applicable).
- **Overrides:** Stored per period in `DataManager` (`getReportOverrides` / `saveReportOverrides`). Structure:  
  `{ [period]: { highlights, useCases: [5], includedWinIds, manualWins } }`.
- **Wins in period:** Derived from projects with status `won` and `winLossData.monthOfWin` (or similar) matching the selected month.

---

## 7. Optional future work

- **Server PDF:** Backend endpoint that returns the report as PDF (e.g. Puppeteer or similar) for “Email report” to attach automatically.
- **Scheduled email:** Cron job that generates the PDF for last month and emails it to a list.
- **AI insights:** “Run AI to analyse insights” could fill the Highlights or use-case text from activity data (stored in overrides until next run).
