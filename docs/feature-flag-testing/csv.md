# Testing: CSV import & export (single admin toggle)

## What it controls

One row: **CSV import & export**. It updates:

| Key | Role |
|-----|------|
| `csvImport` | Bulk import + **Import Activities** visibility (sidebar / nav) |
| `csvExport` | CSV export actions in **Reports** |

**Enabled** only shows when **both** flags are on and import visibility is on (same as the single select).

## How to verify

1. **On:** Import visible; Reports CSV export available (where implemented).
2. **Off:** Import hidden; export gated off.

## Import templates

- External template sample **Account Name** / **Project Name** use your first real account+project when data exists.
- **Download accounts & projects** lists all pairs for copy/paste (plain CSV — no Excel dropdowns).
- You can leave **both** Account and Project blank in the CSV, run dry-run, then use **Link account & project** (dropdowns on Import Activities) before commit—similar to linking pricing after sync.

See also: [csv-import.md](./csv-import.md) and [csv-export.md](./csv-export.md) (short redirects).
