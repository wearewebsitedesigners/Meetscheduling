const env = require("../config/env");
const { query, withTransaction } = require("../db/pool");
const { badRequest } = require("../utils/http-error");
const { paypalFetch } = require("./paypal-client.service");

const PRODUCT_NAME = "MeetScheduling SaaS";
const PRODUCT_DESCRIPTION =
  "Recurring subscriptions for MeetScheduling workspace plans.";

const PLAN_PRICES = Object.freeze({
  BASIC: () => String(env.paypal.basicPriceUsd || "15"),
  POPULAR: () => String(env.paypal.popularPriceUsd || "28"),
  PRO: () => String(env.paypal.proPriceUsd || "79"),
});

function isProdLike() {
  return String(env.nodeEnv || "development").toLowerCase() === "production";
}

function resolveConfigFromSources(row = null) {
  return {
    environment: row?.environment || env.paypal.env || "sandbox",
    productId: row?.product_id || env.paypal.productId || "",
    basicPlanId: row?.basic_plan_id || env.paypal.basicPlanId || "",
    popularPlanId: row?.popular_plan_id || env.paypal.popularPlanId || "",
    proPlanId: row?.pro_plan_id || env.paypal.proPlanId || "",
  };
}

async function getPayPalConfig(client = null) {
  const result = await query(
    `
      SELECT
        id,
        environment,
        product_id,
        basic_plan_id,
        popular_plan_id,
        pro_plan_id,
        created_at,
        updated_at
      FROM paypal_config
      WHERE id = 1
      LIMIT 1
    `,
    [],
    client
  );
  return result.rows[0] || null;
}

async function upsertPayPalConfig(patch, client = null) {
  const existing = await getPayPalConfig(client);
  const merged = {
    environment: patch.environment || existing?.environment || env.paypal.env || "sandbox",
    productId: patch.productId ?? existing?.product_id ?? env.paypal.productId ?? null,
    basicPlanId: patch.basicPlanId ?? existing?.basic_plan_id ?? env.paypal.basicPlanId ?? null,
    popularPlanId:
      patch.popularPlanId ?? existing?.popular_plan_id ?? env.paypal.popularPlanId ?? null,
    proPlanId: patch.proPlanId ?? existing?.pro_plan_id ?? env.paypal.proPlanId ?? null,
  };

  await query(
    `
      INSERT INTO paypal_config (
        id,
        environment,
        product_id,
        basic_plan_id,
        popular_plan_id,
        pro_plan_id,
        updated_at
      )
      VALUES (1, $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        environment = EXCLUDED.environment,
        product_id = EXCLUDED.product_id,
        basic_plan_id = EXCLUDED.basic_plan_id,
        popular_plan_id = EXCLUDED.popular_plan_id,
        pro_plan_id = EXCLUDED.pro_plan_id,
        updated_at = NOW()
    `,
    [
      merged.environment,
      merged.productId,
      merged.basicPlanId,
      merged.popularPlanId,
      merged.proPlanId,
    ],
    client
  );

  return merged;
}

function getPlanPrice(planKey) {
  const resolver = PLAN_PRICES[planKey];
  if (!resolver) throw badRequest("Invalid plan key");
  const raw = Number.parseFloat(resolver());
  if (!Number.isFinite(raw) || raw <= 0) {
    throw badRequest(`PayPal ${planKey} price is invalid`);
  }
  return raw.toFixed(2);
}

async function createPayPalProduct() {
  const response = await paypalFetch("/v1/catalogs/products", "POST", {
    name: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    type: "SERVICE",
    category: "SOFTWARE",
  });
  const id = String(response.data?.id || "").trim();
  if (!id) throw badRequest("PayPal product id missing in response");
  return id;
}

async function createPayPalPlan(productId, planKey) {
  const displayNames = {
    BASIC: "Basic",
    POPULAR: "Popular",
    PRO: "Pro",
  };
  const price = getPlanPrice(planKey);
  const response = await paypalFetch("/v1/billing/plans", "POST", {
    product_id: productId,
    name: `MeetScheduling ${displayNames[planKey]} Monthly`,
    description: `${displayNames[planKey]} monthly subscription for MeetScheduling`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1,
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: price,
            currency_code: "USD",
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 1,
    },
  });

  const id = String(response.data?.id || "").trim();
  if (!id) throw badRequest(`PayPal ${planKey} plan id missing in response`);
  return id;
}

async function ensureProductExists(client = null) {
  const configRow = await getPayPalConfig(client);
  const config = resolveConfigFromSources(configRow);
  if (config.productId) return config.productId;

  if (isProdLike()) {
    throw badRequest("PAYPAL_PRODUCT_ID/paypal_config.product_id is required in production");
  }

  const productId = await createPayPalProduct();
  await upsertPayPalConfig({ productId, environment: env.paypal.env }, client);
  return productId;
}

async function ensurePlansExist(client = null) {
  const configRow = await getPayPalConfig(client);
  const config = resolveConfigFromSources(configRow);

  const hasAllPlanIds = config.basicPlanId && config.popularPlanId && config.proPlanId;
  if (hasAllPlanIds) {
    return {
      productId: config.productId || "",
      planIds: {
        BASIC: config.basicPlanId,
        POPULAR: config.popularPlanId,
        PRO: config.proPlanId,
      },
      environment: config.environment,
    };
  }

  if (isProdLike()) {
    throw badRequest(
      "PayPal plan IDs are missing in production. Set PAYPAL_BASIC_PLAN_ID, PAYPAL_POPULAR_PLAN_ID, PAYPAL_PRO_PLAN_ID or paypal_config values."
    );
  }

  const productId = config.productId || (await ensureProductExists(client));
  const next = {
    basicPlanId: config.basicPlanId || (await createPayPalPlan(productId, "BASIC")),
    popularPlanId: config.popularPlanId || (await createPayPalPlan(productId, "POPULAR")),
    proPlanId: config.proPlanId || (await createPayPalPlan(productId, "PRO")),
  };

  await upsertPayPalConfig(
    {
      environment: env.paypal.env,
      productId,
      basicPlanId: next.basicPlanId,
      popularPlanId: next.popularPlanId,
      proPlanId: next.proPlanId,
    },
    client
  );

  return {
    productId,
    planIds: {
      BASIC: next.basicPlanId,
      POPULAR: next.popularPlanId,
      PRO: next.proPlanId,
    },
    environment: env.paypal.env,
  };
}

async function ensureCatalogReady() {
  return withTransaction(async (client) => {
    const productId = await ensureProductExists(client);
    const plans = await ensurePlansExist(client);
    return {
      productId,
      planIds: plans.planIds,
      environment: plans.environment,
    };
  });
}

module.exports = {
  getPayPalConfig,
  upsertPayPalConfig,
  ensureProductExists,
  ensurePlansExist,
  ensureCatalogReady,
};
