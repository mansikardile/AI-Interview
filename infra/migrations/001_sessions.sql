CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY,
  owner_hash text NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_sessions_owner_idx ON interview_sessions (owner_hash);
