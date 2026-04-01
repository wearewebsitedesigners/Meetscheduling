-- Branding fields for the booking-page sidebar (per event type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_types' AND column_name = 'brand_logo_url'
  ) THEN
    ALTER TABLE event_types ADD COLUMN brand_logo_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_types' AND column_name = 'brand_tagline'
  ) THEN
    ALTER TABLE event_types ADD COLUMN brand_tagline TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_types' AND column_name = 'sidebar_message'
  ) THEN
    ALTER TABLE event_types ADD COLUMN sidebar_message TEXT;
  END IF;
END $$;
