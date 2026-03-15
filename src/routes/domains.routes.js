const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const domainVerifyRateLimit = require("../middleware/domain-verify-rate-limit");
const {
  createDomainForUser,
  deleteDomainForUser,
  getDomainForUser,
  listDomainsForUser,
  listDomainTargetOptionsForUser,
  updateDomainForUser,
  verifyDomainForUser,
} = require("../services/domains.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const domains = await listDomainsForUser(req.auth.workspaceId);
    res.json({ domains });
  })
);

router.get(
  "/targets",
  asyncHandler(async (req, res) => {
    const targets = await listDomainTargetOptionsForUser(req.auth.workspaceId);
    res.json(targets);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const domain = await createDomainForUser(
      req.auth.workspaceId,
      req.auth.userId,
      req.body || {}
    );
    res.status(201).json({ domain });
  })
);

router.post(
  "/:id/verify",
  domainVerifyRateLimit,
  asyncHandler(async (req, res) => {
    const result = await verifyDomainForUser(req.auth.workspaceId, req.params.id);
    res.json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const domain = await getDomainForUser(req.auth.workspaceId, req.params.id);
    res.json({ domain });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const domain = await updateDomainForUser(
      req.auth.workspaceId,
      req.params.id,
      req.body || {}
    );
    res.json({ domain });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await deleteDomainForUser(req.auth.workspaceId, req.params.id);
    res.json(result);
  })
);

module.exports = router;
