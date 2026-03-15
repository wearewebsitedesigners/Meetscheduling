const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertBoolean } = require("../utils/validation");
const { assertFeature } = require("../services/entitlements.service");
const {
  listEventTypesByUser,
  getEventTypeByIdForUser,
  createEventType,
  updateEventType,
  setEventTypeActive,
  deleteEventType,
} = require("../services/event-types.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive !== "false";
    const eventTypes = await listEventTypesByUser(req.auth.workspaceId, {
      includeInactive,
    });
    res.json({ eventTypes });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    await assertFeature(req.auth.workspaceId, "services");

    const eventType = await createEventType(req.auth.workspaceId, req.body || {});
    res.status(201).json({ eventType });
  })
);

router.get(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const eventType = await getEventTypeByIdForUser(
      req.auth.workspaceId,
      req.params.eventTypeId
    );
    res.json({ eventType });
  })
);

router.patch(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const eventType = await updateEventType(
      req.auth.workspaceId,
      req.params.eventTypeId,
      req.body || {}
    );
    res.json({ eventType });
  })
);

router.patch(
  "/:eventTypeId/active",
  asyncHandler(async (req, res) => {
    const isActive = assertBoolean(req.body?.isActive, "isActive");
    const eventType = await setEventTypeActive(
      req.auth.workspaceId,
      req.params.eventTypeId,
      isActive
    );
    res.json({ eventType });
  })
);

router.delete(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const result = await deleteEventType(req.auth.workspaceId, req.params.eventTypeId);
    res.json(result);
  })
);

module.exports = router;
