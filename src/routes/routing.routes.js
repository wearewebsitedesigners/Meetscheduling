const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertOptionalString, assertString } = require("../utils/validation");
const {
  listRoutingDataForUser,
  createRoutingFormForUser,
  updateRoutingFormForUser,
  deleteRoutingFormForUser,
  createRoutingLeadForUser,
  updateRoutingLeadForUser,
  routeLeadForUser,
  deleteRoutingLeadForUser,
} = require("../services/routing.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const filter = assertOptionalString(req.query.filter, "filter", { max: 20 }) || "all";
    const payload = await listRoutingDataForUser(req.auth.userId, { search, filter });
    res.json(payload);
  })
);

router.post(
  "/forms",
  asyncHandler(async (req, res) => {
    const form = await createRoutingFormForUser(req.auth.userId, req.body || {});
    res.status(201).json({ form });
  })
);

router.patch(
  "/forms/:formId",
  asyncHandler(async (req, res) => {
    const form = await updateRoutingFormForUser(
      req.auth.userId,
      req.params.formId,
      req.body || {}
    );
    res.json({ form });
  })
);

router.delete(
  "/forms/:formId",
  asyncHandler(async (req, res) => {
    const result = await deleteRoutingFormForUser(req.auth.userId, req.params.formId);
    res.json(result);
  })
);

router.post(
  "/leads",
  asyncHandler(async (req, res) => {
    const lead = await createRoutingLeadForUser(req.auth.userId, req.body || {});
    res.status(201).json({ lead });
  })
);

router.patch(
  "/leads/:leadId",
  asyncHandler(async (req, res) => {
    const lead = await updateRoutingLeadForUser(
      req.auth.userId,
      req.params.leadId,
      req.body || {}
    );
    res.json({ lead });
  })
);

router.post(
  "/leads/:leadId/route",
  asyncHandler(async (req, res) => {
    const routeTo = assertString(req.body?.routeTo, "routeTo", { min: 2, max: 160 });
    const lead = await routeLeadForUser(req.auth.userId, req.params.leadId, routeTo);
    res.json({ lead });
  })
);

router.delete(
  "/leads/:leadId",
  asyncHandler(async (req, res) => {
    const result = await deleteRoutingLeadForUser(req.auth.userId, req.params.leadId);
    res.json(result);
  })
);

module.exports = router;

