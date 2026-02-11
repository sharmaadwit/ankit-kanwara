# Pilot Runbook - Concurrent Activity Submission

Purpose: Validate that concurrent internal/external submissions (including same-project submissions) do not cause silent data loss, and that conflicts are captured in Drafts / pending saves.

---

## 1) Scope

- Test type: multi-user concurrent writes.
- Focus:
  - External activity submissions.
  - Internal activity submissions.
  - Mixed internal + external submissions on the same account/project and close timestamps.
- Success criteria:
  - No silent overwrite/loss.
  - Conflicts produce `409` server conflict logs.
  - Conflict payloads are persisted in `pending_storage_saves`.
  - Users can recover/resubmit via Drafts.

---

## 2) Pre-Flight Checklist (10 min)

- Ensure latest deploy is live (`main`).
- Confirm users are logged in with normal credentials.
- Keep one admin open on:
  - Admin -> Storage Drafts / pending saves section.
  - Admin -> activity logs (optional).
- Optional DB access ready for quick SQL verification.

---

## 3) Test Matrix

### Scenario A - External same-project burst

- 3-5 users pick the same account + project.
- Submit external activities within the same 20-40 second window.
- Use varied activity types (customerCall, sow, poc, rfx, pricing).

Expected:
- Majority should save directly.
- Any collisions should create conflict logs and pending draft entries, not data loss.

### Scenario B - Internal burst

- 3-5 users submit internal activities in the same minute.
- Mix of types (enablement/video/etc.).

Expected:
- Saves are accepted or draft-conflict path triggers.
- No missing entries after refresh.

### Scenario C - Mixed internal/external + same project

- 2 users submit external to same project while 2-3 users submit internal entries.
- Repeat 2 rounds in quick succession.

Expected:
- Data remains consistent after refresh.
- Conflicts (if any) are recoverable from Drafts/pending saves.

### Scenario D - Draft recovery flow

- Intentionally trigger at least one conflict path.
- From Drafts:
  - Submit one-by-one.
  - Submit all.

Expected:
- Draft gets removed on success.
- If still failing, draft remains with error detail.

---

## 4) What to Watch in Logs

Filter server logs for these events:

- `storage_write`
- `storage_conflict`
- `storage_pending_draft_saved`
- `storage_pending_draft_failed`
- `storage_write_failed`
- `storage_request`
- `http_request` (status 409/500)

Important fields to inspect:

- `transactionId`
- `key` (`activities`, `internalActivities`, `accounts`)
- `username`
- `conditional`
- `ifMatch`
- `currentUpdatedAt`
- `incomingCount`, `currentCount` (for array payloads)
- `statusCode`

---

## 5) Quick Verification Queries (Optional)

```sql
-- How many pending conflict saves were captured?
SELECT COUNT(*) AS pending_conflicts
FROM pending_storage_saves
WHERE reason = 'conflict';
```

```sql
-- Latest pending conflicts
SELECT id, storage_key, username, reason, created_at
FROM pending_storage_saves
ORDER BY created_at DESC
LIMIT 100;
```

```sql
-- Check key update recency
SELECT key, updated_at
FROM storage
WHERE key IN ('activities', 'internalActivities', 'accounts')
ORDER BY updated_at DESC;
```

---

## 6) Pilot Sign-Off Criteria

Mark pilot as PASS when all are true:

- No reports of "saved but disappeared".
- All conflicts visible in logs and/or pending saves.
- Draft retry flow successfully restores failed submissions.
- No sustained `500` write errors in storage routes.
- Team confirms same-project concurrency behavior is acceptable.

---

## 7) Post-Pilot Notes Template

- Date/time window:
- Number of testers:
- Approx writes attempted:
- Conflicts observed:
- Pending saves observed:
- Draft recoveries performed:
- Any missing data incidents:
- Decision: PASS / PASS WITH ACTIONS / FAIL
- Follow-up actions:
