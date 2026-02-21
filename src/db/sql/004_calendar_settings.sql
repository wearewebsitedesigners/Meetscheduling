CREATE TABLE IF NOT EXISTS user_calendar_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selected_provider TEXT,
  include_buffers BOOLEAN NOT NULL DEFAULT FALSE,
  auto_sync BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_calendar_settings_provider_format_check
    CHECK (
      selected_provider IS NULL
      OR selected_provider ~ '^[a-z0-9][a-z0-9-]{1,79}$'
    )
);
