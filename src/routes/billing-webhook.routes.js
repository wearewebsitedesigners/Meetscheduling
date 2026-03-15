const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { badRequest } = require("../utils/http-error");
const {
  verifyPayPalWebhookSignature,
  processPayPalWebhookEvent,
} = require("../services/billing.service");

const router = express.Router();

function readHeader(req, name) {
  return String(req.headers[name.toLowerCase()] || "").trim();
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "");
    if (!rawBody) {
      throw badRequest("Missing PayPal webhook payload");
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw badRequest("Invalid PayPal webhook JSON");
    }

    const transmissionId = readHeader(req, "paypal-transmission-id");
    const transmissionTime = readHeader(req, "paypal-transmission-time");
    const transmissionSig = readHeader(req, "paypal-transmission-sig");
    const certUrl = readHeader(req, "paypal-cert-url");
    const authAlgo = readHeader(req, "paypal-auth-algo");

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      throw badRequest("Missing PayPal webhook verification headers");
    }

    const verified = await verifyPayPalWebhookSignature({
      transmissionId,
      transmissionTime,
      transmissionSig,
      certUrl,
      authAlgo,
      webhookEvent: payload,
    });
    if (!verified) {
      return res.status(400).json({
        error: "Invalid PayPal webhook signature",
      });
    }

    const result = await processPayPalWebhookEvent(payload);
    return res.json({
      ok: true,
      duplicate: !!result?.duplicate,
      handled: !!result?.handled,
      ignored: !!result?.ignored,
    });
  })
);

module.exports = router;
