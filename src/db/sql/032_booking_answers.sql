-- Add invitee_answers JSONB column to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS invitee_answers JSONB DEFAULT '[]'::jsonb;
