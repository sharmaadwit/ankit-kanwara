# Database Schema Documentation

## Overview

PAMS uses PostgreSQL with a simple key-value storage model. Most application data (users, accounts, activities, etc.) is stored as JSON in the `storage` table, while audit logs are stored in dedicated tables.

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
