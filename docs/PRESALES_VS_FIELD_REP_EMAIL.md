# Presales user vs field sales rep (two email columns)

## Do not cross-map

| Column | Storage / CSV | Meaning | Region source |
|--------|----------------|---------|----------------|
| **Presales user** | `assignedUserEmail`, `userName`; migration CSV **Presales Username** | Who **logged** the activity (Ankit, Kathyayani, …) | PreSight **Users** (`email` → `defaultRegion`) + confirmed manual list |
| **Field sales rep** | `salesRep`, `salesRepEmail`; CSV **Sales Rep Name** | Account owner on the deal (Fernando, Bittu, …) | **globalSalesReps** / account fields — separate |

Region cleanup for reporting only updates **`salesRepRegion`** on activities from the **presales logger** column. It does **not** change `salesRep` / `salesRepEmail` and does **not** use the field-rep roster for that pass.

## Annual report only (separate)

Extra presales → region overrides used **only** when patching `migration_draft_activities:*` and `migration_confirmed_activities:*` (Annual report PDF). Live `activities:*` shards are not changed.

- `server/scripts/lib/annualReportPresalesRegions.js` — Matheus (LATAM), Gourav (India North), Saurabh (Africa & Europe), Adwit (ROW), Samrudha (India West by username)
- `server/scripts/region-cleanup-apply-annual-remote.js` — apply script
- GitHub Actions: **Annual report region apply (migration only)**

## Scripts

- `server/scripts/lib/manualPresalesRegionByEmail.js` — core presales-only map (Users sync)
- `server/scripts/region-cleanup-dryrun-remote.js` — dry-run all buckets
