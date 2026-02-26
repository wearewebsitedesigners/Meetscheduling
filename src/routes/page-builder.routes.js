const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const {
  listPagesForUser,
  getPageDraftByIdForUser,
  updatePageDraftByIdForUser,
  publishPageByIdForUser,
  restorePageVersionByHistoryIdForUser,
} = require("../services/page-builder.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const pages = await listPagesForUser(req.auth.userId);
    res.json({ pages });
  })
);

router.get(
  "/:pageId/draft",
  asyncHandler(async (req, res) => {
    const payload = await getPageDraftByIdForUser(req.auth.userId, req.params.pageId);
    res.json(payload);
  })
);

router.put(
  "/:pageId/draft",
  asyncHandler(async (req, res) => {
    const payload = await updatePageDraftByIdForUser(
      req.auth.userId,
      req.params.pageId,
      req.body || {}
    );
    res.json(payload);
  })
);

router.post(
  "/:pageId/publish",
  asyncHandler(async (req, res) => {
    const payload = await publishPageByIdForUser(req.auth.userId, req.params.pageId);
    res.json(payload);
  })
);

router.post(
  "/:pageId/restore/:historyId",
  asyncHandler(async (req, res) => {
    const payload = await restorePageVersionByHistoryIdForUser(
      req.auth.userId,
      req.params.pageId,
      req.params.historyId
    );
    res.json(payload);
  })
);

module.exports = router;
