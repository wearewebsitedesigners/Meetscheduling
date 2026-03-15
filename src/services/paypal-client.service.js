const env = require("../config/env");
const { badRequest } = require("../utils/http-error");

const PAYPAL_BASE_URLS = Object.freeze({
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
});

let tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function getPayPalBaseUrl() {
  return PAYPAL_BASE_URLS[env.paypal.env] || PAYPAL_BASE_URLS.sandbox;
}

function assertPayPalCredentials() {
  if (!env.paypal.clientId || !env.paypal.secret) {
    throw badRequest("PayPal credentials are not configured");
  }
}

async function getAccessToken(forceRefresh = false) {
  assertPayPalCredentials();
  const now = Date.now();
  if (!forceRefresh && tokenCache.accessToken && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(
    `${env.paypal.clientId}:${env.paypal.secret}`,
    "utf8"
  ).toString("base64");
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });

  const payloadText = await response.text();
  const payload = payloadText ? JSON.parse(payloadText) : {};
  if (!response.ok || !payload.access_token) {
    throw badRequest(
      payload.error_description ||
        payload.error ||
        `Failed to fetch PayPal access token (status ${response.status})`
    );
  }

  const expiresInSeconds = Number(payload.expires_in || 0);
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + Math.max(60, expiresInSeconds) * 1000,
  };
  return tokenCache.accessToken;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function paypalFetch(path, method = "GET", body = undefined, options = {}) {
  const retries = Number.isFinite(Number(options.retries)) ? Number(options.retries) : 2;
  const attempt = Number.isFinite(Number(options.attempt)) ? Number(options.attempt) : 0;
  const shouldRetryAuth = options.retryAuth !== false;
  const accessToken = options.accessToken || (await getAccessToken(attempt > 0 && !shouldRetryAuth));
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseJsonSafe(response);
  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: payload,
    };
  }

  const retryableStatus = response.status >= 500 && response.status < 600;
  if (retryableStatus && attempt < retries) {
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    return paypalFetch(path, method, body, {
      ...options,
      attempt: attempt + 1,
      accessToken,
      retryAuth: false,
    });
  }

  if (response.status === 401 && shouldRetryAuth) {
    await getAccessToken(true);
    return paypalFetch(path, method, body, {
      ...options,
      attempt: attempt + 1,
      retryAuth: false,
    });
  }

  const details = Array.isArray(payload?.details) ? payload.details : [];
  const detailMessage = details
    .map((item) => item?.description || item?.issue)
    .filter(Boolean)
    .join("; ");
  const fallbackMessage = payload?.message || payload?.name || `PayPal request failed (${response.status})`;
  const error = new Error(detailMessage || fallbackMessage);
  error.statusCode = response.status;
  error.payload = payload;
  throw error;
}

module.exports = {
  getPayPalBaseUrl,
  getAccessToken,
  paypalFetch,
};
