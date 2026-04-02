-- Add custom_questions JSONB column to event_types table
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb;
