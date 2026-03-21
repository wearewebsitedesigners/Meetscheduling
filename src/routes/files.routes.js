const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rate-limit");
const { assertOptionalBooleanString, assertOptionalString } = require("../utils/validation");
const { logSecurityEvent } = require("../utils/security-log");
const {
  listFiles,
  createFolder,
  uploadFile,
  updateFile,
  deleteFile,
} = require("../services/files-gallery.service");

const router = express.Router();
router.use(requireAuth);

const fileWriteRateLimit = createRateLimiter({
  key: "files-write",
  windowMs: 10 * 60 * 1000,
  maxRequests: 40,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many file operations. Please wait before trying again.",
  keyFn: (req) => `${String(req.ip || "").trim() || "unknown"}:${req.auth?.userId || "anon"}`,
  onLimit: (req, meta) => {
    logSecurityEvent("traffic.file_write_rate_limited", {
      requestId: req.id || "",
      ip: String(req.ip || "").trim() || "unknown",
      userId: req.auth?.userId || "",
      retryAfterSeconds: meta.retryAfterSeconds,
      path: req.originalUrl || req.url || "",
    }, { level: "warn" });
  },
});

router.get(
  "/",
  requirePermission("files.read"),
  asyncHandler(async (req, res) => {
    const folderId = assertOptionalString(req.query.folderId, "folderId", { max: 80 });
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const includeDeleted = assertOptionalBooleanString(
      req.query.includeDeleted,
      "includeDeleted"
    ) || false;

    const data = await listFiles(req.auth.workspaceId, {
      folderId,
      search,
      includeDeleted,
    });

    res.json(data);
  })
);

router.post(
  "/folder",
  requirePermission("files.write"),
  fileWriteRateLimit,
  asyncHandler(async (req, res) => {
    const folder = await createFolder(req.auth.workspaceId, req.auth.userId, req.body || {});
    res.status(201).json({ folder });
  })
);

router.post(
  "/upload",
  requirePermission("files.write"),
  fileWriteRateLimit,
  asyncHandler(async (req, res) => {
    const file = await uploadFile(req.auth.workspaceId, req.auth.userId, req.body || {});
    res.status(201).json({ file });
  })
);

router.patch(
  "/:id",
  requirePermission("files.write"),
  fileWriteRateLimit,
  asyncHandler(async (req, res) => {
    const file = await updateFile(req.auth.workspaceId, req.params.id, req.body || {});
    res.json({ file });
  })
);

router.delete(
  "/:id",
  requirePermission("files.write"),
  fileWriteRateLimit,
  asyncHandler(async (req, res) => {
    const result = await deleteFile(req.auth.workspaceId, req.params.id);
    res.json(result);
  })
);

module.exports = router;
