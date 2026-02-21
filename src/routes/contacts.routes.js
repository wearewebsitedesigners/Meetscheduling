const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertOptionalString } = require("../utils/validation");
const {
  listContactsForUser,
  createContactForUser,
  updateContactForUser,
  deleteContactForUser,
} = require("../services/contacts.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const filter = assertOptionalString(req.query.filter, "filter", { max: 20 }) || "all";
    const contacts = await listContactsForUser(req.auth.userId, { search, filter });
    res.json({ contacts, filter, search });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const contact = await createContactForUser(req.auth.userId, req.body || {});
    res.status(201).json({ contact });
  })
);

router.patch(
  "/:contactId",
  asyncHandler(async (req, res) => {
    const contact = await updateContactForUser(
      req.auth.userId,
      req.params.contactId,
      req.body || {}
    );
    res.json({ contact });
  })
);

router.delete(
  "/:contactId",
  asyncHandler(async (req, res) => {
    const result = await deleteContactForUser(req.auth.userId, req.params.contactId);
    res.json(result);
  })
);

module.exports = router;

