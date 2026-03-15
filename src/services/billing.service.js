const env = require("../config/env");
const { query, withTransaction } = require("../db/pool");
const { HttpError, badRequest, conflict, notFound } = require("../utils/http-error");
const { paypalFetch } = require("./paypal-client.service");
const { ensurePlansExist, getPayPalConfig } = require("./paypal-catalog.service");
const { getEntitlements, getUsageSnapshot, normalizePlanKey } = require("./entitlements.service");

function parseDateOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function mapPayPalStatusToLocal(status, fallback = "inactive") {
  const raw = String(status || "").trim().toUpperCase();
  if (raw === "ACTIVE") return "active";
  if (raw === "APPROVAL_PENDING") return "inactive";
  if (raw === "SUSPENDED") return "suspended";
  if (raw === "CANCELLED") return "cancelled";
  if (raw === "EXPIRED") return "cancelled";
  return fallback;
}

function isFuture(date) {
  if (!(date instanceof Date)) return false;
  return date.getTime() > Date.now();
}

function mapSubscriptionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    planKey: normalizePlanKey(row.plan_key),
    status: String(row.status || "inactive").toLowerCase(),
    paypalSubscriptionId: row.paypal_subscription_id || null,
    paypalPayerId: row.paypal_payer_id || null,
    currentPeriodStart: parseDateOrNull(row.current_period_start),
    currentPeriodEnd: parseDateOrNull(row.current_period_end),
    cancelAtPeriodEnd: !!row.cancel_at_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getWorkspaceSubscriptionByWorkspaceId(workspaceId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        provider,
        plan_key,
        status,
        paypal_subscription_id,
        paypal_payer_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
      FROM workspace_subscription
      WHERE workspace_id = $1
      LIMIT 1
    `,
    [workspaceId],
    client
  );
  return mapSubscriptionRow(result.rows[0] || null);
}

async function getWorkspaceSubscriptionByPayPalSubscriptionId(paypalSubscriptionId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        provider,
        plan_key,
        status,
        paypal_subscription_id,
        paypal_payer_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
      FROM workspace_subscription
      WHERE paypal_subscription_id = $1
      LIMIT 1
    `,
    [paypalSubscriptionId],
    client
  );
  return mapSubscriptionRow(result.rows[0] || null);
}

function resolveWorkspaceIdForRequest(authUserId, requestedWorkspaceId) {
  const fromBody = String(requestedWorkspaceId || "").trim();
  const effectiveWorkspaceId = fromBody || String(authUserId || "").trim();
  if (!effectiveWorkspaceId) {
    throw badRequest("workspaceId is required");
  }
  if (String(authUserId || "").trim() !== effectiveWorkspaceId) {
    throw new HttpError(403, "Forbidden");
  }
  return effectiveWorkspaceId;
}

async function resolvePlanIds(client = null) {
  const catalog = await ensurePlansExist(client);
  return catalog.planIds;
}

async function resolvePlanKeyFromPayPalPlanId(paypalPlanId, client = null) {
  const target = String(paypalPlanId || "").trim();
  if (!target) return null;

  const row = await getPayPalConfig(client);
  const basicPlanId = row?.basic_plan_id || env.paypal.basicPlanId;
  const popularPlanId = row?.popular_plan_id || env.paypal.popularPlanId;
  const proPlanId = row?.pro_plan_id || env.paypal.proPlanId;

  if (target === basicPlanId) return "BASIC";
  if (target === popularPlanId) return "POPULAR";
  if (target === proPlanId) return "PRO";
  return null;
}

async function upsertWorkspaceSubscription(workspaceId, payload, client = null) {
  const {
    planKey,
    status = "inactive",
    paypalSubscriptionId = null,
    paypalPayerId = null,
    currentPeriodStart = null,
    currentPeriodEnd = null,
    cancelAtPeriodEnd = false,
  } = payload || {};
  const safePlanKey = normalizePlanKey(planKey);
  const safeStatus = String(status || "inactive").toLowerCase();

  const result = await query(
    `
      INSERT INTO workspace_subscription (
        workspace_id,
        provider,
        plan_key,
        status,
        paypal_subscription_id,
        paypal_payer_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        updated_at
      )
      VALUES ($1, 'paypal', $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (workspace_id)
      DO UPDATE SET
        plan_key = EXCLUDED.plan_key,
        status = EXCLUDED.status,
        paypal_subscription_id = EXCLUDED.paypal_subscription_id,
        paypal_payer_id = EXCLUDED.paypal_payer_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW()
      RETURNING
        id,
        workspace_id,
        provider,
        plan_key,
        status,
        paypal_subscription_id,
        paypal_payer_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
    `,
    [
      workspaceId,
      safePlanKey,
      safeStatus,
      paypalSubscriptionId,
      paypalPayerId,
      currentPeriodStart,
      currentPeriodEnd,
      !!cancelAtPeriodEnd,
    ],
    client
  );

  return mapSubscriptionRow(result.rows[0]);
}

async function createPayPalSubscription({
  workspaceId,
  planKey,
  payerEmail = "",
}) {
  const selectedPlanKey = normalizePlanKey(planKey);
  return withTransaction(async (client) => {
    const existing = await getWorkspaceSubscriptionByWorkspaceId(workspaceId, client);
    if (existing && existing.status === "active" && existing.cancelAtPeriodEnd === false) {
      throw conflict("Active subscription already exists for this workspace");
    }

    const planIds = await resolvePlanIds(client);
    const paypalPlanId = planIds[selectedPlanKey];
    if (!paypalPlanId) {
      throw badRequest(`PayPal plan id for ${selectedPlanKey} is not configured`);
    }

    const base = String(env.appBaseUrl || "http://localhost:8080").replace(/\/+$/, "");
    const encodedWorkspace = encodeURIComponent(workspaceId);
    const encodedPlan = encodeURIComponent(selectedPlanKey);

    const payload = {
      plan_id: paypalPlanId,
      custom_id: workspaceId,
      application_context: {
        brand_name: "MeetScheduling",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: `${base}/pricing?paypal=success&workspaceId=${encodedWorkspace}&planKey=${encodedPlan}`,
        cancel_url: `${base}/pricing?paypal=cancelled&workspaceId=${encodedWorkspace}&planKey=${encodedPlan}`,
      },
    };

    if (payerEmail) {
      payload.subscriber = {
        email_address: String(payerEmail).trim().toLowerCase(),
      };
    }

    const response = await paypalFetch("/v1/billing/subscriptions", "POST", payload);
    const subscriptionId = String(response.data?.id || "").trim();
    if (!subscriptionId) {
      throw badRequest("PayPal subscription id missing");
    }

    const approveUrl =
      response.data?.links?.find((item) => item.rel === "approve")?.href || null;

    await upsertWorkspaceSubscription(
      workspaceId,
      {
        planKey: selectedPlanKey,
        status: "inactive",
        paypalSubscriptionId: subscriptionId,
        paypalPayerId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      client
    );

    return {
      subscriptionId,
      approveUrl,
      planKey: selectedPlanKey,
      paypalPlanId,
    };
  });
}

async function fetchPayPalSubscription(subscriptionId) {
  const safeId = String(subscriptionId || "").trim();
  if (!safeId) throw badRequest("subscriptionId is required");
  const response = await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(safeId)}`, "GET");
  return response.data || {};
}

function derivePeriodWindowFromPayPalPayload(payload = {}) {
  const billingInfo = payload?.billing_info || {};
  const start =
    parseDateOrNull(billingInfo?.last_payment?.time) ||
    parseDateOrNull(payload?.start_time) ||
    parseDateOrNull(payload?.create_time);
  const end = parseDateOrNull(billingInfo?.next_billing_time);
  return {
    currentPeriodStart: start,
    currentPeriodEnd: end,
  };
}

async function syncSubscriptionFromPayPal(subscriptionId, fallbackWorkspaceId = null, client = null) {
  const remote = await fetchPayPalSubscription(subscriptionId);
  const paypalSubscriptionId = String(remote?.id || subscriptionId || "").trim();
  if (!paypalSubscriptionId) throw badRequest("subscriptionId is required");

  const remotePlanId = String(remote?.plan_id || "").trim();
  const planKey = (await resolvePlanKeyFromPayPalPlanId(remotePlanId, client)) || "BASIC";
  const localStatus = mapPayPalStatusToLocal(remote?.status, "inactive");
  const payerId = String(remote?.subscriber?.payer_id || "").trim() || null;
  const customId = String(remote?.custom_id || "").trim();
  const workspaceId = customId || fallbackWorkspaceId;
  if (!workspaceId) {
    throw badRequest("Unable to resolve workspace for subscription");
  }

  const period = derivePeriodWindowFromPayPalPayload(remote);
  const existing = await getWorkspaceSubscriptionByWorkspaceId(workspaceId, client);

  let status = localStatus;
  let cancelAtPeriodEnd = false;
  if (localStatus === "cancelled" && isFuture(period.currentPeriodEnd)) {
    status = "active";
    cancelAtPeriodEnd = true;
  } else if (existing?.cancelAtPeriodEnd && status === "active") {
    cancelAtPeriodEnd = true;
  }

  const subscription = await upsertWorkspaceSubscription(
    workspaceId,
    {
      planKey,
      status,
      paypalSubscriptionId,
      paypalPayerId: payerId || existing?.paypalPayerId || null,
      currentPeriodStart: period.currentPeriodStart || existing?.currentPeriodStart || null,
      currentPeriodEnd: period.currentPeriodEnd || existing?.currentPeriodEnd || null,
      cancelAtPeriodEnd,
    },
    client
  );

  return {
    remote,
    subscription,
  };
}

async function cancelWorkspaceSubscription(workspaceId, reason = "Cancelled by workspace owner") {
  return withTransaction(async (client) => {
    const subscription = await getWorkspaceSubscriptionByWorkspaceId(workspaceId, client);
    if (!subscription || !subscription.paypalSubscriptionId) {
      throw notFound("No PayPal subscription found");
    }
    await paypalFetch(
      `/v1/billing/subscriptions/${encodeURIComponent(subscription.paypalSubscriptionId)}/cancel`,
      "POST",
      {
        reason: String(reason || "Cancelled by workspace owner").slice(0, 120),
      }
    );

    const updated = await upsertWorkspaceSubscription(
      workspaceId,
      {
        planKey: subscription.planKey,
        status: subscription.status === "active" ? "active" : "cancelled",
        paypalSubscriptionId: subscription.paypalSubscriptionId,
        paypalPayerId: subscription.paypalPayerId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: true,
      },
      client
    );

    return updated;
  });
}

async function verifyPayPalWebhookSignature({
  transmissionId,
  transmissionTime,
  transmissionSig,
  certUrl,
  authAlgo,
  webhookEvent,
}) {
  if (!env.paypal.webhookId) {
    throw badRequest("PAYPAL_WEBHOOK_ID is not configured");
  }

  const response = await paypalFetch("/v1/notifications/verify-webhook-signature", "POST", {
    transmission_id: transmissionId,
    transmission_time: transmissionTime,
    cert_url: certUrl,
    auth_algo: authAlgo,
    transmission_sig: transmissionSig,
    webhook_id: env.paypal.webhookId,
    webhook_event: webhookEvent,
  });

  return String(response.data?.verification_status || "").toUpperCase() === "SUCCESS";
}

function extractResourceId(eventPayload) {
  const resource = eventPayload?.resource || {};
  const primary = String(resource.id || "").trim();
  if (primary) return primary;
  const fallback = String(resource.billing_agreement_id || "").trim();
  if (fallback) return fallback;
  return null;
}

async function logBillingEventIfFirst(eventPayload, client = null) {
  const eventId = String(eventPayload?.id || "").trim();
  const eventType = String(eventPayload?.event_type || "").trim();
  if (!eventId || !eventType) {
    throw badRequest("Invalid PayPal webhook event payload");
  }

  const resourceId = extractResourceId(eventPayload);
  const result = await query(
    `
      INSERT INTO billing_event_log (
        provider,
        event_id,
        event_type,
        resource_id,
        payload_json,
        processed_at
      )
      VALUES ('paypal', $1, $2, $3, $4::jsonb, NOW())
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id
    `,
    [eventId, eventType, resourceId, JSON.stringify(eventPayload)],
    client
  );
  return Boolean(result.rows[0]);
}

async function markPastDueByPayPalSubscriptionId(paypalSubscriptionId, client = null) {
  const existing = await getWorkspaceSubscriptionByPayPalSubscriptionId(paypalSubscriptionId, client);
  if (!existing) return null;
  return upsertWorkspaceSubscription(
    existing.workspaceId,
    {
      planKey: existing.planKey,
      status: "past_due",
      paypalSubscriptionId: existing.paypalSubscriptionId,
      paypalPayerId: existing.paypalPayerId,
      currentPeriodStart: existing.currentPeriodStart,
      currentPeriodEnd: existing.currentPeriodEnd,
      cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
    },
    client
  );
}

async function processPayPalWebhookEvent(eventPayload) {
  return withTransaction(async (client) => {
    const isFirst = await logBillingEventIfFirst(eventPayload, client);
    if (!isFirst) {
      return { duplicate: true };
    }

    const eventType = String(eventPayload?.event_type || "").trim();
    const subscriptionId = extractResourceId(eventPayload);
    if (!subscriptionId) {
      return { duplicate: false, ignored: true };
    }

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "PAYMENT.SALE.COMPLETED": {
        const synced = await syncSubscriptionFromPayPal(subscriptionId, null, client);
        return {
          duplicate: false,
          handled: true,
          subscription: synced.subscription,
        };
      }
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const updated = await markPastDueByPayPalSubscriptionId(subscriptionId, client);
        return {
          duplicate: false,
          handled: true,
          subscription: updated,
        };
      }
      default:
        return { duplicate: false, ignored: true };
    }
  });
}

async function getBillingSnapshot(workspaceId) {
  const [entitlements, usage, subscription] = await Promise.all([
    getEntitlements(workspaceId),
    getUsageSnapshot(workspaceId),
    getWorkspaceSubscriptionByWorkspaceId(workspaceId),
  ]);
  return {
    workspaceId,
    entitlements,
    usage,
    subscription,
  };
}

module.exports = {
  mapPayPalStatusToLocal,
  resolveWorkspaceIdForRequest,
  resolvePlanKeyFromPayPalPlanId,
  getWorkspaceSubscriptionByWorkspaceId,
  getWorkspaceSubscriptionByPayPalSubscriptionId,
  upsertWorkspaceSubscription,
  createPayPalSubscription,
  fetchPayPalSubscription,
  syncSubscriptionFromPayPal,
  cancelWorkspaceSubscription,
  verifyPayPalWebhookSignature,
  processPayPalWebhookEvent,
  getBillingSnapshot,
};
