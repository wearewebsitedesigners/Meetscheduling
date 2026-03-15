const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertInteger, assertOptionalString } = require("../utils/validation");
const {
  listChatConversations,
  createChatConversation,
  listChatMessages,
  createChatMessage,
  markConversationRead,
} = require("../services/chat.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/conversations",
  requirePermission("chat.read"),
  asyncHandler(async (req, res) => {
    const status = assertOptionalString(req.query.status, "status", { max: 30 }) || "all";
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 200 })
      : 50;

    const conversations = await listChatConversations(req.auth.workspaceId, {
      status,
      search,
      limit,
    });

    res.json({ conversations, status, search, limit });
  })
);

router.post(
  "/conversations",
  requirePermission("chat.write"),
  asyncHandler(async (req, res) => {
    const conversation = await createChatConversation(
      req.auth.workspaceId,
      req.auth.userId,
      req.body || {}
    );
    res.status(201).json({ conversation });
  })
);

router.get(
  "/conversations/:id/messages",
  requirePermission("chat.read"),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 500 })
      : 200;
    const messages = await listChatMessages(req.auth.workspaceId, req.params.id, { limit });
    res.json({ messages, limit });
  })
);

router.post(
  "/conversations/:id/messages",
  requirePermission("chat.write"),
  asyncHandler(async (req, res) => {
    const message = await createChatMessage(
      req.auth.workspaceId,
      req.params.id,
      req.auth.userId,
      req.body || {}
    );
    res.status(201).json({ message });
  })
);

router.patch(
  "/conversations/:id/read",
  requirePermission("chat.read"),
  asyncHandler(async (req, res) => {
    const readState = await markConversationRead(
      req.auth.workspaceId,
      req.params.id,
      req.auth.userId
    );
    res.json({ readState });
  })
);

module.exports = router;
