const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { recordAuditEvent } = require("../services/audit.service");
const {
  listWorkspaceMembers,
  inviteWorkspaceMember,
  updateWorkspaceMemberRole,
  deleteWorkspaceMember,
  getWorkspaceRoleForUser,
} = require("../services/workspace.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/members",
  requirePermission("workspace.members.read"),
  asyncHandler(async (req, res) => {
    const members = await listWorkspaceMembers(req.auth.workspaceId);
    res.json({ members });
  })
);

router.post(
  "/members/invite",
  requirePermission("workspace.members.invite"),
  asyncHandler(async (req, res) => {
    const { member, emailStatus } = await inviteWorkspaceMember(
      req.auth.workspaceId,
      req.auth.userId,
      req.body || {}
    );

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "workspace.member.invite",
      resourceType: "workspace_member",
      resourceId: member.id,
      metadata: {
        email: member.invitedEmail,
        role: member.role,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.status(201).json({ member, emailStatus });
  })
);

router.patch(
  "/members/:memberId/role",
  requirePermission("workspace.members.updateRole"),
  asyncHandler(async (req, res) => {
    const member = await updateWorkspaceMemberRole(
      req.auth.workspaceId,
      req.params.memberId,
      req.body?.role
    );

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "workspace.member.role.updated",
      resourceType: "workspace_member",
      resourceId: member.id,
      metadata: {
        role: member.role,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.json({ member });
  })
);

router.delete(
  "/members/:memberId",
  requirePermission("workspace.members.remove"),
  asyncHandler(async (req, res) => {
    const result = await deleteWorkspaceMember(req.auth.workspaceId, req.params.memberId);

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "workspace.member.removed",
      resourceType: "workspace_member",
      resourceId: req.params.memberId,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.json(result);
  })
);

router.get(
  "/roles/me",
  asyncHandler(async (req, res) => {
    if (!req.auth.can("workspace.roles.me")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const role = await getWorkspaceRoleForUser(req.auth.workspaceId, req.auth.userId);
    res.json({
      workspaceId: role.workspaceId,
      role: role.role,
      permissionsVersion: role.permissionsVersion,
      permissions: role.permissions,
    });
  })
);

module.exports = router;
