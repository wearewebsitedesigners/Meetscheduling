CREATE TABLE IF NOT EXISTS paypal_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
  product_id TEXT,
  basic_plan_id TEXT,
  popular_plan_id TEXT,
  pro_plan_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paypal' CHECK (provider IN ('paypal')),
  plan_key TEXT NOT NULL CHECK (plan_key IN ('BASIC', 'POPULAR', 'PRO')),
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive', 'active', 'cancelled', 'past_due', 'suspended')),
  paypal_subscription_id TEXT UNIQUE,
  paypal_payer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_subscription_plan_status
  ON workspace_subscription(plan_key, status);

CREATE TABLE IF NOT EXISTS usage_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, key)
);

CREATE INDEX IF NOT EXISTS idx_usage_counter_workspace_updated
  ON usage_counter(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS billing_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paypal' CHECK (provider IN ('paypal')),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_event_log_resource
  ON billing_event_log(resource_id, processed_at DESC);
