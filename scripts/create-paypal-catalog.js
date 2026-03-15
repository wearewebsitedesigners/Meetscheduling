#!/usr/bin/env node

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const PAYPAL_ENV = String(process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
  ? "live"
  : "sandbox";
const PAYPAL_CLIENT_ID = String(process.env.PAYPAL_CLIENT_ID || "").trim();
const PAYPAL_SECRET = String(process.env.PAYPAL_SECRET || "").trim();

const BASIC_PRICE = Number.parseFloat(process.env.PAYPAL_BASIC_PRICE_USD || "15");
const POPULAR_PRICE = Number.parseFloat(process.env.PAYPAL_POPULAR_PRICE_USD || "28");
const PRO_PRICE = Number.parseFloat(process.env.PAYPAL_PRO_PRICE_USD || "79");

const BASE_URL =
  PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

function assertConfig() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_SECRET in .env");
  }

  const prices = [BASIC_PRICE, POPULAR_PRICE, PRO_PRICE];
  if (prices.some((price) => !Number.isFinite(price) || price <= 0)) {
    throw new Error("Invalid PAYPAL_*_PRICE_USD value. Prices must be positive numbers.");
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response (status ${response.status}): ${text}`);
  }
}

function asPrice(value) {
  return Number(value).toFixed(2);
}

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");

  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      `Token request failed (${response.status}): ${payload.error_description || payload.error || "Unknown error"}`
    );
  }

  const accessToken = String(payload.access_token || "").trim();
  if (!accessToken) {
    throw new Error("PayPal access token is missing in response");
  }

  return accessToken;
}

async function paypalPost(pathname, accessToken, body) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      `PayPal API failed (${response.status}) on ${pathname}: ${payload.message || payload.name || "Unknown error"}`
    );
  }

  return payload;
}

async function createProduct(accessToken) {
  const payload = await paypalPost("/v1/catalogs/products", accessToken, {
    name: "MeetScheduling SaaS",
    description: "Recurring subscriptions for MeetScheduling workspace plans.",
    type: "SERVICE",
    category: "SOFTWARE",
  });

  const id = String(payload.id || "").trim();
  if (!id) throw new Error("Product ID missing in PayPal response");
  return id;
}

async function createPlan(accessToken, productId, name, description, price) {
  const payload = await paypalPost("/v1/billing/plans", accessToken, {
    product_id: productId,
    name,
    description,
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
            value: asPrice(price),
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

  const id = String(payload.id || "").trim();
  if (!id) throw new Error(`Plan ID missing for ${name}`);
  return id;
}

async function main() {
  assertConfig();

  console.log(`Using PayPal environment: ${PAYPAL_ENV}`);
  const token = await getAccessToken();

  console.log("Creating product...");
  const productId = await createProduct(token);

  console.log("Creating plans...");
  const basicPlanId = await createPlan(
    token,
    productId,
    "MeetScheduling Basic Monthly",
    "Basic monthly subscription for MeetScheduling",
    BASIC_PRICE
  );
  const popularPlanId = await createPlan(
    token,
    productId,
    "MeetScheduling Popular Monthly",
    "Popular monthly subscription for MeetScheduling",
    POPULAR_PRICE
  );
  const proPlanId = await createPlan(
    token,
    productId,
    "MeetScheduling Pro Monthly",
    "Pro monthly subscription for MeetScheduling",
    PRO_PRICE
  );

  console.log("\nCreated successfully. Add these to .env:");
  console.log(`PAYPAL_PRODUCT_ID=${productId}`);
  console.log(`PAYPAL_BASIC_PLAN_ID=${basicPlanId}`);
  console.log(`PAYPAL_POPULAR_PLAN_ID=${popularPlanId}`);
  console.log(`PAYPAL_PRO_PLAN_ID=${proPlanId}`);
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
});
