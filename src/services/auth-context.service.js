const { getAuthContextForUser, buildAuthClaims } = require("./workspace.service");

async function buildAuthClaimsForUser(user, preferredWorkspaceId = "", client = null) {
  const authContext = await getAuthContextForUser(user.id, preferredWorkspaceId, client);
  const workspaceClaims = buildAuthClaims(authContext);

  return {
    userId: user.id,
    email: user.email,
    username: user.username,
    plan: user.plan,
    workspaceId: workspaceClaims.workspaceId,
    membershipRole: workspaceClaims.membershipRole,
    permissionsVersion: workspaceClaims.permissionsVersion,
  };
}

function buildUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.display_name || user.displayName || user.username || user.email,
    timezone: user.timezone,
    plan: user.plan,
    avatarUrl: user.avatar_url || user.avatarUrl || "",
  };
}

module.exports = {
  buildAuthClaimsForUser,
  buildUserPayload,
};
