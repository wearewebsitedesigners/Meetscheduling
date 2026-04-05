-- Migration 034: add brand_bg_color to event_types for booking page background customization
ALTER TABLE event_types ADD COLUMN IF NOT EXISTS brand_bg_color TEXT DEFAULT NULL;
