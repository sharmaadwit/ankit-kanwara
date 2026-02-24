# Auth and Leaders spec (post-deploy)

**Goal:** Sales users login with email + password (like presales); remove free-for-all analytics; add Leaders (CXO) tier with all-region view and server-side cached, slice-and-dice analytics.

---

## 1. User categories (final)

| Category | Login | Data scope | Notes |
|----------|--------|------------|--------|
| **Presales** | Email + password (existing) | Full app: activities, accounts, reports, admin (if admin) | Unchanged. |
| **Sales users** | **Email + password** (new) | To be defined: e.g. view activities/accounts for their region or assigned accounts. | Remove “login free for all”; each sales user has credentials. |
| **Sales leaders** | Email + password (or shared link + PIN – TBD) | **One region only**; server-side cached data for that region. | Assigned in Admin → Sales Leaders (region → user). |
| **Leaders (CXO)** | Email-based (you add emails later) | **All regions**; same analytics view but with slice-and-dice. | New category; see all regional data; filters/drill-down. |

---

## 2. Sales users: email + password

- **Current:** Sales users might be “free for all” or shared link – to be removed.
- **Target:**
  - Sales users are stored (e.g. in System Users with role `sales` or in a dedicated Sales Users list that has login capability).
  - Login flow: same as presales – **email** (or username) + **password**.
  - Passwords hashed (e.g. bcrypt) and validated on server.
- **Implementation outline:**
  - Reuse or extend existing auth (e.g. `server/routes/auth.js`, presales user table or sales user table with password hash).
  - Add “Sales user” login tab or option: email + password; server validates against sales users (and optionally checks role).
  - Remove any “analytics style” shared-password or open link for sales.

---

## 3. Remove “login free for all”

- Identify current “free for all” or shared analytics login (e.g. single shared password).
- Remove or repurpose:
  - Either remove that flow entirely and replace with **Sales leader** and **Leader (CXO)** logins only, or
  - Keep one “viewer” link only for a specific use case, with clear scope (e.g. read-only, single region). Prefer removing it and using only authenticated roles above.

---

## 4. Leaders (CXO) – new category

- **Definition:** A separate role/category “Leaders” (CXO level).
- **Who:** You will add emails later (e.g. stored in config or Admin UI “Leaders” list).
- **Access:** Leaders see **all regional data** (not scoped to one region).
- **View:** “Analytics” view designed for Leaders:
  - Same or similar analytics content (reports, accounts interacted, etc.) but **aggregated across all regions**.
  - **Slice-and-dice** (see below) to filter and drill down.

---

## 5. Analytics view: who is logged in + server-side cache

- **Principle:** Analytics view is **not** “show all data to everyone”. It depends on **who is logged in**:
  - **Sales leader** (region-scoped):
    - Resolve their region from Admin → Sales Leaders (region → user).
    - **Server-side:** Cache analytics data **for that region only** (e.g. in-memory or Redis key `analytics:region:${regionId}` TTL 5–15 min).
    - **Client:** Request analytics for “my region”; server returns only that region’s data (and uses cache when possible).
  - **Leader (CXO):**
    - **Server-side:** Cache analytics for **all regions** (e.g. key `analytics:all` or per-region aggregated). TTL 5–15 min.
    - **Client:** Request “all regions” or “leader view”; server returns full dataset (from cache when possible).
  - **Presales (if allowed in analytics):** Either same as today (all data) or restrict to their default region; decide per product.

So:
- **Identify user** on each request (session / JWT / cookie).
- **Resolve role:** Presales / Sales user / Sales leader / Leader.
- **Resolve scope:** For sales leader → single region; for leader → all regions.
- **Cache key** = e.g. `analytics:${scope}:${month}` (scope = region id or `all`).
- **Return** only the data allowed for that scope.

---

## 6. Slice-and-dice for Leaders (suggestions)

Leaders need to filter and drill down without leaving the analytics view. Suggested controls and behaviour:

| Control | Purpose |
|--------|---------|
| **Region** | Filter to one or multiple regions (dropdown multi-select or “All”). |
| **Time period** | Month, quarter, or custom date range (already common; keep and expose clearly). |
| **Industry** | Filter by industry (e.g. BFSI, Retail). |
| **Activity type** | Filter by type (e.g. Customer Call, POC, SOW). |
| **Account / Account name search** | Show only accounts matching search or selected account. |
| **Presales rep** | Filter by presales user (who logged the activity). |
| **Export** | Export current slice (e.g. CSV or PDF) for the filtered dataset. |

**UX suggestions:**
- **Default:** “All regions”, “Last month” (or current month), no other filters – so Leaders see the big picture first.
- **Bar/chart clicks:** Clicking a bar (e.g. “India South”) could apply that as a filter (region = India South) and refresh the view.
- **Breadcrumb or chip filters:** Show active filters as chips; remove one to widen the slice.
- **Compare mode (optional):** Select two regions or two months and show side-by-side or delta.

**Back end:** Same analytics API with query params, e.g. `?region=India+South&month=2026-01&industry=BFSI`. Server builds the dataset for that slice and can cache per (region, month, industry) or similar key.

---

## 7. Implementation order (suggested)

1. **Auth**
   - Add Sales user login (email + password) and remove free-for-all.
   - Add “Leaders” list (emails) in Admin or config; add Leader role and login path (e.g. same login form, server resolves Presales vs Sales vs Sales leader vs Leader).
2. **Scoping and cache**
   - For each analytics request, resolve user → role → scope (one region vs all).
   - Implement server-side cache keyed by scope (and optionally month); return only data for that scope.
3. **Analytics UI**
   - Sales leader: no region selector (or show “Your region: X”); data from server for that region only.
   - Leader: add filters (region, time, industry, activity type, account/search, presales rep); wire to API params; show chips for active filters; optional export.
4. **Docs**
   - Update ANALYTICS_AND_REPORTS_PLAN.md and this spec once the above is implemented.

---

## 8. Open points

- **Sales user data scope:** When a “Sales user” (non-leader) logs in, do they see only their own accounts/activities, or their region, or something else? Define and then implement.
- **Sales leader login:** Same email/password as system user (from Sales Leaders assignment) or separate “sales leader” credentials? Recommendation: reuse system user credentials; “Sales leader” is just a role (assigned in Sales Leaders) that restricts analytics to one region.
- **Leaders list:** Stored in Admin UI (new “Leaders” section) vs config file. Recommendation: Admin UI “Leaders” section (list of emails) so you can add/remove without code deploy.

Once deploy is done, we can implement in this order and adjust from your side (e.g. which filters to ship first, exact UX for slice-and-dice).
