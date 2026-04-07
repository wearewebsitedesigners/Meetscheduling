const { query, withTransaction } = require("../db/pool");
const { HttpError, badRequest } = require("../utils/http-error");

const PLAN_ORDER = Object.freeze(["BASIC", "POPULAR", "PRO", "ENTERPRISE"]);

const BASIC_FEATURES = Object.freeze([
  "booking_page",
  "services",
  "availability",
  "meetings",
  "contacts",
  "email_notifications",
]);

const POPULAR_FEATURES = Object.freeze([
  ...BASIC_FEATURES,
  "intake_forms",
  "payments",
  "remove_branding",
  "email_automations",
  "meeting_links",
  "round_robin_scheduling",
  "collective_events",
  "routing_forms",
  "teams_workflows",
  "team_scheduling",
]);

const PRO_FEATURES = Object.freeze([
  ...POPULAR_FEATURES,
  "sms_reminders",
  "packages_subscriptions",
  "custom_css",
  "api_access",
  "org_workflows",
  "org_subdomain",
  "saml_sso",
  "calendar_delegation",
  "member_attributes",
  "attribute_routing",
]);

const ENTERPRISE_FEATURES = Object.freeze([
  ...PRO_FEATURES,
  "dedicated_database",
  "ai_phone_agents",
  "active_directory_sync",
  "enterprise_support",
  "uptime_sla",
  "slack_connect",
  "compliance_soc2_hipaa_iso",
]);

const PLAN_ENTITLEMENTS = Object.freeze({
  BASIC: Object.freeze({
    planKey: "BASIC",
    staff_limit: 1,
    booking_pages_limit: 1,
    calendars_limit: 1,
    features: BASIC_FEATURES,
  }),
  POPULAR: Object.freeze({
    planKey: "POPULAR",
    staff_limit: 6,
    booking_pages_limit: 3,
    calendars_limit: 6,
    features: POPULAR_FEATURES,
  }),
  PRO: Object.freeze({
    planKey: "PRO",
    staff_limit: 36,
    booking_pages_limit: null,
    calendars_limit: 36,
    features: PRO_FEATURES,
  }),
  ENTERPRISE: Object.freeze({
    planKey: "ENTERPRISE",
    staff_limit: null,
    booking_pages_limit: null,
    calendars_limit: null,
    features: ENTERPRISE_FEATURES,
  }),
});

const CALENDAR_PROVIDERS = Object.freeze([
  "google-calendar",
  "office-365-calendar",
  "apple-calendar",
]);

function normalizePlanKey(input) {
  const raw = String(input || "")
    .trim()
    .toUpperCase();
  if (PLAN_ENTITLEMENTS[raw]) return raw;
  return "BASIC";
}

function parseNullableDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function pickEffectivePlan(planKey, status) {
  if (String(status || "").toLowerCase() === "active") {
    return normalizePlanKey(planKey);
  }
  return "BASIC";
}

function getEntitlementsForPlan(planKey) {
  return PLAN_ENTITLEMENTS[normalizePlanKey(planKey)];
}

function canUseFeature(entitlements, featureKey) {
  if (!entitlements || !featureKey) return false;
  return entitlements.features.includes(String(featureKey).trim());
}

function resolveRequiredPlanForFeature(featureKey) {
  const key = String(featureKey || "").trim();
  if (!key) return "BASIC";
  for (const planKey of PLAN_ORDER) {
    const features = PLAN_ENTITLEMENTS[planKey].features;
    if (features.includes(key)) {
      return planKey;
    }
  }
  return "PRO";
}

function resolveRequiredPlanForLimitValue(limitKey, desiredValue) {
  const key = String(limitKey || "").trim();
  const nextValue = Number.isFinite(Number(desiredValue)) ? Number(desiredValue) : 0;
  for (const planKey of PLAN_ORDER) {
    const limit = PLAN_ENTITLEMENTS[planKey][key];
    if (limit === null) return planKey;
    if (Number.isFinite(Number(limit)) && nextValue <= Number(limit)) {
      return planKey;
    }
  }
  return "PRO";
}

async function getWorkspaceSubscription(workspaceId, client = null) {
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
  const row = result.rows[0] || null;
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    planKey: normalizePlanKey(row.plan_key),
    status: String(row.status || "inactive").toLowerCase(),
    paypalSubscriptionId: row.paypal_subscription_id || null,
    paypalPayerId: row.paypal_payer_id || null,
    currentPeriodStart: parseNullableDate(row.current_period_start),
    currentPeriodEnd: parseNullableDate(row.current_period_end),
    cancelAtPeriodEnd: !!row.cancel_at_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getEntitlements(workspaceId, client = null) {
  if (!workspaceId) throw badRequest("workspaceId is required");
  const subscription = await getWorkspaceSubscription(workspaceId, client);
  const billedPlanKey = normalizePlanKey(subscription?.planKey || "BASIC");
  const status = subscription?.status || "inactive";
  const effectivePlanKey = pickEffectivePlan(billedPlanKey, status);
  const plan = getEntitlementsForPlan(effectivePlanKey);

  return {
    workspaceId,
    status,
    planKey: effectivePlanKey,
    billedPlanKey,
    subscription,
    limits: {
      staff_limit: plan.staff_limit,
      booking_pages_limit: plan.booking_pages_limit,
      calendars_limit: plan.calendars_limit,
    },
    features: [...plan.features],
  };
}

function buildPlanLimitError({
  reason,
  requiredPlan = "PRO",
  limitKey = null,
  current = null,
  allowed = null,
}) {
  return new HttpError(402, "PLAN_LIMIT_OR_FEATURE", {
    reason,
    requiredPlan,
    limitKey,
    current,
    allowed,
  });
}

async function assertFeature(workspaceId, featureKey, client = null) {
  const key = String(featureKey || "").trim();
  if (!key) throw badRequest("featureKey is required");

  const entitlements = await getEntitlements(workspaceId, client);
  if (canUseFeature(entitlements, key)) {
    return entitlements;
  }

  const requiredPlan = resolveRequiredPlanForFeature(key);
  throw buildPlanLimitError({
    reason: `Feature '${key}' requires ${requiredPlan}`,
    requiredPlan,
  });
}

async function assertLimit(workspaceId, limitKey, currentCount, client = null) {
  const key = String(limitKey || "").trim();
  const current = Number.isFinite(Number(currentCount)) ? Number(currentCount) : 0;
  if (!key) throw badRequest("limitKey is required");

  const entitlements = await getEntitlements(workspaceId, client);
  const allowed = entitlements.limits[key];
  if (allowed === null) {
    return entitlements;
  }
  if (current < Number(allowed)) {
    return entitlements;
  }

  const requiredPlan = resolveRequiredPlanForLimitValue(key, current + 1);
  throw buildPlanLimitError({
    reason: `${key} exceeded`,
    requiredPlan,
    limitKey: key,
    current,
    allowed: Number(allowed),
  });
}

async function upsertUsageCounter(workspaceId, key, value, client = null) {
  await query(
    `
      INSERT INTO usage_counter (workspace_id, key, value, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (workspace_id, key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `,
    [workspaceId, key, value],
    client
  );
}

async function getUsageSnapshot(workspaceId) {
  if (!workspaceId) throw badRequest("workspaceId is required");

  return withTransaction(async (client) => {
    const [staffCountResult, pagesCountResult, calendarCountResult, entitlements] =
      await Promise.all([
        query(
          `
            SELECT COUNT(*)::int AS count
            FROM users
            WHERE id = $1
          `,
          [workspaceId],
          client
        ),
        query(
          `
            SELECT COUNT(*)::int AS count
            FROM booking_pages
            WHERE user_id = $1
          `,
          [workspaceId],
          client
        ),
        query(
          `
            SELECT COUNT(*)::int AS count
            FROM user_integrations
            WHERE user_id = $1
              AND connected = TRUE
              AND provider = ANY($2::text[])
          `,
          [workspaceId, CALENDAR_PROVIDERS],
          client
        ),
        getEntitlements(workspaceId, client),
      ]);

    const usage = {
      staff_count: Number(staffCountResult.rows[0]?.count || 0),
      booking_pages_count: Number(pagesCountResult.rows[0]?.count || 0),
      calendar_connections_count: Number(calendarCountResult.rows[0]?.count || 0),
    };

    await Promise.all([
      upsertUsageCounter(workspaceId, "staff_count", usage.staff_count, client),
      upsertUsageCounter(
        workspaceId,
        "booking_pages_count",
        usage.booking_pages_count,
        client
      ),
      upsertUsageCounter(
        workspaceId,
        "calendar_connections_count",
        usage.calendar_connections_count,
        client
      ),
    ]);

    const limits = entitlements.limits;
    const nearLimit = Object.entries(usage).some(([key, value]) => {
      const limitKey =
        key === "staff_count"
          ? "staff_limit"
          : key === "booking_pages_count"
            ? "booking_pages_limit"
            : "calendars_limit";
      const allowed = limits[limitKey];
      if (allowed === null) return false;
      if (allowed <= 0) return true;
      return value / allowed >= 0.8;
    });

    return {
      usage,
      limits,
      nearLimit,
      planKey: entitlements.planKey,
      billedPlanKey: entitlements.billedPlanKey,
      status: entitlements.status,
    };
  });
}

module.exports = {
  PLAN_ENTITLEMENTS,
  PLAN_ORDER,
  normalizePlanKey,
  canUseFeature,
  getEntitlementsForPlan,
  resolveRequiredPlanForFeature,
  resolveRequiredPlanForLimitValue,
  getWorkspaceSubscription,
  getEntitlements,
  buildPlanLimitError,
  assertFeature,
  assertLimit,
  getUsageSnapshot,
};
