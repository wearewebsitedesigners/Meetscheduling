ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS contact_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_contact_id_fkey'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_contact_id_fkey
      FOREIGN KEY (contact_id)
      REFERENCES contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_email_lower
  ON contacts(workspace_id, LOWER(email));

CREATE INDEX IF NOT EXISTS idx_bookings_contact_id
  ON bookings(contact_id);

CREATE INDEX IF NOT EXISTS idx_bookings_workspace_contact_start
  ON bookings(workspace_id, contact_id, start_at_utc);
