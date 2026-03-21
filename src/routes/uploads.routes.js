const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rate-limit");
const { uploadImageForUser } = require("../services/upload.service");
const { logSecurityEvent } = require("../utils/security-log");

const router = express.Router();
router.use(requireAuth);

const uploadRateLimit = createRateLimiter({
  key: "uploads-images",
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many upload attempts. Please wait before uploading again.",
  keyFn: (req) => `${String(req.ip || "").trim() || "unknown"}:${req.auth?.userId || "anon"}`,
  onLimit: (req, meta) => {
    logSecurityEvent("traffic.upload_rate_limited", {
      requestId: req.id || "",
      ip: String(req.ip || "").trim() || "unknown",
      userId: req.auth?.userId || "",
      retryAfterSeconds: meta.retryAfterSeconds,
    }, { level: "warn" });
  },
});

router.post(
  "/images",
  uploadRateLimit,
  asyncHandler(async (req, res) => {
    const payload = await uploadImageForUser(req.auth.userId, req.body || {});
    res.status(201).json(payload);
  })
);

module.exports = router;
