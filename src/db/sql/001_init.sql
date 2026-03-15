CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 720),
  slug TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('google_meet', 'zoom', 'custom', 'in_person')),
  custom_location TEXT,
  buffer_before_min INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_min >= 0 AND buffer_before_min <= 240),
  buffer_after_min INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_min >= 0 AND buffer_after_min <= 240),
  max_bookings_per_day INTEGER NOT NULL DEFAULT 0 CHECK (max_bookings_per_day >= 0 AND max_bookings_per_day <= 500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_event_types_user_active ON event_types(user_id, is_active);

CREATE TABLE IF NOT EXISTS user_weekly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_weekly_availability_user_weekday
  ON user_weekly_availability(user_id, weekday);

CREATE TABLE IF NOT EXISTS user_date_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (is_available = FALSE AND start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_date_overrides_user_date
  ON user_date_overrides(user_id, override_date);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  visitor_timezone TEXT NOT NULL DEFAULT 'UTC',
  start_at_utc TIMESTAMPTZ NOT NULL,
  end_at_utc TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 720),
  buffer_before_min INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_min >= 0),
  buffer_after_min INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_min >= 0),
  location_type TEXT NOT NULL CHECK (location_type IN ('google_meet', 'zoom', 'custom', 'in_person')),
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'canceled')),
  cancel_reason TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_event_type_start_confirmed
  ON bookings(event_type_id, start_at_utc)
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_bookings_user_start
  ON bookings(user_id, start_at_utc);

CREATE INDEX IF NOT EXISTS idx_bookings_event_start
  ON bookings(event_type_id, start_at_utc);

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'zoom')),
  account_email TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, account_email)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider
  ON user_integrations(user_id, provider);

