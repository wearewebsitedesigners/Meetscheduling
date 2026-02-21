ALTER TABLE user_integrations
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Automation',
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon_text TEXT NOT NULL DEFAULT 'APP',
  ADD COLUMN IF NOT EXISTS icon_bg TEXT NOT NULL DEFAULT '#1f6feb',
  ADD COLUMN IF NOT EXISTS admin_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

UPDATE user_integrations
SET provider = replace(provider, '_', '-')
WHERE provider LIKE '%\_%' ESCAPE '\';

DO $$
DECLARE provider_check_name text;
BEGIN
  SELECT conname
  INTO provider_check_name
  FROM pg_constraint
  WHERE conrelid = 'user_integrations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%provider%';

  IF provider_check_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE user_integrations DROP CONSTRAINT %I',
      provider_check_name
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_integrations'::regclass
      AND conname = 'user_integrations_provider_format_check'
  ) THEN
    ALTER TABLE user_integrations
    ADD CONSTRAINT user_integrations_provider_format_check
    CHECK (provider ~ '^[a-z0-9][a-z0-9-]{1,79}$');
  END IF;
END $$;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, provider
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_num
  FROM user_integrations
)
DELETE FROM user_integrations ui
USING ranked r
WHERE ui.id = r.id
  AND r.row_num > 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_integrations'::regclass
      AND conname = 'user_integrations_user_id_provider_account_email_key'
  ) THEN
    ALTER TABLE user_integrations
    DROP CONSTRAINT user_integrations_user_id_provider_account_email_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_integrations_user_provider
  ON user_integrations(user_id, provider);

UPDATE user_integrations
SET
  display_name = CASE
    WHEN COALESCE(display_name, '') = '' THEN INITCAP(replace(provider, '-', ' '))
    ELSE display_name
  END,
  icon_text = CASE
    WHEN COALESCE(icon_text, '') = '' THEN upper(left(replace(provider, '-', ''), 4))
    ELSE icon_text
  END,
  icon_bg = CASE
    WHEN COALESCE(icon_bg, '') = '' THEN '#1f6feb'
    ELSE icon_bg
  END,
  metadata = COALESCE(metadata, '{}'::jsonb),
  category = CASE
    WHEN COALESCE(category, '') = '' THEN 'Automation'
    ELSE category
  END;
