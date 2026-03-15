const express = require("express");
const env = require("../config/env");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertOptionalString, assertString } = require("../utils/validation");
const { requireUser } = require("../services/users.service");
const {
  createPayPalSubscription,
  resolveWorkspaceIdForRequest,
  syncSubscriptionFromPayPal,
  cancelWorkspaceSubscription,
  getWorkspaceSubscriptionByWorkspaceId,
} = require("../services/billing.service");
const { getEntitlements, getUsageSnapshot, normalizePlanKey } = require("../services/entitlements.service");

const router = express.Router();

router.get(
  "/paypal/client-config",
  asyncHandler(async (_req, res) => {
    res.json({
      clientId: env.paypal.clientId || "",
      env: env.paypal.env,
    });
  })
);

router.use(requireAuth);

function readWorkspaceId(req) {
  const rawBodyWorkspaceId = assertOptionalString(req.body?.workspaceId, "workspaceId", {
    max: 80,
  });
  const rawQueryWorkspaceId = assertOptionalString(req.query?.workspaceId, "workspaceId", {
    max: 80,
  });
  return rawBodyWorkspaceId || rawQueryWorkspaceId || req.auth.workspaceId;
}

router.post(
  "/paypal/create-subscription",
  requirePermission("workspace.billing.manage"),
  asyncHandler(async (req, res) => {
    const workspaceId = resolveWorkspaceIdForRequest(req.auth.workspaceId, readWorkspaceId(req));
    const planKey = normalizePlanKey(assertString(req.body?.planKey, "planKey", { min: 3, max: 12 }));
    const user = await requireUser(req.auth.userId);

    const payload = await createPayPalSubscription({
      workspaceId,
      planKey,
      payerEmail: user.email,
    });

    res.status(201).json(payload);
  })
);

router.post(
  "/paypal/capture",
  requirePermission("workspace.billing.manage"),
  asyncHandler(async (req, res) => {
    const workspaceId = resolveWorkspaceIdForRequest(req.auth.workspaceId, readWorkspaceId(req));
    const subscriptionId = assertString(req.body?.subscriptionId, "subscriptionId", {
      min: 2,
      max: 120,
    });
    const result = await syncSubscriptionFromPayPal(subscriptionId, workspaceId);
    res.json({
      subscription: result.subscription,
      remote: result.remote,
    });
  })
);

router.post(
  "/paypal/cancel",
  requirePermission("workspace.billing.manage"),
  asyncHandler(async (req, res) => {
    const workspaceId = resolveWorkspaceIdForRequest(req.auth.workspaceId, readWorkspaceId(req));
    const reason = assertOptionalString(req.body?.reason, "reason", { max: 120 });
    const subscription = await cancelWorkspaceSubscription(
      workspaceId,
      reason || "Cancelled from billing settings"
    );
    res.json({ subscription });
  })
);

router.get(
  "/entitlements",
  requirePermission("workspace.billing.manage"),
  asyncHandler(async (req, res) => {
    const workspaceId = resolveWorkspaceIdForRequest(req.auth.workspaceId, readWorkspaceId(req));
    const entitlements = await getEntitlements(workspaceId);
    res.json(entitlements);
  })
);

router.get(
  "/usage",
  requirePermission("workspace.billing.manage"),
  asyncHandler(async (req, res) => {
    const workspaceId = resolveWorkspaceIdForRequest(req.auth.workspaceId, readWorkspaceId(req));
    const usage = await getUsageSnapshot(workspaceId);
    res.json(usage);
  })
);

router.get(
  "/subscription",
  requirePermission("workspace.billing.manage"),
  asyncHandler(async (req, res) => {
    const workspaceId = resolveWorkspaceIdForRequest(req.auth.workspaceId, readWorkspaceId(req));
    const subscription = await getWorkspaceSubscriptionByWorkspaceId(workspaceId);
    res.json({ subscription });
  })
);

module.exports = router;
