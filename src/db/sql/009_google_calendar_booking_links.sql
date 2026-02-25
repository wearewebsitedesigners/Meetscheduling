ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS calendar_provider TEXT,
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS meeting_link_status TEXT;

UPDATE bookings
SET meeting_link_status = CASE
  WHEN COALESCE(trim(meeting_link), '') <> '' THEN 'ready'
  WHEN location_type = 'google_meet' THEN 'pending_calendar_connection'
  ELSE 'unavailable'
END
WHERE meeting_link_status IS NULL OR trim(meeting_link_status) = '';

ALTER TABLE bookings
  ALTER COLUMN meeting_link_status SET DEFAULT 'pending_generation';

ALTER TABLE bookings
  ALTER COLUMN meeting_link_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookings'::regclass
      AND conname = 'bookings_meeting_link_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_meeting_link_status_check
      CHECK (
        meeting_link_status IN (
          'ready',
          'pending_generation',
          'pending_calendar_connection',
          'generation_failed',
          'unavailable'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_calendar_event
  ON bookings(user_id, calendar_provider, calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;
