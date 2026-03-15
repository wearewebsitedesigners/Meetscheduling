CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  normalized_domain TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('landing_page', 'booking_page')),
  landing_page_id UUID REFERENCES booking_pages(id) ON DELETE SET NULL,
  event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'dns_invalid', 'verifying', 'verified', 'ssl_pending', 'active', 'failed')
  ),
  ssl_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    ssl_status IN ('pending', 'issued', 'failed')
  ),
  verification_method TEXT NOT NULL DEFAULT 'cname' CHECK (
    verification_method IN ('cname', 'a_record')
  ),
  dns_name TEXT NOT NULL,
  dns_target TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'local',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE domains
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'local';

ALTER TABLE domains
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'domains_target_type_check'
      AND conrelid = 'domains'::regclass
  ) THEN
    ALTER TABLE domains
      ADD CONSTRAINT domains_target_type_check CHECK (
        (target_type = 'landing_page' AND event_type_id IS NULL)
        OR
        (target_type = 'booking_page' AND landing_page_id IS NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'domains_single_target_check'
      AND conrelid = 'domains'::regclass
  ) THEN
    ALTER TABLE domains
      ADD CONSTRAINT domains_single_target_check CHECK (
        ((landing_page_id IS NOT NULL)::int + (event_type_id IS NOT NULL)::int) <= 1
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_domains_normalized_domain
  ON domains(normalized_domain);

CREATE INDEX IF NOT EXISTS idx_domains_workspace_created
  ON domains(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domains_workspace_status
  ON domains(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_domains_landing_page
  ON domains(landing_page_id);

CREATE INDEX IF NOT EXISTS idx_domains_event_type
  ON domains(event_type_id);
