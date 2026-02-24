ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reminder_30m_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_0m_sent BOOLEAN DEFAULT FALSE;

-- Ensure user_integrations can store the required metadata for OAuth
-- (It already has a jsonb metadata column in 002_integrations.sql or similar, 
-- but let's make sure it's ready. If it didn't exist, we'd add it here, 
-- but we know from integrations.service.js that row.metadata is used.)
-- We don't need any new columns on user_integrations since metadata JSONB exists.
