# Pricing Calculator Integration

This document describes the integration between the **pricing-calc** app ([sharmaadwit/pricing-calc](https://github.com/sharmaadwit/pricing-calc)) and the Project PAT (PAMS) server.

## Who stores what / direction of flow

- **PAMS stores the pricing calculations** and **logs each one as a pricing activity** in the same activities list as SOW, POC, RFx, Customer Call, etc.
- **Pricing-calc does not store PAMS activities**; it only sends a single POST to PAMS with the calculation payload. PAMS then:
  1. Saves the full payload into the **`pricing_calculations`** table (for audit, analytics, and retrieval).
  2. Creates a **pricing activity** in the **activities** storage so it appears in PAMS dashboards and reports.

So: **pricing-calc → PAMS**. One POST from pricing-calc results in both a stored calculation and a visible “Pricing” activity in PAMS. Pricing is treated as part of the same flow as other presales activities.

---

## 1. Endpoint design

Base path: **`/api/pricing-calculations`**

### POST — Ingest a calculation

**`POST /api/pricing-calculations`**

- **Headers:** `Content-Type: application/json`. If `PRICING_CALC_API_KEY` (or `STORAGE_API_KEY`) is set, also send `X-Api-Key: <key>`.
- **Body:** Full payload from the pricing-calc results page (JSON). Upsert by `calculation_id`. The server also creates a **pricing activity** in PAMS (same list as SOW, POC, etc.) linked to this calculation.

**Required:**

- `calculation_id` (string) — e.g. `PLAIN-JANE-CHAI-...` or UUID.

**Recommended:**

- `user_email`, `created_at`, `country`, `channel_type`, `currency_symbol`
- `inputs`, `results`, `voice_pricing`, `final_price_details`, `manday_breakdown`, `text_manday_breakdown`, `total_mandays`, `dev_cost_breakdown`

**Optional (for activity linking in PAMS):**

- `account_id`, `account_name` — PAMS account (see “Linking” below).
- `project_id`, `project_name` — PAMS project under that account.
- `sales_rep_email`, `sales_rep`, `sales_rep_region` — presales rep (email is the key).
- `industry` — industry on the activity.

**Example body:**

```json
{
  "calculation_id": "PLAIN-JANE-CHAI-A1B2C3D4",
  "user_email": "user@company.com",
  "created_at": "2026-03-09T12:34:56Z",
  "country": "India",
  "channel_type": "text_voice",
  "inputs": { ... },
  "results": { ... },
  "voice_pricing": { ... },
  "final_price_details": { ... },
  "manday_breakdown": { ... },
  "text_manday_breakdown": { ... },
  "total_mandays": 24.4,
  "dev_cost_breakdown": { ... },
  "currency_symbol": "₹"
}
```

**Response (200):**

```json
{
  "ok": true,
  "id": "<uuid>",
  "calculation_id": "PLAIN-JANE-CHAI-A1B2C3D4",
  "created_at": "...",
  "updated_at": "...",
  "activity_id": "pricing_calc:PLAIN-JANE-CHAI-A1B2C3D4"
}
```

The `activity_id` is the id of the pricing activity created in PAMS (stored under the `activities` key). It is prefixed with `pricing_calc:` so it can be linked back to the calculation.

---

### GET — Retrieve one calculation

**`GET /api/pricing-calculations/:calculation_id`**

Returns the full stored payload for that `calculation_id`.

**Response (200):** Single object with `ok: true`, plus all stored fields (e.g. `calculation_id`, `user_email`, `country`, `channel_type`, `created_at`, `updated_at`, and the full `payload` merged at top level).

**Response (404):** `{ "ok": false, "error": "Calculation not found" }`

---

### GET — List calculations

**`GET /api/pricing-calculations`**

**Query params (all optional):**

| Param          | Description                    |
|----------------|--------------------------------|
| `user_email`   | Filter by user email           |
| `country`      | Filter by country              |
| `channel_type` | Filter by channel type         |
| `from`         | Date range start (ISO string)  |
| `to`           | Date range end (ISO string)    |
| `limit`        | Page size (default 50, max 500) |
| `offset`       | Pagination offset (default 0) |

**Response (200):**

```json
{
  "ok": true,
  "total": 100,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": "<uuid>",
      "calculation_id": "...",
      "user_email": "...",
      "country": "...",
      "channel_type": "...",
      "created_at": "...",
      "updated_at": "...",
      "total_mandays": 24.4,
      "voice_mandays": 2.0,
      "text_mandays": 22.4,
      "total_invoice": 12345.67
    }
  ]
}
```

---

## 2. Feature flag (Admin) — required to use the API

**Deployment:** Pushing code to your host (e.g. Railway) is separate from turning the feature on. After deploy, enable the flag below or the API stays **disabled** (403).

- **Default:** **off** — every route under `/api/pricing-calculations` returns **403** with `{ "code": "PRICING_CALC_DISABLED", ... }`.
- **Enable (recommended):** **Admin** → **Feature flags** → turn on **Pricing calculator sync** (`pricingCalculatorSync` in storage). This also controls the **Pricing** section on the dashboard (same flag).
- **Ops override (optional):** set environment variable **`PRICING_CALC_API_FORCE_ENABLED=true`** to enable the API without the Admin toggle (use for staging or emergencies only).

---

## 3. Auth

- If **`PRICING_CALC_API_KEY`** (or **`STORAGE_API_KEY`**) is set in the server env, all three endpoints require:
  - Header: **`X-Api-Key: <key>`**, or
  - Query: **`api_key=<key>`** or **`apiKey=<key>`**
- If neither env var is set, the endpoints are open (no auth). For production, set a key.

---

## 4. DB table: `pricing_calculations`

| Column          | Type         | Description                          |
|-----------------|--------------|--------------------------------------|
| `id`            | UUID (PK)    | Internal id                          |
| `calculation_id`| TEXT (unique)| External id from pricing-calc        |
| `user_email`    | TEXT         | Indexed                              |
| `country`       | TEXT         | Indexed                              |
| `channel_type`  | TEXT         | Indexed                              |
| `created_at`    | TIMESTAMPTZ  | Indexed (DESC)                       |
| `updated_at`    | TIMESTAMPTZ  | Set on upsert                        |
| `payload`       | JSONB        | Full request body / results state    |
| `total_mandays` | NUMERIC     | Extracted for reporting              |
| `voice_mandays` | NUMERIC     | From `voice_pricing.voice_mandays`   |
| `text_mandays`  | NUMERIC     | From payload                         |
| `total_invoice` | NUMERIC     | From `final_price_details`           |

The table is created automatically on server startup via `db.initDb()`.

---

## 5. What the pricing-calc app should send (minimal)

**Required:** `calculation_id`, `user_email`, `inputs`, `results`  
**Recommended:** `created_at`, `country`, `channel_type`, `currency_symbol`, `final_price_details`, `manday_breakdown`, `voice_pricing`, `dev_cost_breakdown`  
**Optional (activity linking):** `account_id`, `account_name`, `project_id`, `project_name`  
**Optional:** Any extra analytics or funnel metadata.

The server stores the **entire body** in `pricing_calculations.payload` and also creates a **pricing activity** with `type: 'pricing'` and `details.calculationId` set to `calculation_id`. If you send the optional linking fields below, the activity will be linked to that account, project, and presales rep in PAMS.

---

## 6. Linking presales rep / account / project to the activity

The created pricing activity is linked in PAMS using the same identifiers the PAMS UI uses. Send these in the POST body when you know them:

| POST body key | PAMS activity field | Meaning |
|---------------|---------------------|--------|
| **`account_id`** | `accountId` | **Key for account.** PAMS internal id of the account (from PAMS accounts list). Opaque string, e.g. from `DataManager.generateId()` when the account was created. Must match an existing account id in PAMS. |
| **`account_name`** | `accountName` | Display name of the account (for show in the activity row). |
| **`project_id`** | `projectId` | **Key for project.** PAMS internal id of the project under that account. Must be a project that belongs to the account identified by `account_id`. |
| **`project_name`** | `projectName` | Display name of the project. |
| **`sales_rep_email`** | `salesRepEmail` | **Key for presales rep.** Email of the presales rep in PAMS (same value as in the “Sales rep” dropdown). Used to match the rep when the activity is shown/edited. |
| **`sales_rep`** | `salesRep` | Display name of the presales rep (optional but useful for display). |
| **`sales_rep_region`** | `salesRepRegion` | Region name (e.g. for the rep dropdown). |
| **`industry`** | `industry` | Industry string on the activity. |

**Where the IDs come from**

- **Account ID / Project ID:** In PAMS, accounts and projects are stored in the `accounts` storage key. Each account has an `id`; each project under that account has its own `id`. To link a pricing activity to an account/project, pricing-calc (or the caller) must obtain these ids from PAMS (e.g. from the PAMS UI when the user picks account/project, or from a PAMS API that returns accounts/projects). There is no separate “external” key—the **key is the PAMS internal id**.
- **Sales rep:** The **key is the rep’s email** (`sales_rep_email`). PAMS matches activities to reps by that email (and optionally region). The list of reps comes from PAMS config / users.

**Example (minimal link by account + rep):**

```json
{
  "calculation_id": "PLAIN-JANE-CHAI-A1B2C3D4",
  "user_email": "user@company.com",
  "account_id": "abc123-internal-pams-account-id",
  "account_name": "Acme Corp",
  "sales_rep_email": "rep@company.com",
  "sales_rep": "Jane Doe",
  "sales_rep_region": "North"
}
```

If `account_id` / `project_id` are omitted, the activity is created without account/project; a user can later edit the activity in PAMS and assign account and project. If `sales_rep_email` is omitted, the activity is created without a rep and can be assigned in PAMS later.

---

## 7. Flow (current: draft-based when API has no account info)

1. User completes a calculation in **pricing-calc** (results page).
2. Pricing-calc (backend or frontend) sends **one POST** to  
   `https://<pams-server>/api/pricing-calculations`  
   with the full results payload.
3. **PAMS** then:
   - Upserts the payload into the **`pricing_calculations`** table.
   - Appends a **pricing activity** to the **activities** list (same list as SOW, POC, RFx, etc.).
4. The new pricing activity appears in PAMS dashboards and reports like any other activity; users can filter by type “Pricing” and, if needed, open the linked calculation via `details.calculationId` or the `pricing_calc:<id>` activity id.

---

## 8. CORS

Ensure the PAT server’s `CORS_ALLOW_ORIGINS` (or `APP_PUBLIC_URL`) includes the origin of the pricing-calc app if it calls the API from the browser. For server-to-server calls from pricing-calc backend, CORS is not required.
