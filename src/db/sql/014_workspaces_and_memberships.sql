CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  permissions_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_owner_user
  ON workspaces(owner_user_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_email TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'removed')),
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL),
  UNIQUE (workspace_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_invited_unique
  ON workspace_members(workspace_id, invited_email)
  WHERE invited_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_role
  ON workspace_members(workspace_id, role);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON workspace_members(user_id);

INSERT INTO workspaces (
  id,
  owner_user_id,
  name,
  slug,
  permissions_version,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  COALESCE(NULLIF(u.display_name, ''), u.username, 'Workspace'),
  COALESCE(
    NULLIF(
      lower(regexp_replace(COALESCE(NULLIF(u.username, ''), split_part(u.email, '@', 1), 'workspace'), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'workspace-' || substr(replace(u.id::text, '-', ''), 1, 12)
  ),
  1,
  NOW(),
  NOW()
FROM users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspace_members (
  workspace_id,
  user_id,
  invited_email,
  role,
  status,
  invited_by_user_id,
  joined_at,
  created_at,
  updated_at
)
SELECT
  w.id,
  w.owner_user_id,
  u.email,
  'owner',
  'active',
  w.owner_user_id,
  NOW(),
  NOW(),
  NOW()
FROM workspaces w
JOIN users u ON u.id = w.owner_user_id
ON CONFLICT (workspace_id, user_id)
DO UPDATE SET
  role = 'owner',
  status = 'active',
  joined_at = COALESCE(workspace_members.joined_at, EXCLUDED.joined_at),
  updated_at = NOW();
