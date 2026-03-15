const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertInteger, assertOptionalString } = require("../utils/validation");
const {
  getLandingPageForUser,
  updateLandingPageForUser,
  listLandingPageLeadsForUser,
  updateLandingLeadStatusForUser,
} = require("../services/landing-page.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const landingPage = await getLandingPageForUser(req.auth.workspaceId);
    res.json({ landingPage });
  })
);

router.patch(
  "/",
  asyncHandler(async (req, res) => {
    const landingPage = await updateLandingPageForUser(req.auth.workspaceId, req.body || {});
    res.json({ landingPage });
  })
);

router.get(
  "/leads",
  asyncHandler(async (req, res) => {
    const status = assertOptionalString(req.query.status, "status", { max: 20 }) || "all";
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 300 })
      : 100;
    const leads = await listLandingPageLeadsForUser(req.auth.workspaceId, { status, limit });
    res.json({ leads, status, limit });
  })
);

router.patch(
  "/leads/:leadId",
  asyncHandler(async (req, res) => {
    const status = assertOptionalString(req.body?.status, "status", { max: 20 });
    const lead = await updateLandingLeadStatusForUser(
      req.auth.workspaceId,
      req.params.leadId,
      status
    );
    res.json({ lead });
  })
);

module.exports = router;
