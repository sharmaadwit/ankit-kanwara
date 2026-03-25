# Deprecations and logging

## Migrated data (must not be lost)

Migration mode is off, but **migrated data is retained** until you finish data retention. Do not delete storage keys that start with `migration_`. The API blocks `DELETE /api/storage/migration_*`. See **`docs/MIGRATED_DATA_RETENTION.md`** for key list and when it’s safe to remove.

---

## Deprecated (removed for now)

### Server-side pending drafts (“All drafts” / Lost & Found on 409)

- **Status:** Deprecated. No new entries are written.
- **What changed:** On 409 conflict we no longer store the rejected payload in `pending_storage_saves`. Conflict submissions are recorded in **Activity submission log** (Admin → Activity submission log) with full payload and outcome.
- **API:** `savePendingDraft` is a no-op. `GET /api/storage/pending` and `DELETE /api/storage/pending/:id` still work so you can list and delete **existing** rows; the GET response includes `_deprecated: true` and a message.
- **Admin UI:** “All drafts” is labelled deprecated. Use **Activity submission log** to see and recover from conflicts.
- **Table:** `pending_storage_saves` is not dropped; retention/cleanup can still prune old rows. New conflicts are not inserted.

### Migration mode

- **Status:** Deprecated. Migration mode is disabled.
- **UI:** Migration nav item is hidden. Migration dashboard view is not reachable. Feature flag "Migration Mode" in Configuration is labelled deprecated and cannot be turned on.
- **API:** All `GET/POST /api/migration/*` routes return **410 Gone** with `{ deprecated: true, message: 'Migration API is deprecated and disabled.' }`.
- **Config:** Server always returns `featureFlags.migrationMode: false` regardless of stored value.
- **Re-enable later:** To bring migration back, remove the 410 middleware in `server/routes/migration.js`, restore the Migration nav item and `isMigrationMode()` logic, and stop forcing `migrationMode: false` in `server/services/appConfig.js` and client.

---

## Logging

- **LOG_LEVEL** (env): `error` | `warn` | `info` (default). Only events at or above this level are logged. Set to `warn` or `error` to reduce log volume.
- **Health checks:** `GET /api/health` (and `?deep=...`) is not logged to avoid noise from load balancers and Railway.
- **Other:** All other requests are logged at `info` (success), `warn` (4xx), or `error` (5xx) subject to LOG_LEVEL.

---

*Last updated when server-side pending drafts were deprecated in favour of Activity submission log.*
