INSERT INTO workspaces (
  id,
  owner_user_id,
  name,
  slug,
  permissions_version,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  COALESCE(NULLIF(u.display_name, ''), u.username, 'Workspace'),
  COALESCE(
    NULLIF(
      lower(regexp_replace(COALESCE(NULLIF(u.username, ''), split_part(u.email, '@', 1), 'workspace'), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'workspace-' || substr(replace(u.id::text, '-', ''), 1, 12)
  ),
  1,
  NOW(),
  NOW()
FROM users u
ON CONFLICT (id) DO NOTHING;

ALTER TABLE event_types ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE event_types SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE event_types ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_types_workspace_active ON event_types(workspace_id, is_active);

ALTER TABLE user_weekly_availability ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE user_weekly_availability SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE user_weekly_availability ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_weekly_availability_workspace_weekday
  ON user_weekly_availability(workspace_id, weekday);

ALTER TABLE user_date_overrides ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE user_date_overrides SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE user_date_overrides ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_date_overrides_workspace_date
  ON user_date_overrides(workspace_id, override_date);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE bookings SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE bookings ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_workspace_start
  ON bookings(workspace_id, start_at_utc);

ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE user_integrations SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE user_integrations ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_integrations_workspace_provider
  ON user_integrations(workspace_id, provider);

ALTER TABLE user_calendar_settings ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE user_calendar_settings SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE user_calendar_settings ALTER COLUMN workspace_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_calendar_settings_workspace
  ON user_calendar_settings(workspace_id);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE contacts SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE contacts ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_updated
  ON contacts(workspace_id, updated_at DESC);

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE workflows SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE workflows ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflows_workspace_updated
  ON workflows(workspace_id, updated_at DESC);

ALTER TABLE routing_forms ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE routing_forms SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE routing_forms ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routing_forms_workspace_updated
  ON routing_forms(workspace_id, updated_at DESC);

ALTER TABLE routing_leads ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE routing_leads SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE routing_leads ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routing_leads_workspace_submitted
  ON routing_leads(workspace_id, submitted_at DESC);

ALTER TABLE user_landing_pages ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE user_landing_pages SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE user_landing_pages ALTER COLUMN workspace_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_landing_pages_workspace
  ON user_landing_pages(workspace_id);

ALTER TABLE landing_page_leads ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE landing_page_leads SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE landing_page_leads ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_workspace_created
  ON landing_page_leads(workspace_id, created_at DESC);

ALTER TABLE booking_pages ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE booking_pages SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE booking_pages ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_pages_workspace
  ON booking_pages(workspace_id);

ALTER TABLE booking_page_versions ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE booking_page_versions v
SET workspace_id = p.workspace_id
FROM booking_pages p
WHERE v.booking_page_id = p.id
  AND v.workspace_id IS NULL;
ALTER TABLE booking_page_versions ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_page_versions_workspace_status
  ON booking_page_versions(workspace_id, status);

ALTER TABLE booking_page_version_history ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE booking_page_version_history h
SET workspace_id = p.workspace_id
FROM booking_pages p
WHERE h.booking_page_id = p.id
  AND h.workspace_id IS NULL;
ALTER TABLE booking_page_version_history ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_page_version_history_workspace_created
  ON booking_page_version_history(workspace_id, created_at DESC);

ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE service_categories SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE service_categories ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_categories_workspace_sort
  ON service_categories(workspace_id, sort_order ASC, created_at ASC);

ALTER TABLE services ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE services SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE services ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_workspace_sort
  ON services(workspace_id, sort_order ASC, created_at ASC);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE reviews SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE reviews ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_workspace_sort
  ON reviews(workspace_id, sort_order ASC, created_at DESC);

ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS workspace_id UUID;
UPDATE password_reset_tokens SET workspace_id = user_id WHERE workspace_id IS NULL;
ALTER TABLE password_reset_tokens ALTER COLUMN workspace_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_workspace
  ON password_reset_tokens(workspace_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_subscription_workspace_id_fkey'
      AND conrelid = 'workspace_subscription'::regclass
  ) THEN
    ALTER TABLE workspace_subscription
      DROP CONSTRAINT workspace_subscription_workspace_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspace_subscription_workspace_id_fkey'
      AND conrelid = 'workspace_subscription'::regclass
  ) THEN
    ALTER TABLE workspace_subscription
      ADD CONSTRAINT workspace_subscription_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usage_counter_workspace_id_fkey'
      AND conrelid = 'usage_counter'::regclass
  ) THEN
    ALTER TABLE usage_counter
      DROP CONSTRAINT usage_counter_workspace_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usage_counter_workspace_id_fkey'
      AND conrelid = 'usage_counter'::regclass
  ) THEN
    ALTER TABLE usage_counter
      ADD CONSTRAINT usage_counter_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_types_workspace_id_fkey'
      AND conrelid = 'event_types'::regclass
  ) THEN
    ALTER TABLE event_types
      ADD CONSTRAINT event_types_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_workspace_id_fkey'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_workspace_id_fkey'
      AND conrelid = 'contacts'::regclass
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workflows_workspace_id_fkey'
      AND conrelid = 'workflows'::regclass
  ) THEN
    ALTER TABLE workflows
      ADD CONSTRAINT workflows_workspace_id_fkey
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE CASCADE;
  END IF;
END $$;
