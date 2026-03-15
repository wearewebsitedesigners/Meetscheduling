CREATE TABLE IF NOT EXISTS booking_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Booking page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_pages_user
  ON booking_pages(user_id);

CREATE TABLE IF NOT EXISTS booking_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id UUID NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  config_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_page_id, status)
);

CREATE INDEX IF NOT EXISTS idx_booking_page_versions_page_status
  ON booking_page_versions(booking_page_id, status);

CREATE TABLE IF NOT EXISTS booking_page_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id UUID NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  source_status TEXT NOT NULL CHECK (source_status IN ('draft', 'published')),
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  config_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_page_version_history_page_created
  ON booking_page_version_history(booking_page_id, created_at DESC);
