-- Migration 007: Add Two-Factor Authentication fields to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] DEFAULT '{}';
