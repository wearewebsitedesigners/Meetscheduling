ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_pending_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS two_factor_pending_secret_at TIMESTAMPTZ;
