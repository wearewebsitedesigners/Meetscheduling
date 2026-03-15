const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { uploadImageForUser } = require("../services/upload.service");

const router = express.Router();
router.use(requireAuth);

router.post(
  "/images",
  asyncHandler(async (req, res) => {
    const payload = await uploadImageForUser(req.auth.userId, req.body || {});
    res.status(201).json(payload);
  })
);

module.exports = router;
