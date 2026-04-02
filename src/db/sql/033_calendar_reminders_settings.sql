-- 033_calendar_reminders_settings.sql
-- Calendar Reminders integration: per-workspace settings for ICS invites with VALARM reminders.
-- Attendees and owners receive calendar invites with built-in alarm blocks upon booking.

CREATE TABLE IF NOT EXISTS calendar_reminders_settings (
  workspace_id            UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Master toggle: whether calendar invites with VALARM reminders are sent
  enabled                 BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Minutes before meeting to trigger VALARM blocks in the ICS, e.g. [1440, 60, 15]
  reminder_timings        JSONB       NOT NULL DEFAULT '[1440, 60, 15]'::jsonb,
  -- Template for the event SUMMARY field. Supports {{eventTitle}} and {{inviteeName}}
  event_title_template    TEXT        NOT NULL DEFAULT '{{eventTitle}} with {{inviteeName}}',
  -- Also send separate reminder emails at each timing interval (in addition to ICS VALARM)
  email_reminders_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add email-reminder sent-flag columns to bookings table for 24h and 1h intervals.
-- The existing 30m/0m columns are in migration 008.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent  BOOLEAN DEFAULT FALSE;

COMMENT ON TABLE calendar_reminders_settings IS
  'Per-workspace Calendar Reminders integration settings: ICS VALARM timings, title template, and optional email reminders.';
