# Annual user activity export (1 July → today)

Pulls **all presales activities**, filters by date, and aggregates **per user**.

Default window: **1 July** of the current “annual” year through **today** (UTC).  
Example: in May 2026 → `2025-07-01` … `2026-05-19`.

## API (deploy first)

**Auth:** same as storage — `X-Api-Key` (or `?apiKey=`), `X-Admin-User`, or logged-in session.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/annual-user-activity/schema` | Formats, defaults, auth hint (no data load) |
| GET | `/api/export/annual-user-activity` | Full export (see `format` below) |

**Query parameters**

| Param | Default | Values |
|-------|---------|--------|
| `from` | 1 Jul (annual year) | `YYYY-MM-DD` |
| `to` | today (UTC) | `YYYY-MM-DD` |
| `format` | `json` | `json`, `bundle`, `summary-csv`, `detail-csv` |

**Examples**

```bash
# Discover defaults
curl -H "X-Api-Key: YOUR_KEY" \
  "https://ankit-kanwara-production.up.railway.app/api/export/annual-user-activity/schema"

# Full JSON
curl -H "X-Api-Key: YOUR_KEY" \
  "https://ankit-kanwara-production.up.railway.app/api/export/annual-user-activity?from=2025-07-01&to=2026-05-19"

# Per-user CSV download
curl -H "X-Api-Key: YOUR_KEY" \
  "https://ankit-kanwara-production.up.railway.app/api/export/annual-user-activity?format=summary-csv" \
  -o annual-summary.csv
```

On Railway the API reads **Postgres storage** directly (`activities` + `activities:YYYY-MM` shards). Locally without DB it can fall back to `REMOTE_STORAGE_*` env vars.

Rate limit: **20 requests / 15 min** per IP (`RATE_LIMIT_EXPORT_MAX` to override).

## One-time download (CLI)

In `Project PAT`, set in `.env`:

```env
REMOTE_STORAGE_BASE=https://ankit-kanwara-production.up.railway.app/api/storage
REMOTE_STORAGE_USER=your-admin-email@company.com
STORAGE_API_KEY=your-production-api-key
```

Optional:

```env
ANNUAL_EXPORT_FROM=2025-07-01
ANNUAL_EXPORT_TO=2026-05-19
ANNUAL_EXPORT_DIR=exports
```

Run:

```bash
npm run export:annual-users
```

Outputs under `exports/`:

| File | Contents |
|------|----------|
| `annual-user-activity-<from>_to_<to>.json` | Full bundle (meta + summary + every activity row) |
| `annual-user-activity-summary-*.csv` | One row per user (totals by type) |
| `annual-user-activity-detail-*.csv` | One row per activity |

## Share via API (after deploy)

Same auth as storage: **session**, `X-Admin-User`, or `X-Api-Key` / `?apiKey=` (= `STORAGE_API_KEY`).

| Request | Response |
|---------|----------|
| `GET /api/export/annual-user-activity` | JSON (default) |
| `GET /api/export/annual-user-activity?format=summary-csv` | CSV download (per user) |
| `GET /api/export/annual-user-activity?format=detail-csv` | CSV download (all activities) |
| `GET /api/export/annual-user-activity?format=bundle` | JSON with meta + data + CSV URLs |
| `?from=2025-07-01&to=2026-05-19` | Override date range |

Example:

```bash
curl -H "X-Api-Key: YOUR_KEY" \
  "https://ankit-kanwara-production.up.railway.app/api/export/annual-user-activity?format=summary-csv" \
  -o annual-summary.csv
```

## Notes

- Activities are read from storage keys `activities` and `activities:YYYY-MM` (deduped by activity id).
- Users with **zero** activities in range still appear if they exist in the `users` storage key.
- Deploy the API routes to production before external consumers can call them.
