const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { assertInteger, assertOptionalString } = require("../utils/validation");
const {
  listInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  issueInvoice,
  markInvoicePaid,
} = require("../services/invoices.service");
const { recordAuditEvent } = require("../services/audit.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  requirePermission("invoices.read"),
  asyncHandler(async (req, res) => {
    const status = assertOptionalString(req.query.status, "status", { max: 20 }) || "all";
    const search = assertOptionalString(req.query.search, "search", { max: 220 });
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 400 })
      : 100;

    const invoices = await listInvoices(req.auth.workspaceId, { status, search, limit });
    res.json({ invoices, status, search, limit });
  })
);

router.post(
  "/",
  requirePermission("invoices.write"),
  asyncHandler(async (req, res) => {
    const invoice = await createInvoice(req.auth.workspaceId, req.auth.userId, req.body || {});

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "invoice.created",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.status(201).json({ invoice });
  })
);

router.get(
  "/:id",
  requirePermission("invoices.read"),
  asyncHandler(async (req, res) => {
    const invoice = await getInvoice(req.auth.workspaceId, req.params.id);
    res.json({ invoice });
  })
);

router.patch(
  "/:id",
  requirePermission("invoices.write"),
  asyncHandler(async (req, res) => {
    const invoice = await updateInvoice(
      req.auth.workspaceId,
      req.auth.userId,
      req.params.id,
      req.body || {}
    );

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "invoice.updated",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.json({ invoice });
  })
);

router.post(
  "/:id/issue",
  requirePermission("invoices.write"),
  asyncHandler(async (req, res) => {
    const invoice = await issueInvoice(req.auth.workspaceId, req.auth.userId, req.params.id);

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "invoice.issued",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.json({ invoice });
  })
);

router.post(
  "/:id/mark-paid",
  requirePermission("invoices.write"),
  asyncHandler(async (req, res) => {
    const invoice = await markInvoicePaid(
      req.auth.workspaceId,
      req.auth.userId,
      req.params.id,
      req.body || {}
    );

    await recordAuditEvent({
      workspaceId: req.auth.workspaceId,
      actorUserId: req.auth.userId,
      action: "invoice.paid",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        amountPaid: invoice.amountPaid,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.json({ invoice });
  })
);

module.exports = router;
