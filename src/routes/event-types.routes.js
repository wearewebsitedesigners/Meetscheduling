const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { forbidden } = require("../utils/http-error");
const { assertBoolean } = require("../utils/validation");
const { getPlanFeatures } = require("../utils/plans");
const { requireUser } = require("../services/users.service");
const {
  listEventTypesByUser,
  countEventTypesByUser,
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
    const eventTypes = await listEventTypesByUser(req.auth.userId, {
      includeInactive,
    });
    res.json({ eventTypes });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.auth.userId);
    const feature = getPlanFeatures(user.plan);
    const currentCount = await countEventTypesByUser(user.id);

    if (currentCount >= feature.maxEventTypes) {
      throw forbidden(
        `Plan limit reached. ${user.plan} plan supports ${feature.maxEventTypes} event type(s).`
      );
    }

    const eventType = await createEventType(req.auth.userId, req.body || {});
    res.status(201).json({ eventType });
  })
);

router.get(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const eventType = await getEventTypeByIdForUser(
      req.auth.userId,
      req.params.eventTypeId
    );
    res.json({ eventType });
  })
);

router.patch(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const eventType = await updateEventType(
      req.auth.userId,
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
      req.auth.userId,
      req.params.eventTypeId,
      isActive
    );
    res.json({ eventType });
  })
);

router.delete(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const result = await deleteEventType(req.auth.userId, req.params.eventTypeId);
    res.json(result);
  })
);

module.exports = router;

