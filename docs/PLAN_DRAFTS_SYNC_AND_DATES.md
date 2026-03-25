# Plan: Drafts, sync state, dates, and local-store failsafe

## Your goals (as I understood)

1. **Drafts = only unsynced**  
   Keep all non-synced data in the draft section. Remove from drafts only when the server has accepted (200).

2. **Don’t say “submitted and synced” when it’s not**  
   Don’t show anything as submitted/synced until the server has actually accepted. Show unsynced / in-flight as “Processing” in drafts.

3. **Activities stored locally**  
   Non-synced data should appear as “stored locally” (e.g. in drafts as processing), not as “submitted and synced”.

4. **Date rule for migrated data**  
   If we don’t know the exact date from migrated data, use the **last date of the month** for the activity’s `date`. Remove the “legacy column” (need your confirmation on which column/field).

5. **Failsafe: store locally**  
   Option to “store all data locally” and show that in the draft section as “Local stored data – not submitted”.

---

## Clarifying questions

### 1. “Legacy column” – what exactly to remove?

- Do you mean:
  - **A)** The **`monthOfActivity`** field on activities (and we only use `date`, with `date` set to last day of month when unknown)?
  - **B)** A **UI column** in some table (e.g. “Legacy” or “Month of activity”) that we should stop showing?
  - **C)** Something else (e.g. a DB column or another field)?

Once we know, we can: (a) set `date` to last day of month for migrated when date is unknown, and (b) remove or stop using that legacy column/field everywhere.

### 2. When you say “all activities date will be last date of the month”

- Should this apply **only to migrated activities** where we don’t have a real date?
- Example: activity is “February 2026” but no exact day → set `date` to `2026-02-28` (or 29 in leap years)?
- For **new** (non-migrated) activities, we keep the actual chosen date, correct?

### 3. “Don’t say submitted and synced when it’s not”

- Today, after a successful save we show a toast like “Submitted successfully” and remove the draft. So we only remove when the server accepted.  
- Where are you still seeing “submitted and synced” when it’s not done?
  - In the **Activities list** (e.g. new activity shown there before server accepted)?
  - In **Drafts** (e.g. label saying “Synced” when it’s still processing)?
  - Somewhere else (e.g. export, report)?
- So we can: (1) only show “Submitted successfully” / “Synced” after a real 200, and (2) show “Processing” for anything we’ve sent but not yet confirmed.

### 4. “Non-synced data show in activities stored locally”

- Do you want:
  - **A)** A **separate block** in the Drafts view like “Activities stored locally (not submitted)” that lists activities that exist only locally / in drafts (and maybe in the outbox), with no “submitted/synced” until server accepts?
  - **B)** The **same** draft cards we have now, but we never label them “submitted and synced” until the server has accepted (and we might label them “Processing” while in flight)?
  - **C)** Both: keep current draft cards + add a dedicated “Local stored data” section for the failsafe export?

### 5. “Store locally” failsafe – exact behavior

- Should “Store locally”:
  - **A)** Download a **file** (e.g. JSON) of current activities (and optionally accounts, etc.) that the user can keep as backup?
  - **B)** Save a **copy inside the app** (e.g. a special draft or “local snapshot”) that appears in the Drafts section as “Local stored data – not submitted” and can be re-submitted later?
  - **C)** Both: save a snapshot in the app that shows in Drafts **and** offer a download?

---

## Proposed behavior (to confirm)

### Drafts and sync state

- **Draft section** shows:
  - **Processing** – we sent to server but not yet confirmed (e.g. request in flight, or in outbox for retry). No “submitted/synced” until we get 200.
  - **Failed / conflict** – server returned error (e.g. 409); message like “Submit again to merge.”
  - **Local only** – user chose “Store locally”; show as “Local stored data – not submitted.”
- **Remove from drafts** only when the server has accepted (200). No “submitted and synced” label anywhere until then.
- Optionally: in the main Activities list, show a small “Processing” badge on activities that are part of a draft/outbox not yet confirmed (if we can track that without big refactors).

### Dates (migrated)

- For **migrated** activities where we don’t have a proper date: set `date` to the **last day of that month** (e.g. `2026-02-28` or `2026-02-29`).
- Once we have that, we can **drop `monthOfActivity`** (or the legacy column you meant) and use only `date` for filtering/display, if you confirm that’s the “legacy” thing to remove.

### Local-store failsafe

- Add an action, e.g. **“Store all data locally”** (in Drafts or Settings).
- It creates a **local snapshot** (and optionally downloads a file).
- In Drafts, show a card: **“Local stored data – not submitted”** with options like “Submit to server” or “Download backup.”
- No “submitted/synced” for this until the user explicitly submits and the server returns 200.

---

## Next step

Once you answer the questions above (especially 1–2 and 4–5), we can lock the behavior and implement:

1. Draft/sync wording and when we remove drafts (only on server accept).
2. “Processing” and “Local stored” in the Drafts section.
3. Migrated dates = last day of month and removal of the legacy column/field.
4. “Store locally” failsafe and how it appears in Drafts.

If you prefer, we can implement the unambiguous parts first (e.g. date = last day of month, no “synced” until 200) and then refine the rest after your answers.
