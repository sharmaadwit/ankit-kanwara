# Database Schema Documentation

## Overview

PAMS uses PostgreSQL with a hybrid model: (1) **Key-value:** the `storage` table holds most application data (users, accounts, activities, etc.) as JSON; (2) **Normalized tables:** `users`, `sessions` (auth), `login_logs`, `activity_logs` (audit), `storage_history`, `pending_storage_saves`, `storage_mutations` (storage support), and `pricing_calculations` (calculator audit). See `docs/ARCHITECTURE_AND_OPTIMIZATION_MEMO.md` for retention and cleanup.

---

## Tables

### 1. `storage` Table

**Purpose:** Key-value store for all application data (users, accounts, activities, config, etc.)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS storage (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | TEXT | PRIMARY KEY | Unique identifier for the data entry |
| `value` | TEXT | NOT NULL | JSON string containing the actual data (may be compressed with LZString) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of last update |

**Unique Keys:**
- **PRIMARY KEY:** `key` (TEXT)

**Indexes:**
- None (key is primary key, automatically indexed)

**Storage Keys (Examples):**
- `users` - Array of user objects
- `accounts` - Array of account objects
- `activities` - Array of external activity objects
- `internalActivities` - Array of internal activity objects
- `globalSalesReps` - Array of sales rep objects
- `industries` - Array of industry strings
- `regions` - Array of region strings
- `presalesActivityTarget` - Target configuration object
- `analyticsAccessConfig` - Analytics password configuration
- `featureFlags` - Feature flag configuration
- `dashboardVisibility` - Dashboard visibility settings
- `storage:manifest` - Manifest for bucket-based storage (if used)
- `storage:bucket:{bucketId}` - Bucket data (if bucket storage is used)

**Data Format:**
- Values are stored as JSON strings
- May be compressed with LZString (prefixed with `__lz__`)
- May be compressed with GZIP (prefixed with `__gz__`)

---

### 2. `login_logs` Table

**Purpose:** Audit log for all login attempts (successful and failed)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    username TEXT,
    status TEXT NOT NULL,
    message TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE login_logs
ADD COLUMN IF NOT EXISTS transaction_id TEXT;
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| `username` | TEXT | NULL | Username attempted (may be null for analytics access) |
| `status` | TEXT | NOT NULL | Login status: 'success' or 'failure' |
| `message` | TEXT | NULL | Additional message/error description |
| `user_agent` | TEXT | NULL | Browser user agent string |
| `ip_address` | TEXT | NULL | Client IP address |
| `transaction_id` | TEXT | NULL | Optional transaction identifier |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of login attempt |

**Unique Keys:**
- **PRIMARY KEY:** `id` (SERIAL)

**Indexes:**
- `idx_login_logs_created_at` - Index on `created_at DESC` for efficient time-based queries

**Example Data:**
```json
{
  "id": 1,
  "username": "john.doe",
  "status": "success",
  "message": "Login successful",
  "user_agent": "Mozilla/5.0...",
  "ip_address": "192.168.1.1",
  "transaction_id": null,
  "created_at": "2026-01-23T10:30:00Z"
}
```

---

### 3. `activity_logs` Table

**Purpose:** Audit log for user actions and system events

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    username TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    detail JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS transaction_id TEXT;
```

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| `username` | TEXT | NULL | Username who performed the action |
| `action` | TEXT | NOT NULL | Action type (e.g., 'auth.login', 'activity.create', 'account.update') |
| `entity` | TEXT | NULL | Entity type (e.g., 'user', 'activity', 'account') |
| `entity_id` | TEXT | NULL | ID of the affected entity |
| `detail` | JSONB | NULL | Additional details as JSON object |
| `ip_address` | TEXT | NULL | Client IP address |
| `transaction_id` | TEXT | NULL | Optional transaction identifier |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of the action |

**Unique Keys:**
- **PRIMARY KEY:** `id` (SERIAL)

**Indexes:**
- `idx_activity_logs_created_at` - Index on `created_at DESC` for efficient time-based queries

**Example Data:**
```json
{
  "id": 1,
  "username": "john.doe",
  "action": "activity.create",
  "entity": "activity",
  "entity_id": "act-123",
  "detail": {
    "type": "customerCall",
    "accountId": "acc-456"
  },
  "ip_address": "192.168.1.1",
  "transaction_id": null,
  "created_at": "2026-01-23T10:30:00Z"
}
```

---

### 4. `storage_history` Table

**Purpose:** Archive of previous values before each overwrite of a storage key (“insurance” for recovery). Every PUT (except `migration_*` keys) inserts the current value here before updating `storage`.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS storage_history (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_storage_history_key_archived
  ON storage_history (key, archived_at DESC);
```

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `key` | TEXT | Storage key that was overwritten |
| `value` | TEXT | Previous value (may be compressed) |
| `updated_at` | TIMESTAMPTZ | Previous row’s updated_at |
| `archived_at` | TIMESTAMPTZ | When this archive row was created |

**Retention:** Use `POST /api/admin/cleanup` or env `STORAGE_HISTORY_RETENTION_DAYS` (default 90). Run regularly to keep Railway lean.

---

### 5. `pending_storage_saves` Table

**Purpose:** “Lost & Found” for writes rejected with 409 (conflict). Admin can inspect and re-apply or discard.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS pending_storage_saves (
    id SERIAL PRIMARY KEY,
    storage_key TEXT NOT NULL,
    value TEXT NOT NULL,
    reason TEXT NOT NULL,
    username TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pending_storage_saves_created_at
  ON pending_storage_saves (created_at DESC);
```

**Retention:** Cleaned when running cleanup with `full: true`; `PENDING_STORAGE_RETENTION_DAYS` (default 7).

---

### 6. `storage_mutations` Table

**Purpose:** Idempotency for client writes. Stores mutation ID and optional response timestamp so retries return the same result without re-applying.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS storage_mutations (
    mutation_id TEXT PRIMARY KEY,
    storage_key TEXT NOT NULL,
    response_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_storage_mutations_created_at
  ON storage_mutations (created_at DESC);
```

**Retention:** Cleaned when running cleanup with `full: true`; `STORAGE_MUTATIONS_RETENTION_DAYS` (default 30).

---

### 7. `users` Table

**Purpose:** Source of truth for authentication (cookie auth). Replaces storage key `users` for login; storage `users` may still be used as legacy/fallback until F-002.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    roles TEXT[] NOT NULL DEFAULT '{}',
    regions TEXT[] NOT NULL DEFAULT '{}',
    sales_reps TEXT[] NOT NULL DEFAULT '{}',
    default_region TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    force_password_change BOOLEAN NOT NULL DEFAULT false,
    password_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);
```

---

### 8. `sessions` Table

**Purpose:** Active sessions for cookie-based auth. References `users`.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
```

**Relationships:** `sessions.user_id` → `users.id`

---

### 9. `pricing_calculations` Table

**Purpose:** Store pricing calculator payloads for dashboards and audit (JSONB). No retention policy in code yet; consider adding one.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS pricing_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id TEXT NOT NULL UNIQUE,
    user_email TEXT,
    country TEXT,
    channel_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL DEFAULT '{}',
    total_mandays NUMERIC,
    voice_mandays NUMERIC,
    text_mandays NUMERIC,
    total_invoice NUMERIC
);
-- Indexes on calculation_id, user_email, created_at DESC, country, channel_type
```

---

### 10. `login_logs` extra columns (actual schema in code)

The running app also has: `session_id`, `logout_at`, `session_duration_seconds`. Index: `idx_login_logs_session_id` on `session_id` WHERE session_id IS NOT NULL.

**Retention:** `LOGIN_LOGS_RETENTION_DAYS` (default 90); auto-cleanup in `loginLogs.js` and via admin cleanup.

---

## Data Storage Model

### Key-Value Storage Pattern

All application data is stored in the `storage` table using a key-value pattern:

**Top-Level Keys:**
- `users` - All users
- `accounts` - All accounts
- `activities` - External activities
- `internalActivities` - Internal activities
- `globalSalesReps` - Sales representatives
- `industries` - Industry list
- `regions` - Region list
- `presalesActivityTarget` - Activity target configuration
- `analyticsAccessConfig` - Analytics access password
- `featureFlags` - Feature flag settings
- `dashboardVisibility` - Dashboard visibility settings

**Bucket-Based Storage (Optional):**
- `storage:manifest` - Manifest containing bucket IDs
- `storage:bucket:{bucketId}` - Individual bucket data (for large datasets)

### Compression

Values may be compressed to save space:
- **LZString:** Prefixed with `__lz__`
- **GZIP:** Prefixed with `__gz__`

The application automatically handles compression/decompression when reading/writing.

---

## Relationships

**Note:** Since most data is stored as JSON in the `storage` table, there are no foreign key constraints. Relationships are maintained in the JSON structure:

- **Users → Activities:** `activity.userId` references `user.id`
- **Accounts → Projects:** `project.accountId` references `account.id`
- **Projects → Activities:** `activity.projectId` references `project.id`
- **Activities → Accounts:** `activity.accountId` references `account.id`

---

## Query Examples

### Get all storage keys
```sql
SELECT key FROM storage ORDER BY key ASC;
```

### Get a specific value
```sql
SELECT value FROM storage WHERE key = 'users';
```

### Get recent login attempts
```sql
SELECT * FROM login_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

### Get activity logs for a user
```sql
SELECT * FROM activity_logs 
WHERE username = 'john.doe' 
ORDER BY created_at DESC;
```

### Get activity logs by action type
```sql
SELECT * FROM activity_logs 
WHERE action = 'activity.create' 
ORDER BY created_at DESC;
```

---

## Retention and Cleanup

To keep Railway storage lean, run cleanup regularly (e.g. `POST /api/admin/cleanup`). Env vars:

| Env var | Default | Applies to |
|---------|---------|------------|
| `STORAGE_HISTORY_RETENTION_DAYS` | 90 | storage_history |
| `LOGIN_LOGS_RETENTION_DAYS` | 90 | login_logs |
| `ACTIVITY_LOGS_RETENTION_DAYS` | 14 | activity_logs |
| `STORAGE_MUTATIONS_RETENTION_DAYS` | 30 | storage_mutations (when `full: true`) |
| `PENDING_STORAGE_RETENTION_DAYS` | 7 | pending_storage_saves (when `full: true`) |

`pricing_calculations` has no retention in code yet; consider adding a policy or cleanup step.

---

## Migration Notes

- Tables are created automatically on first run via `initDb()`
- Columns are added with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to support schema evolution
- No data migration scripts needed for new columns (they default to NULL)

---

## Future Considerations

**Potential Improvements:**
1. Normalize data into separate tables (users, accounts, activities, projects)
2. Add foreign key constraints for data integrity
3. Add indexes on frequently queried JSON fields
4. Add table for feature flags and configuration
5. Add table for saved analytics presets

**Current Limitations:**
- No referential integrity (all relationships in JSON)
- No database-level validation
- Full table scans for queries (no indexes on JSON content)
- All data loaded into memory when accessing storage keys
