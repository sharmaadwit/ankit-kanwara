# Super Agent → PreSight import API

Third-party systems (**Super Agent**) can submit activity rows as **JSON** or **CSV** (same semantics as the in-app **Import Activities** / `bulkImport.js` templates). Writes go to the same storage as the UI: `accounts`, `activities`, and `internalActivities`.

## Enablement

1. **Admin → Configuration → Feature flags** — turn on **Super Agent import API** (`superAgentImport`).  
2. Optional ops override (staging only): set `SUPER_AGENT_API_FORCE_ENABLED=true`.  
3. **API key (recommended in production):** set `SUPER_AGENT_API_KEY` (or reuse `STORAGE_API_KEY` only if `SUPER_AGENT_API_KEY` is unset). The server compares the header **exactly** to that value (after trim). Send header **`X-Api-Key`** with the key as the value; avoid query-string `api_key` if the key contains `#`. `Authorization: Bearer` is **not** used for this route.

## Base URL

All routes are under:

`POST /api/integrations/super-agent/import/dry-run`  
`POST /api/integrations/super-agent/import/commit`

No session cookie is required when using the API key.

## Request body (JSON)

Provide **either**:

- **`rows`** — array of objects (see field names below), or  
- **`csv`** — string of CSV text (header row + data rows; same columns as PreSight templates).

Optional: **`categoryHint`** — `"internal"` or `"external"` when rows omit category.

Limits: **500 rows** per request (`MAX_ROWS` in `server/services/superAgentImport.js`).

### Field mapping (JSON `rows`)

Use camelCase or the same names as CSV headers. Typical external row:

| Field | Required | Notes |
|--------|------------|--------|
| `category` | Yes | `internal` or `external` |
| `date` | Yes | Parsed as ISO/date string (2020–2050 for stored activities) |
| `user` / `presalesUsername` | Yes | Must match an **active** presales user: **username** or **email** (case-insensitive). Roster comes from the PostgreSQL **`users`** table when it has active rows; otherwise from storage key `users` (legacy). |
| `activityType` | Yes | e.g. `Customer Call`, `SOW`, `POC`, `RFx`, `Pricing` |
| `account` / `accountName` | Yes (API) | Both account and project required; no “map after upload” in API |
| `project` / `projectName` | Yes (API) | |
| `description` | For Customer Call | Required for `Customer Call` |

Internal rows: `activityType`, optional `timeSpentType` / `timeSpentValue`, `internalActivityName`, `internalTopic`, `internalDescription` (same as templates).

## Dry-run

`POST .../dry-run`  
`Content-Type: application/json`

**Response 200:**

```json
{
  "ok": true,
  "summary": {
    "totalRows": 1,
    "externalCount": 1,
    "internalCount": 0,
    "readyCount": 1,
    "errorCount": 0,
    "duplicateCount": 0,
    "needsMappingCount": 0
  },
  "rowResults": [
    { "row": 2, "status": "ready", "category": "external", "duplicate": false, "messages": [] }
  ],
  "errors": []
}
```

Row index **`row`** is 1-based line number in the logical file (header is row 1; first data row is **2**).

## Commit

`POST .../commit`  
`Content-Type: application/json`

**Idempotency / batch id (required):** send the same value on every retry for one logical import:

- Header **`Idempotency-Key`** or **`X-Batch-Id`**, or  
- Body **`batch_id`**

Format: `/^[a-zA-Z0-9:_.-]{1,120}$/`

**Behavior:**

- Only rows with **`status: ready`** and not flagged duplicate are written.  
- Activity ids are deterministic: `sa:<batch_id>:0`, `sa:<batch_id>:1`, … so safe retries merge by id.  
- After a **successful** full commit, the same `batch_id` returns **`idempotent: true`** with the stored summary (no duplicate inserts).

**Response 200 (success):**

```json
{
  "ok": true,
  "idempotent": false,
  "batch_id": "my-batch-001",
  "externalCount": 1,
  "internalCount": 0,
  "createdAccounts": 1,
  "createdProjects": 0,
  "activityIds": ["sa:my-batch-001:0"],
  "summary": { ... }
}
```

External activities get `source: "super_agent"`.

## Error codes (JSON body)

| HTTP | `code` | Meaning |
|------|--------|---------|
| 403 | `SUPER_AGENT_DISABLED` | Feature flag off |
| 401 | `UNAUTHORIZED` | Wrong/missing API key |
| 400 | `BAD_BATCH_ID` | Missing/invalid batch id (commit) |
| 400 | `ROW_LIMIT` | Too many rows |
| 400 | `NOTHING_TO_COMMIT` | No ready rows |
| 400 | `VALIDATION` / `ACTIVITY_VALIDATION` / `APPEND_FAILED` | Storage/activity validation |

## Storage note

Idempotency metadata is kept in storage key **`super_agent_import_idempotency`** (JSON map, last 500 batch ids). Safe to leave in place; do not clear unless you accept duplicate risk for reused `batch_id` values.

## Related code

- Routes: `server/routes/superAgentImport.js`  
- Logic: `server/services/superAgentImport.js`  
- Feature flag defaults: `server/services/featureFlags.js`, `server/services/appConfig.js`  
- UI reference: `pams-app/js/bulkImport.js`
