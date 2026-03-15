const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertIsoDate } = require("../utils/validation");
const {
  getWeeklyAvailability,
  replaceWeeklyAvailability,
  listDateOverrides,
  createDateOverride,
  deleteDateOverride,
} = require("../services/availability.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const from = req.query.from ? assertIsoDate(req.query.from, "from") : null;
    const to = req.query.to ? assertIsoDate(req.query.to, "to") : null;

    const [weekly, overrides] = await Promise.all([
      getWeeklyAvailability(req.auth.workspaceId),
      listDateOverrides(req.auth.workspaceId, { from, to }),
    ]);

    res.json({
      weekly,
      overrides,
    });
  })
);

router.put(
  "/weekly",
  asyncHandler(async (req, res) => {
    const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];
    const weekly = await replaceWeeklyAvailability(req.auth.workspaceId, slots);
    res.json({ weekly });
  })
);

router.post(
  "/overrides",
  asyncHandler(async (req, res) => {
    const override = await createDateOverride(req.auth.workspaceId, req.body || {});
    res.status(201).json({ override });
  })
);

router.delete(
  "/overrides/:overrideId",
  asyncHandler(async (req, res) => {
    const result = await deleteDateOverride(req.auth.workspaceId, req.params.overrideId);
    res.json(result);
  })
);

module.exports = router;

