-- Confirmation call records for IVR system
CREATE TABLE IF NOT EXISTS confirmation_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  twilio_call_sid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | calling | confirmed | reschedule_requested | no_answer | failed
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  response TEXT,           -- 'confirmed' | 'reschedule'
  reschedule_reason TEXT,
  call_duration_seconds INTEGER,
  cost_estimate_usd NUMERIC(8, 4),
  scheduled_at TIMESTAMPTZ NOT NULL,
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_confirmation_calls_booking
  ON confirmation_calls(booking_id);

CREATE INDEX IF NOT EXISTS idx_confirmation_calls_pending
  ON confirmation_calls(status, scheduled_at)
  WHERE status = 'pending';

-- Monthly call usage tracking for billing
CREATE TABLE IF NOT EXISTS call_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,       -- 'YYYY-MM'
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(8, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Add is_confirmed to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'is_confirmed'
  ) THEN
    ALTER TABLE bookings ADD COLUMN is_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Add IVR settings to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'enable_confirmation_calls'
  ) THEN
    ALTER TABLE users ADD COLUMN enable_confirmation_calls BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'call_delay_minutes'
  ) THEN
    ALTER TABLE users ADD COLUMN call_delay_minutes INTEGER NOT NULL DEFAULT 5;
  END IF;
END $$;
