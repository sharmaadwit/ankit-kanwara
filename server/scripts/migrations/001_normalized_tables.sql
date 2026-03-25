-- D-002: Normalized tables for accounts, projects, activities, internal_activities.
-- Run once; do not drop storage. Dual-write from storage route populates these.
-- Table names match DATA_OPTIMISATION_AGENT_BUILD.md (accounts = customer accounts, not auth users).

-- Normalized customer accounts (from storage key "accounts")
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  industry TEXT,
  region TEXT,
  sales_rep TEXT,
  sales_rep_region TEXT,
  sales_rep_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts (name);
CREATE INDEX IF NOT EXISTS idx_accounts_industry ON accounts (industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_sales_rep ON accounts (sales_rep) WHERE sales_rep IS NOT NULL;

-- Normalized projects (nested under accounts in storage; account_id FK)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  sfdc_link TEXT,
  use_cases TEXT[],
  products_interested TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects (account_id);

-- Normalized external activities (from storage key "activities"). account_id/project_id TEXT only (no FK) so activity-only writes succeed before accounts sync.
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  project_id TEXT,
  activity_date DATE,
  activity_type TEXT,
  call_type TEXT,
  duration_hours NUMERIC CHECK (duration_hours IS NULL OR (duration_hours >= 0 AND duration_hours <= 24)),
  duration_days NUMERIC CHECK (duration_days IS NULL OR (duration_days >= 0 AND duration_days <= 31)),
  notes TEXT,
  assigned_user_id TEXT,
  account_name TEXT,
  project_name TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities (activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities (account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_assigned_user ON activities (assigned_user_id, activity_date) WHERE assigned_user_id IS NOT NULL;

-- Normalized internal activities (from storage key "internalActivities")
CREATE TABLE IF NOT EXISTS internal_activities (
  id TEXT PRIMARY KEY,
  activity_date DATE,
  activity_type TEXT,
  activity_name TEXT,
  duration_hours NUMERIC CHECK (duration_hours IS NULL OR (duration_hours >= 0 AND duration_hours <= 24)),
  duration_days NUMERIC CHECK (duration_days IS NULL OR (duration_days >= 0 AND duration_days <= 31)),
  notes TEXT,
  assigned_user_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_internal_activities_date ON internal_activities (activity_date);
CREATE INDEX IF NOT EXISTS idx_internal_activities_assigned ON internal_activities (assigned_user_id, activity_date) WHERE assigned_user_id IS NOT NULL;
