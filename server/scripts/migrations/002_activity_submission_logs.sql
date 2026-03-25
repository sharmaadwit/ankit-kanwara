-- Activity submission logs: record every activity submit (put/append/remove) with payload and outcome.
-- Enables audit and recovery regardless of success, conflict, or validation failure.

CREATE TABLE IF NOT EXISTS activity_submission_logs (
  id SERIAL PRIMARY KEY,
  username TEXT,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  payload JSONB,
  activity_count INTEGER,
  transaction_id TEXT,
  storage_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_submission_logs_created_at
ON activity_submission_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_submission_logs_username
ON activity_submission_logs (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_submission_logs_outcome
ON activity_submission_logs (outcome);
