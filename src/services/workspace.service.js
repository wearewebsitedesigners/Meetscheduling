const { query } = require("../db/pool");
const { badRequest, conflict, forbidden, notFound } = require("../utils/http-error");
const { assertEmail, assertOptionalString, assertString } = require("../utils/validation");
const { sendWorkspaceInviteEmail } = require("./email.service");

const WORKSPACE_ROLES = Object.freeze(["owner", "admin", "member", "viewer"]);
const PERMISSIONS_VERSION = 1;

const ROLE_PERMISSIONS = Object.freeze({
  owner: Object.freeze(["*"]),
  admin: Object.freeze(["*"]),
  member: Object.freeze([
    "workspace.roles.me",
    "dashboard.overview.read",
    "chat.*",
    "inbox.*",
    "files.*",
    "gallery.*",
    "posts.*",
    "invoices.*",
  ]),
  viewer: Object.freeze([
    "workspace.roles.me",
    "dashboard.overview.read",
    "chat.read",
    "inbox.read",
    "files.read",
    "gallery.read",
    "posts.read",
    "invoices.read",
  ]),
});

function normalizeRole(value, field = "role") {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  if (!WORKSPACE_ROLES.includes(role)) {
    throw badRequest(`${field} must be one of owner, admin, member, viewer`);
  }
  return role;
}

function normalizeWorkspaceName(value, fallback = "Workspace") {
  const name = assertOptionalString(value, "name", { max: 120 });
  return name || fallback;
}

function normalizeWorkspaceSlug(source, fallback = "workspace") {
  const raw = String(source || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || fallback;
}

function permissionMatches(granted, required) {
  if (!granted || !required) return false;
  if (granted === "*") return true;
  if (granted === required) return true;
  if (granted.endsWith(".*")) {
    const prefix = granted.slice(0, -1);
    return required.startsWith(prefix);
  }
  return false;
}

function canRole(role, permission) {
  const normalizedRole = normalizeRole(role, "membershipRole");
  const required = String(permission || "").trim();
  if (!required) return false;
  const grants = ROLE_PERMISSIONS[normalizedRole] || [];
  return grants.some((grant) => permissionMatches(grant, required));
}

function createPermissionChecker(role) {
  return (permission) => canRole(role, permission);
}

function mapWorkspaceMember(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id || null,
    invitedEmail: row.invited_email || "",
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: {
      id: row.user_id || null,
      email: row.user_email || row.invited_email || "",
      username: row.user_username || "",
      displayName: row.user_display_name || row.invited_email || "Pending member",
    },
  };
}

async function ensureWorkspaceForUser(userId, client = null) {
  const userResult = await query(
    `
      SELECT id, email, username, display_name
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
    client
  );

  const user = userResult.rows[0];
  if (!user) throw notFound("User not found");

  try {
    await query(
      `
        INSERT INTO workspaces (id, owner_user_id, name, slug, permissions_version, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
        ON CONFLICT (id) DO NOTHING
      `,
      [
        user.id,
        user.id,
        normalizeWorkspaceName(user.display_name, user.username || "Workspace"),
        normalizeWorkspaceSlug(user.username || user.email.split("@")[0], `workspace-${user.id.slice(0, 8)}`),
        PERMISSIONS_VERSION,
      ],
      client
    );

    await query(
      `
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
        VALUES ($1,$2,$3,'owner','active',$2,NOW(),NOW(),NOW())
        ON CONFLICT (workspace_id, user_id)
        DO UPDATE SET
          role = 'owner',
          status = 'active',
          invited_email = EXCLUDED.invited_email,
          joined_at = COALESCE(workspace_members.joined_at, EXCLUDED.joined_at),
          updated_at = NOW()
      `,
      [user.id, user.id, user.email],
      client
    );
  } catch (error) {
    // Allow code rollout before migrations are executed.
    if (error && error.code === "42P01") {
      return {
        workspaceId: user.id,
        role: "owner",
        permissionsVersion: PERMISSIONS_VERSION,
      };
    }
    throw error;
  }

  return {
    workspaceId: user.id,
    role: "owner",
    permissionsVersion: PERMISSIONS_VERSION,
  };
}

async function resolveWorkspaceMembership(userId, preferredWorkspaceId = "", client = null) {
  await ensureWorkspaceForUser(userId, client);

  const params = [userId];
  let workspaceClause = "";
  if (preferredWorkspaceId) {
    params.push(preferredWorkspaceId);
    workspaceClause = `AND wm.workspace_id = $${params.length}`;
  }

  try {
    const result = await query(
      `
        SELECT
          wm.id,
          wm.workspace_id,
          wm.user_id,
          wm.invited_email,
          wm.role,
          wm.status,
          wm.joined_at,
          wm.created_at,
          wm.updated_at,
          w.permissions_version
        FROM workspace_members wm
        JOIN workspaces w ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
          AND wm.status = 'active'
          ${workspaceClause}
        ORDER BY
          CASE wm.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'member' THEN 3
            ELSE 4
          END,
          wm.created_at ASC
        LIMIT 1
      `,
      params,
      client
    );

    const row = result.rows[0];
    if (!row) {
      throw forbidden("No active workspace membership");
    }

    return {
      memberId: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: normalizeRole(row.role),
      status: row.status,
      permissionsVersion: Number(row.permissions_version || PERMISSIONS_VERSION),
      joinedAt: row.joined_at,
    };
  } catch (error) {
    if (error && error.code === "42P01") {
      return {
        memberId: null,
        workspaceId: userId,
        userId,
        role: "owner",
        status: "active",
        permissionsVersion: PERMISSIONS_VERSION,
        joinedAt: null,
      };
    }
    throw error;
  }
}

function buildAuthClaims(membership) {
  return {
    workspaceId: membership.workspaceId,
    membershipRole: membership.role,
    permissionsVersion: membership.permissionsVersion || PERMISSIONS_VERSION,
  };
}

async function getAuthContextForUser(userId, preferredWorkspaceId = "", client = null) {
  const membership = await resolveWorkspaceMembership(userId, preferredWorkspaceId, client);
  return {
    workspaceId: membership.workspaceId,
    role: membership.role,
    permissionsVersion: membership.permissionsVersion,
    can: createPermissionChecker(membership.role),
    membership,
  };
}

async function getWorkspaceOwnerUser(workspaceId, client = null) {
  try {
    const result = await query(
      `
        SELECT
          w.id AS workspace_id,
          w.owner_user_id,
          u.id,
          u.email,
          u.username,
          u.display_name,
          u.timezone
        FROM workspaces w
        JOIN users u ON u.id = w.owner_user_id
        WHERE w.id = $1
        LIMIT 1
      `,
      [workspaceId],
      client
    );

    const row = result.rows[0];
    if (row) {
      return {
        workspaceId: row.workspace_id,
        ownerUserId: row.owner_user_id,
        id: row.id,
        email: row.email,
        username: row.username,
        display_name: row.display_name,
        timezone: row.timezone,
      };
    }
  } catch (error) {
    if (!error || error.code !== "42P01") {
      throw error;
    }
  }

  const fallback = await query(
    `
      SELECT id, email, username, display_name, timezone
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [workspaceId],
    client
  );

  const row = fallback.rows[0];
  if (!row) throw notFound("Workspace owner not found");

  return {
    workspaceId,
    ownerUserId: row.id,
    id: row.id,
    email: row.email,
    username: row.username,
    display_name: row.display_name,
    timezone: row.timezone,
  };
}

async function listWorkspaceMembers(workspaceId, client = null) {
  const result = await query(
    `
      SELECT
        wm.id,
        wm.workspace_id,
        wm.user_id,
        wm.invited_email,
        wm.role,
        wm.status,
        wm.joined_at,
        wm.created_at,
        wm.updated_at,
        u.email AS user_email,
        u.username AS user_username,
        u.display_name AS user_display_name
      FROM workspace_members wm
      LEFT JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
      ORDER BY
        CASE wm.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
          ELSE 4
        END,
        wm.created_at ASC
    `,
    [workspaceId],
    client
  );

  return result.rows.map(mapWorkspaceMember);
}

async function findWorkspaceMemberById(workspaceId, memberId, client = null) {
  const result = await query(
    `
      SELECT
        wm.id,
        wm.workspace_id,
        wm.user_id,
        wm.invited_email,
        wm.role,
        wm.status,
        wm.joined_at,
        wm.created_at,
        wm.updated_at,
        u.email AS user_email,
        u.username AS user_username,
        u.display_name AS user_display_name
      FROM workspace_members wm
      LEFT JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
        AND wm.id = $2
      LIMIT 1
    `,
    [workspaceId, memberId],
    client
  );

  const row = result.rows[0];
  if (!row) throw notFound("Workspace member not found");
  return mapWorkspaceMember(row);
}

async function activatePendingWorkspaceInvitesForUser(userId, email, client = null) {
  const invitedEmail = assertEmail(email, "email");
  const result = await query(
    `
      UPDATE workspace_members
      SET
        user_id = $1,
        status = 'active',
        joined_at = COALESCE(joined_at, NOW()),
        updated_at = NOW()
      WHERE invited_email = $2
        AND user_id IS NULL
      RETURNING id, workspace_id, role, status, joined_at
    `,
    [userId, invitedEmail],
    client
  );

  return result.rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  }));
}

async function inviteWorkspaceMember(workspaceId, actorUserId, payload = {}, client = null) {
  const email = assertEmail(payload.email, "email");
  const role = normalizeRole(payload.role || "member");

  const existing = await query(
    `
      SELECT id
      FROM workspace_members
      WHERE workspace_id = $1
        AND (invited_email = $2 OR user_id = (SELECT id FROM users WHERE email = $2))
      LIMIT 1
    `,
    [workspaceId, email],
    client
  );

  if (existing.rows[0]) {
    throw conflict("Member already exists or invite already pending");
  }

  const userResult = await query(
    `
      SELECT id, email, username, display_name
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
    client
  );

  const user = userResult.rows[0] || null;
  const insertResult = await query(
    `
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
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        workspace_id,
        user_id,
        invited_email,
        role,
        status,
        joined_at,
        created_at,
        updated_at
    `,
    [
      workspaceId,
      user ? user.id : null,
      email,
      role,
      user ? "active" : "invited",
      actorUserId,
      user ? new Date().toISOString() : null,
    ],
    client
  );

  const member = insertResult.rows[0];
  const memberPayload = {
    id: member.id,
    workspaceId: member.workspace_id,
    userId: member.user_id,
    invitedEmail: member.invited_email,
    role: member.role,
    status: member.status,
    joinedAt: member.joined_at,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
    user: user
      ? {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
      }
      : null,
  };

  const metadataResult = await query(
    `
      SELECT
        w.name AS workspace_name,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), u.email, 'A teammate') AS inviter_name
      FROM workspaces w
      LEFT JOIN users u ON u.id = $2
      WHERE w.id = $1
      LIMIT 1
    `,
    [workspaceId, actorUserId],
    client
  );

  const metadata = metadataResult.rows[0] || {};
  let emailStatus = { sent: false, reason: "Invite email could not be prepared" };
  try {
    emailStatus = await sendWorkspaceInviteEmail({
      toEmail: email,
      inviterName: metadata.inviter_name,
      workspaceName: metadata.workspace_name,
      role,
      existingUser: Boolean(user),
    });
  } catch (error) {
    emailStatus = {
      sent: false,
      reason: error?.message || "Invite email failed to send",
    };
  }

  return {
    member: memberPayload,
    emailStatus,
  };
}

async function updateWorkspaceMemberRole(workspaceId, memberId, nextRole, client = null) {
  const role = normalizeRole(nextRole);
  const member = await findWorkspaceMemberById(workspaceId, memberId, client);

  if (member.role === "owner" && role !== "owner") {
    const ownerCountResult = await query(
      `
        SELECT COUNT(*)::int AS count
        FROM workspace_members
        WHERE workspace_id = $1
          AND role = 'owner'
          AND status = 'active'
      `,
      [workspaceId],
      client
    );

    const ownerCount = Number(ownerCountResult.rows[0]?.count || 0);
    if (ownerCount <= 1) {
      throw badRequest("Workspace must have at least one owner");
    }
  }

  const result = await query(
    `
      UPDATE workspace_members
      SET role = $1, updated_at = NOW()
      WHERE id = $2
        AND workspace_id = $3
      RETURNING
        id,
        workspace_id,
        user_id,
        invited_email,
        role,
        status,
        joined_at,
        created_at,
        updated_at
    `,
    [role, memberId, workspaceId],
    client
  );

  if (!result.rows[0]) throw notFound("Workspace member not found");
  return findWorkspaceMemberById(workspaceId, memberId, client);
}

async function deleteWorkspaceMember(workspaceId, memberId, client = null) {
  const member = await findWorkspaceMemberById(workspaceId, memberId, client);
  if (member.role === "owner") {
    throw badRequest("Owner cannot be removed from workspace");
  }

  const result = await query(
    `
      DELETE FROM workspace_members
      WHERE id = $1
        AND workspace_id = $2
    `,
    [memberId, workspaceId],
    client
  );

  if (!result.rowCount) throw notFound("Workspace member not found");
  return { deleted: true, memberId };
}

async function getWorkspaceRoleForUser(workspaceId, userId, client = null) {
  const membership = await resolveWorkspaceMembership(userId, workspaceId, client);
  return {
    workspaceId: membership.workspaceId,
    role: membership.role,
    permissionsVersion: membership.permissionsVersion,
    permissions: ROLE_PERMISSIONS[membership.role] || [],
  };
}

module.exports = {
  WORKSPACE_ROLES,
  ROLE_PERMISSIONS,
  PERMISSIONS_VERSION,
  normalizeRole,
  canRole,
  createPermissionChecker,
  buildAuthClaims,
  ensureWorkspaceForUser,
  resolveWorkspaceMembership,
  getAuthContextForUser,
  getWorkspaceOwnerUser,
  listWorkspaceMembers,
  activatePendingWorkspaceInvitesForUser,
  inviteWorkspaceMember,
  updateWorkspaceMemberRole,
  deleteWorkspaceMember,
  getWorkspaceRoleForUser,
};
