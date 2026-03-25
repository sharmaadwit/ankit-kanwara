# Migrated data retention

Migration mode is **deprecated and disabled**, but **migrated data must not be lost** until you have finished data retention. After that you can remove the feature and optionally clear the keys.

---

## Where migrated data lives

All migrated data is in the **`storage`** table under keys that start with `migration_`:

| Key pattern | Content |
|-------------|--------|
| `migration_draft_meta` | Draft migration metadata |
| `migration_draft_accounts` | Draft accounts from migration |
| `migration_draft_internalActivities` | Draft internal activities |
| `migration_draft_activities:YYYY-MM` | Draft activities per month |
| `migration_confirmed_meta` | Confirmed migration metadata |
| `migration_confirmed_accounts` | Confirmed accounts |
| `migration_confirmed_internalActivities` | Confirmed internal activities |
| `migration_confirmed_activities:YYYY-MM` | Confirmed activities per month |
| `migration_wins` | Wins data (e.g. from 2025 Wins with SFDC) |
| `migration_presales_data` | Presales data if loaded |

---

## Protection

- **DELETE `/api/storage/:key`**  
  If `key` starts with `migration_`, the API returns **403** and does not delete. This prevents accidental removal of migrated data.

- **Backups**  
  Your usual storage backup (e.g. snapshot or daily backup) includes these keys. Ensure backups run and are kept until retention is done.

- **Cleanup scripts**  
  Scripts that delete from `storage` by key (e.g. admin tools) should **not** delete keys matching `migration_*` until you have finished retention.

---

## When retention is done

1. Export or back up any migrated data you need (e.g. run a snapshot that includes `migration_*` keys).
2. Disable/remove the migration feature (UI and API are already deprecated).
3. Optionally delete the migration keys (e.g. via a one-off script or DB), or leave them; they are no longer used by the app.

---

*Last updated when migration was deprecated and migration keys were protected from API delete.*
