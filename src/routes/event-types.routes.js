const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertBoolean, assertOptionalBooleanString, assertString } = require("../utils/validation");
const { badRequest } = require("../utils/http-error");

const EVENT_TYPE_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

function assertEventTypeId(value) {
  const id = assertString(value, "eventTypeId", { min: 1, max: 100 });
  if (!EVENT_TYPE_ID_RE.test(id)) {
    throw badRequest("eventTypeId is invalid");
  }
  return id;
}
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
    const includeInactiveQuery = assertOptionalBooleanString(
      req.query.includeInactive,
      "includeInactive"
    );
    const includeInactive = includeInactiveQuery === undefined ? true : includeInactiveQuery;
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
    const eventTypeId = assertEventTypeId(req.params.eventTypeId);
    const eventType = await getEventTypeByIdForUser(
      req.auth.workspaceId,
      eventTypeId
    );
    res.json({ eventType });
  })
);

router.patch(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const eventTypeId = assertEventTypeId(req.params.eventTypeId);
    const eventType = await updateEventType(
      req.auth.workspaceId,
      eventTypeId,
      req.body || {}
    );
    res.json({ eventType });
  })
);

router.patch(
  "/:eventTypeId/active",
  asyncHandler(async (req, res) => {
    const eventTypeId = assertEventTypeId(req.params.eventTypeId);
    const isActive = assertBoolean(req.body?.isActive, "isActive");
    const eventType = await setEventTypeActive(
      req.auth.workspaceId,
      eventTypeId,
      isActive
    );
    res.json({ eventType });
  })
);

router.delete(
  "/:eventTypeId",
  asyncHandler(async (req, res) => {
    const eventTypeId = assertEventTypeId(req.params.eventTypeId);
    const result = await deleteEventType(req.auth.workspaceId, eventTypeId);
    res.json(result);
  })
);

module.exports = router;
