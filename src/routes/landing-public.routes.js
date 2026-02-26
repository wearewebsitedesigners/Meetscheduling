const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const publicRateLimit = require("../middleware/public-rate-limit");
const { getPublishedPageBySlug } = require("../services/landing-builder.service");

const router = express.Router();
router.use(publicRateLimit);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const payload = await getPublishedPageBySlug(req.params.slug);
    res.json(payload);
  })
);

module.exports = router;
