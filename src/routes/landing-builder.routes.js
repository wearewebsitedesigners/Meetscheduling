const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const {
  listPagesForUser,
  createPageForUser,
  getPageDraftByIdForUser,
  updatePageDraftByIdForUser,
  publishPageByIdForUser,
  restorePageVersionByHistoryIdForUser,
  listCategoriesForUser,
  createCategoryForUser,
  updateCategoryForUser,
  deleteCategoryForUser,
  listServicesForUser,
  createServiceForUser,
  updateServiceForUser,
  deleteServiceForUser,
  listReviewsForUser,
  createReviewForUser,
  updateReviewForUser,
  deleteReviewForUser,
} = require("../services/landing-builder.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const pages = await listPagesForUser(req.auth.userId);
    res.json({ pages });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = await createPageForUser(req.auth.userId, req.body || {});
    res.status(payload?.created === false ? 200 : 201).json(payload);
  })
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const categories = await listCategoriesForUser(req.auth.userId);
    res.json({ categories });
  })
);

router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const category = await createCategoryForUser(req.auth.userId, req.body || {});
    res.status(201).json({ category });
  })
);

router.put(
  "/categories/:categoryId",
  asyncHandler(async (req, res) => {
    const category = await updateCategoryForUser(
      req.auth.userId,
      req.params.categoryId,
      req.body || {}
    );
    res.json({ category });
  })
);

router.delete(
  "/categories/:categoryId",
  asyncHandler(async (req, res) => {
    const payload = await deleteCategoryForUser(req.auth.userId, req.params.categoryId);
    res.json(payload);
  })
);

router.get(
  "/services",
  asyncHandler(async (req, res) => {
    const services = await listServicesForUser(req.auth.userId);
    res.json({ services });
  })
);

router.post(
  "/services",
  asyncHandler(async (req, res) => {
    const service = await createServiceForUser(req.auth.userId, req.body || {});
    res.status(201).json({ service });
  })
);

router.put(
  "/services/:serviceId",
  asyncHandler(async (req, res) => {
    const service = await updateServiceForUser(
      req.auth.userId,
      req.params.serviceId,
      req.body || {}
    );
    res.json({ service });
  })
);

router.delete(
  "/services/:serviceId",
  asyncHandler(async (req, res) => {
    const payload = await deleteServiceForUser(req.auth.userId, req.params.serviceId);
    res.json(payload);
  })
);

router.get(
  "/reviews",
  asyncHandler(async (req, res) => {
    const reviews = await listReviewsForUser(req.auth.userId);
    res.json({ reviews });
  })
);

router.post(
  "/reviews",
  asyncHandler(async (req, res) => {
    const review = await createReviewForUser(req.auth.userId, req.body || {});
    res.status(201).json({ review });
  })
);

router.put(
  "/reviews/:reviewId",
  asyncHandler(async (req, res) => {
    const review = await updateReviewForUser(
      req.auth.userId,
      req.params.reviewId,
      req.body || {}
    );
    res.json({ review });
  })
);

router.delete(
  "/reviews/:reviewId",
  asyncHandler(async (req, res) => {
    const payload = await deleteReviewForUser(req.auth.userId, req.params.reviewId);
    res.json(payload);
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
