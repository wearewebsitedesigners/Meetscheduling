const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertInteger, assertOptionalString } = require("../utils/validation");
const {
  listPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
} = require("../services/posts.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  requirePermission("posts.read"),
  asyncHandler(async (req, res) => {
    const status = assertOptionalString(req.query.status, "status", { max: 20 }) || "all";
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 300 })
      : 100;

    const posts = await listPosts(req.auth.workspaceId, { status, search, limit });
    res.json({ posts, status, search, limit });
  })
);

router.post(
  "/",
  requirePermission("posts.write"),
  asyncHandler(async (req, res) => {
    const post = await createPost(req.auth.workspaceId, req.auth.userId, req.body || {});
    res.status(201).json({ post });
  })
);

router.get(
  "/:id",
  requirePermission("posts.read"),
  asyncHandler(async (req, res) => {
    const post = await getPost(req.auth.workspaceId, req.params.id);
    res.json({ post });
  })
);

router.patch(
  "/:id",
  requirePermission("posts.write"),
  asyncHandler(async (req, res) => {
    const post = await updatePost(
      req.auth.workspaceId,
      req.auth.userId,
      req.params.id,
      req.body || {}
    );
    res.json({ post });
  })
);

router.delete(
  "/:id",
  requirePermission("posts.write"),
  asyncHandler(async (req, res) => {
    const result = await deletePost(req.auth.workspaceId, req.params.id);
    res.json(result);
  })
);

module.exports = router;
