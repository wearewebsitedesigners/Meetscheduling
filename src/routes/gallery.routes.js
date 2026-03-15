const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertInteger } = require("../utils/validation");
const {
  listGalleryItems,
  createGalleryItem,
  deleteGalleryItem,
} = require("../services/files-gallery.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/items",
  requirePermission("gallery.read"),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 300 })
      : 100;
    const items = await listGalleryItems(req.auth.workspaceId, { limit });
    res.json({ items, limit });
  })
);

router.post(
  "/items",
  requirePermission("gallery.write"),
  asyncHandler(async (req, res) => {
    const item = await createGalleryItem(req.auth.workspaceId, req.auth.userId, req.body || {});
    res.status(201).json({ item });
  })
);

router.delete(
  "/items/:id",
  requirePermission("gallery.write"),
  asyncHandler(async (req, res) => {
    const result = await deleteGalleryItem(req.auth.workspaceId, req.params.id);
    res.json(result);
  })
);

module.exports = router;
