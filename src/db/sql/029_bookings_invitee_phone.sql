-- Add invitee_phone and invitee_company to bookings so IVR calls and contact
-- sync can read them without relying on the email payload.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'invitee_phone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN invitee_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'invitee_company'
  ) THEN
    ALTER TABLE bookings ADD COLUMN invitee_company TEXT;
  END IF;
END $$;
