const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertInteger } = require("../utils/validation");
const { listInvoiceTemplates, createInvoiceTemplate } = require("../services/invoices.service");
const { recordAuditEvent } = require("../services/audit.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  requirePermission("invoices.read"),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 300 })
      : 100;

    const templates = await listInvoiceTemplates(req.auth.workspaceId, { limit });
    res.json({ templates, limit });
  })
);

router.post(
  "/",
  requirePermission("invoices.write"),
  asyncHandler(async (req, res) => {
    const template = await createInvoiceTemplate(
      req.auth.workspaceId,
      req.auth.userId,
      req.body || {}
    );

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "invoice.template.created",
      resourceType: "invoice_template",
      resourceId: template.id,
      metadata: {
        name: template.name,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.status(201).json({ template });
  })
);

module.exports = router;
