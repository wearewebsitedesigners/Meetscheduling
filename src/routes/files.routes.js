const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertOptionalString } = require("../utils/validation");
const {
  listFiles,
  createFolder,
  uploadFile,
  updateFile,
  deleteFile,
} = require("../services/files-gallery.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  requirePermission("files.read"),
  asyncHandler(async (req, res) => {
    const folderId = assertOptionalString(req.query.folderId, "folderId", { max: 80 });
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const includeDeleted = String(req.query.includeDeleted || "").toLowerCase() === "true";

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
  asyncHandler(async (req, res) => {
    const folder = await createFolder(req.auth.workspaceId, req.auth.userId, req.body || {});
    res.status(201).json({ folder });
  })
);

router.post(
  "/upload",
  requirePermission("files.write"),
  asyncHandler(async (req, res) => {
    const file = await uploadFile(req.auth.workspaceId, req.auth.userId, req.body || {});
    res.status(201).json({ file });
  })
);

router.patch(
  "/:id",
  requirePermission("files.write"),
  asyncHandler(async (req, res) => {
    const file = await updateFile(req.auth.workspaceId, req.params.id, req.body || {});
    res.json({ file });
  })
);

router.delete(
  "/:id",
  requirePermission("files.write"),
  asyncHandler(async (req, res) => {
    const result = await deleteFile(req.auth.workspaceId, req.params.id);
    res.json(result);
  })
);

module.exports = router;
