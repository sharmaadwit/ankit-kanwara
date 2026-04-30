# PreSight — Superagent integration roadmap (Gupshup Superagent + Gmail + Calendar)

**Status:** **Planning** — product and Gupshup Superagent capabilities must be confirmed before execution.  
**Not the same as:** `docs/PAMS_ROADMAP_APRIL_2026.md` (PAMS app roadmap for April). This document is the **PreSight / Superagent** track.

**Intent:** Use **Gupshup Superagent** (with **Gmail** and **Calendar** connected) as the system where **presales work is generated, summarised, and structured**. Use **PAMS** primarily as a **reporting and analytics engine**, with **CSV** as the **primary integration path** for getting structured data into PAMS until or unless a direct API is justified.

---

## 1. Target operating model

| Layer | Role |
|--------|------|
| **Gupshup Superagent** | **Work surface:** threads, email triage, meeting context, agent-generated drafts, follow-ups, possibly structured “activity candidates” from Gmail + Calendar signals. |
| **Gmail** | **Source:** customer threads, internal handoffs, attachments, timestamps; input to the agent for classification and extraction. |
| **Calendar** | **Source:** meetings, attendees, recurrence, free/busy; input for “what happened / what’s scheduled” without manual re-keying in PAMS forms. |
| **PAMS** | **System of record for reporting:** dashboards, monthly packs, win/loss roll-ups, regional analytics, SFDC compliance views — fed by **regular CSV imports** shaped by Superagent-side export. |
| **CSV** | **Primary integration contract** v1: predictable columns → existing / hardened **bulk import** paths in PAMS; avoids coupling releases to Superagent API maturity. |

---

## 2. What we can extract and use (definition backlog)

Fill each row when Superagent + Gmail + Calendar capabilities are confirmed with Gupshup.

| Domain | Candidate extract | Use in PAMS (via CSV or future API) |
|--------|-------------------|-------------------------------------|
| **Email** | Thread ID, subject, participants, last activity date, sentiment/classification (if agent provides), links to SFDC/opportunity (if detected in body) | Map to **account / project**; drive **activity type**; **external** activity rows; **notes** field |
| **Calendar** | Event title, start/end, attendees, location, recurrence, “organiser” | **Customer call** / **meeting** activities; **duration**; **region** if inferred from attendee domain |
| **Agent output** | Structured JSON or CSV from Superagent: proposed activity rows, confidence, suggested account match | **Bulk import** after human approve-in-Superagent-or-export step |
| **Wins / pipeline** | If agent pulls from CRM emails or attachments | Align with **R-010** Salesforce wins Excel — either merge pipelines or keep wins in PAMS import only |

**Principle:** Prefer **one canonical CSV export template** from Superagent (“PreSight export”) that PAMS already validates (**server-side validation**, normalized dual-write) rather than many ad-hoc formats.

---

## 3. CSV-first integration (phases)

### Phase 0 — Definition (current)

- [ ] Confirm Superagent connectors available for **Workspace Gmail** + **Calendar** (scopes, rate limits).  
- [ ] Agree **minimum column set** for `activities` / `accounts` alignment with `docs/DATA_OPTIMISATION_AGENT_BUILD.md` validation rules.  
- [ ] Produce **sample CSV** from Superagent (redacted) + **import smoke test** on staging.

### Phase 1 — Export template & documentation

- Publish **PreSight CSV spec** (versioned): columns, types, required fields, examples.  
- Map columns → PAMS bulk import templates (`bulkImport.js` / server validation).  
- **Error report** on failed rows (already partially in import UX) — ensure Superagent users get actionable feedback.

### Phase 2 — Operational rhythm

- Define cadence: **daily / weekly** export from Superagent → upload to PAMS (manual or scripted fetch from shared drive — **still Railway-compatible** if pull is from GitHub Actions or admin-triggered job).  
- **Ownership:** who approves rows before import (presales lead vs self-serve).

### Phase 3 — PAMS as reporting engine

- Investment bias: **Reports**, **monthly email package (R-005)**, **exports (R-004)**, **dashboard** accuracy.  
- Reduce net-new **manual logging UX** in PAMS unless CSV gaps demand it.

### Phase 4 — Optional API (later)

- Direct POST of batches from Superagent to PAMS **`/api/storage`** or a dedicated **`/api/presight/import`** — only after CSV contract is stable and volume justifies it.

---

## 4. Feature roadmap (Superagent / PreSight track)

| Priority | Item | Description |
|----------|------|-------------|
| **P0** | **CSV contract v1** | Single documented export format + validation alignment with PAMS. |
| **P0** | **Human-in-the-loop** | Superagent proposes rows; user confirms export → CSV → PAMS (quality over full automation). |
| **P1** | **Gmail signal taxonomy** | Which labels/folders/keywords drive “external activity” vs “internal” vs ignore. |
| **P1** | **Calendar → activity mapping** | Rules: meetings &gt; X minutes with external domain → candidate customer call. |
| **P2** | **Dedupe** | Same meeting + same thread → one activity; conflict rules. |
| **P2** | **SFDC link inference** | Optional; aligns with PAMS SFDC compliance reporting. |
| **P3** | **API ingestion** | Replace or supplement CSV when stable. |

---

## 5. Relationship to PAMS backlog (`R-xxx`)

| R-ID | Relevance to Superagent track |
|------|--------------------------------|
| **R-004** | Export suite — PAMS exports **to** leadership while Superagent feeds **in** via CSV — complementary. |
| **R-005 / R-006** | Monthly email / notifications — reporting outputs fed by imported data. |
| **R-010** | Salesforce wins Excel — may coexist with Superagent CRM signals; avoid duplicate truth without merge rules. |
| **R-028** | Calendar integration — **partially superseded** by Superagent owning calendar read; PAMS may only need **imported** outcomes. |

---

## 6. Open questions (must answer before build)

1. **Superagent:** Maximum export format (CSV, JSON), scheduling, row limits?  
2. **Identity:** How do Superagent users map to **PAMS `assignedUserEmail`** / user IDs?  
3. **Security:** Where does CSV land (email attachment, S3, Drive) relative to Railway constraints?  
4. **Conflict:** If both manual PAMS entry and Superagent CSV occur, which wins per activity id?

---

## 7. References

- `docs/PAMS_ROADMAP_APRIL_2026.md` — PAMS April roadmap (wait for backlog review).  
- `docs/BACKLOG_OPEN_REPORT_R01.md` — PreSight open backlog.  
- `docs/DATA_OPTIMISATION_AGENT_BUILD.md` — validation expectations for imports.  
- `bulkImport.js` / server validation — technical contract for CSV rows.  

---

*PreSight Superagent roadmap — separate from PAMS-only April roadmap; update when Gupshup product details are confirmed.*
