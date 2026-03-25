# Testing: Admin monthly CSV export (`adminCsvExport`)

## What it controls

- **Feature flag:** `adminCsvExport` — admin-only monthly analytics CSV snapshot (System Admin / Configuration export UI).

## How to enable

1. **Configuration → Feature Flags** → **Admin Monthly Export** on.

## How to verify (enabled)

1. As admin, open the section that offers **monthly** / admin CSV export (e.g. Configuration → **Export** or System Admin equivalent).
2. Card or toolbar for that export is visible; download succeeds.

## How to verify (disabled)

1. Admin export card (`data-feature="adminCsvExport"` where used) is **not** shown in the DOM as usable chrome — hidden, not merely disabled.

## Note

Does not affect end-user **Reports** CSV (`csvExport`).
