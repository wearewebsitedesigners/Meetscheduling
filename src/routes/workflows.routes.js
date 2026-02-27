const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertOptionalString } = require("../utils/validation");
const {
  listWorkflowTemplates,
  listWorkflowsForUser,
  createWorkflowForUser,
  updateWorkflowForUser,
  runWorkflowForUser,
  duplicateWorkflowForUser,
  deleteWorkflowForUser,
} = require("../services/workflows.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/templates",
  asyncHandler(async (_req, res) => {
    const templates = listWorkflowTemplates();
    res.json({ templates });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const filter = assertOptionalString(req.query.filter, "filter", { max: 20 }) || "all";
    const workflows = await listWorkflowsForUser(req.auth.userId, { search, filter });
    res.json({ workflows, filter, search });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const workflow = await createWorkflowForUser(req.auth.userId, req.body || {});
    res.status(201).json({ workflow });
  })
);

router.patch(
  "/:workflowId",
  asyncHandler(async (req, res) => {
    const workflow = await updateWorkflowForUser(
      req.auth.userId,
      req.params.workflowId,
      req.body || {}
    );
    res.json({ workflow });
  })
);

router.post(
  "/:workflowId/run",
  asyncHandler(async (req, res) => {
    const workflow = await runWorkflowForUser(req.auth.userId, req.params.workflowId);
    res.json({ workflow });
  })
);

router.post(
  "/:workflowId/duplicate",
  asyncHandler(async (req, res) => {
    const workflow = await duplicateWorkflowForUser(req.auth.userId, req.params.workflowId);
    res.status(201).json({ workflow });
  })
);

router.delete(
  "/:workflowId",
  asyncHandler(async (req, res) => {
    const result = await deleteWorkflowForUser(req.auth.userId, req.params.workflowId);
    res.json(result);
  })
);

module.exports = router;
