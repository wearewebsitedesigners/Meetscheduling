const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertInteger, assertOptionalString } = require("../utils/validation");
const {
  listInboxThreads,
  listInboxThreadMessages,
  replyInboxThread,
  createInboxCampaign,
  listInboxCampaigns,
} = require("../services/inbox.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/threads",
  requirePermission("inbox.read"),
  asyncHandler(async (req, res) => {
    const status = assertOptionalString(req.query.status, "status", { max: 30 }) || "all";
    const search = assertOptionalString(req.query.search, "search", { max: 220 });
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 300 })
      : 100;

    const threads = await listInboxThreads(req.auth.workspaceId, {
      status,
      search,
      limit,
    });
    res.json({ threads, status, search, limit });
  })
);

router.get(
  "/threads/:id/messages",
  requirePermission("inbox.read"),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 1000 })
      : 500;

    const messages = await listInboxThreadMessages(req.auth.workspaceId, req.params.id, {
      limit,
    });
    res.json({ messages, limit });
  })
);

router.post(
  "/threads/:id/reply",
  requirePermission("inbox.write"),
  asyncHandler(async (req, res) => {
    const message = await replyInboxThread(
      req.auth.workspaceId,
      req.auth.userId,
      req.params.id,
      req.body || {}
    );
    res.status(201).json({ message });
  })
);

router.post(
  "/campaigns",
  requirePermission("inbox.write"),
  asyncHandler(async (req, res) => {
    const campaign = await createInboxCampaign(
      req.auth.workspaceId,
      req.auth.userId,
      req.body || {}
    );
    res.status(201).json({ campaign });
  })
);

router.get(
  "/campaigns",
  requirePermission("inbox.read"),
  asyncHandler(async (req, res) => {
    const status = assertOptionalString(req.query.status, "status", { max: 20 }) || "all";
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 300 })
      : 100;

    const campaigns = await listInboxCampaigns(req.auth.workspaceId, { status, limit });
    res.json({ campaigns, status, limit });
  })
);

module.exports = router;
