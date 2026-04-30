# PAMS — April 2026 roadmap (draft)

**Status:** **Draft.** Do **not** treat this as final execution commitment until the **PreSight backlog review** is closed (see §1).  
**Companion:** Operating-model shift toward **Superagent + reporting-first PAMS** is planned separately in **`docs/PRESIGHT_SUPERAGENT_ROADMAP.md`** — read together.

---

## 1. Gate: backlog review must finish first

| Gate | Action |
|------|--------|
| **Primary backlog source** | **`docs/BACKLOG_OPEN_REPORT_R01.md`** (PreSight open backlog, `R-001` … `R-034`). When review completes, update this roadmap with any **new report revision** (e.g. R-02) or explicit sign-off from product. |
| **Legacy traceability** | `docs/PLANNED_AND_BACKLOG.md`, `docs/BACKLOG_BY_CATEGORY.md` remain historical references. |
| **After review closes** | Replace §3 placeholders with **committed dates**, **owners**, and **cut line** for April vs May carry-over. |

**Instruction to planning owner:** Re-open this file once the backlog review is **finished**, map approved `R-xxx` items into §3, and set `Status: Final` in the header.

---

## 2. April 2026 — objectives (themes)

Aligned with the **current** suggested execution order in `BACKLOG_OPEN_REPORT_R01.md` §4, adjusted for a **short April window** (if closing April as we enter May, treat §3 as **retrospective + carry-forward**).

| Theme | Intent for April |
|--------|------------------|
| **A. Revenue & compliance** | Land or substantially progress **R-010** (Salesforce wins/losses Excel + awareness) and **R-002** (cookie-only cutover) when user migration is confirmed. |
| **B. Data safety** | Progress **R-012** (draft conflict UX), **R-017** / **R-018** (server-side merge) where feasible — reduces risk as reporting load grows. |
| **C. Scale** | **R-013** (month-scoped activities) / **R-011** (async hardening) — priority if activity volume or concurrency issues surfaced in April. |
| **D. Migration discipline** | **R-030** (migration E2E) + **R-022** / **R-023** (cleanup + runbook) if migration mode is used in production this quarter. |
| **E. Comms** | **R-005** → **R-006** (monthly email package, then notifications) if reporting shifts toward scheduled stakeholder updates. |
| **F. Bridge to Superagent** | Harden **CSV import/export** paths (**R-004** export suite overlaps); treat CSV templates as the **contract** with **`PRESIGHT_SUPERAGENT_ROADMAP`** — see companion doc. |

---

## 3. Placeholder — April feature roadmap (fill after backlog review)

Replace `TBD` with dates/owners when review closes.

| Week / sprint | Candidate items (`R-xxx`) | Notes |
|---------------|---------------------------|--------|
| **Sprint 1** | R-010 (start), R-002 (if ready), R-030 or R-022 start | Parallel only if capacity allows |
| **Sprint 2** | R-010 (complete/preview), R-012, R-017 | Merge work may span sprints |
| **Sprint 3** | R-013, R-011, R-005 (start) | Scale + comms — order per review |
| **Buffer** | R-003, R-004, R-007 | Reports/export/admin after high-severity items |

**April reporting pivot (planning only):** As **Superagent Presight** generates more structured activity elsewhere, PAMS in April–May should bias engineering toward **reports reliability**, **CSV robustness**, and **dashboard accuracy** rather than net-new logging UX — detailed in `docs/PRESIGHT_SUPERAGENT_ROADMAP.md`.

---

## 4. Dependencies & risks

| Risk | Mitigation |
|------|------------|
| Backlog review slips | Keep §3 as single source; avoid committing externally until gate in §1 clears. |
| R-010 schema mismatch | Align Excel columns with SFDC export samples; document in `PLANNED_AND_BACKLOG.md` §5. |
| Cookie cutover (R-002) | Coordinate with users on session-only auth; avoid cutting API path until backups/scripts updated. |
| Superagent timeline unknown | Do not block R-010 on Superagent; CSV bridge is independent (see companion roadmap). |

---

## 5. References

- `docs/BACKLOG_OPEN_REPORT_R01.md` — open backlog & suggested order  
- `docs/PAMS_FEATURE_UPDATE_PRESALES_EXPERT_REVIEW.md` — PM phased view  
- `docs/PRESIGHT_SUPERAGENT_ROADMAP.md` — **separate** Superagent + reporting plan  
- `docs/DEPLOYED.md` — what is live  

---

*Last updated: planning shell for April 2026; finalize after backlog review completes.*
