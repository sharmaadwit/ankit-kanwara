# Presales user vs field sales rep (two email columns)

## Do not cross-map

| Column | Storage / CSV | Meaning | Region source |
|--------|----------------|---------|----------------|
| **Presales user** | `assignedUserEmail`, `userName`; migration CSV **Presales Username** | Who **logged** the activity (Ankit, Kathyayani, …) | PreSight **Users** (`email` → `defaultRegion`) + confirmed manual list |
| **Field sales rep** | `salesRep`, `salesRepEmail`; CSV **Sales Rep Name** | Account owner on the deal (Fernando, Bittu, …) | **globalSalesReps** / account fields — separate |

Region cleanup for reporting only updates **`salesRepRegion`** on activities from the **presales logger** column. It does **not** change `salesRep` / `salesRepEmail` and does **not** use the field-rep roster for that pass.

## Scripts

- `server/scripts/lib/manualPresalesRegionByEmail.js` — presales-only map
- `server/scripts/region-cleanup-dryrun-remote.js` — dry-run / apply via storage API
