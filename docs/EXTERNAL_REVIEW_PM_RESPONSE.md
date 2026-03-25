# PM Response to External Product & Data Review

This document is the Product Manager’s response to the **PAMS Application - Comprehensive Product & Data Review** (Data Integrity / Architecture / PM analysis). It states what we agree with, where we differ, and how the roadmap is updated.

---

## 1. What we agree with

- **Key–value JSON blobs are a structural risk.** No referential integrity (orphaned accounts/projects/activities), full-doc read–modify–write concurrency risk, and scaling/OOM risk as data grows. The review is right that “optimising” the current store (P-008, P-009) mitigates symptoms but does not fix the underlying model.
- **Normalization is the right long-term direction.** Moving `activities`, `accounts`, `projects` (and related) into proper PostgreSQL tables with FKs, constraints, and indexes is the correct target state.
- **Server-side validation is missing.** Client-sent JSON is trusted too much; we need server-side checks (e.g. enablement duration bounds, valid timestamps, required fields). Malformed or malicious payloads can corrupt a key.
- **P-025 (Gemini note upload) should stay behind data hardening.** AI-assisted logging on a fragile schema can increase bad data; we keep it in Phase 5 and after we’ve improved validation and/or started normalization.
- **The suggested new features are high value.** Utilization heatmap, win/loss correlation, stale-account nudges, and data-quality score are all aligned with “proactive insights” and are added to the roadmap (F-015–F-018).

---

## 2. Where we take a different balance (for now)

- **We do not “halt” feature work.** The system is live, with backups, draft/conflict handling, and known limits. We will:
  - **Continue** Phase 1–2 (SFDC wins upload, cookie-only auth, draft UX, month-scoped API, migration runbook) because they deliver immediate value and some (e.g. month-scoped reads) reduce load and risk.
  - **Add** server-side validation and schema checks as a dedicated track (**D-001**).
  - **Plan** a **Data Normalization Migration** as a strategic initiative (**D-002**), sequenced after Phase 2, then execute in a controlled way (dual-write, cutover, deprecate blobs).
- **P-024 Option A (admin upload Excel).** We keep it as the first step: simple, no SFDC API dependency, fits Railway. We will add **column mapping validation**, **preview before apply**, and **clear error messages** to reduce wrong-column/mapping failures; Option B/C (scheduled job or SFDC API) can follow later.

---

## 3. Conclusion

The review is correct that the current data model is technical debt. We treat **normalization as a strategic initiative** and add it to the roadmap with a clear phase, while continuing to ship high-value features and hardening (validation, month-scoped API, draft UX) so we don’t build on sand in the meantime.

See **PAMS_FEATURE_UPDATE_PRESALES_EXPERT_REVIEW.md** for: §4.1.3 (new features from review), §4.7 (Architecture & data: D-001, D-002), and §6 (roadmap phases including normalization).
