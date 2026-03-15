const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
const POST_LOGIN_REDIRECT_KEY = "meetscheduling_post_login_redirect";
const POST_LOGIN_PLAN_KEY = "meetscheduling_post_login_plan";
const UPGRADE_PLAN_QUERY_KEY = "upgradePlan";
const UPGRADE_INTENT_QUERY_KEY = "upgradeIntent";

const PLAN_NAMES = Object.freeze({
  BASIC: "Basic",
  POPULAR: "Popular",
  PRO: "Pro",
});

const PLAN_DETAILS = Object.freeze({
  BASIC: {
    label: "Basic",
    price: "$15/month",
    meta: "1 staff member • 1 booking page",
  },
  POPULAR: {
    label: "Popular",
    price: "$28/month",
    meta: "6 staff members • 3 booking pages",
  },
  PRO: {
    label: "Pro",
    price: "$79/month",
    meta: "36 staff members • Unlimited booking pages",
  },
});

const cycleButtons = [...document.querySelectorAll("[data-cycle]")];
const cyclePrices = [...document.querySelectorAll("[data-monthly][data-yearly]")];
const subscribeButtons = [...document.querySelectorAll("[data-action='subscribe-plan']")];
const closeModalButtons = [...document.querySelectorAll("[data-action='close-paypal-modal']")];

const upgradeRequiredMessage = document.getElementById("upgradeRequiredMessage");
const upgradeRequiredText = document.getElementById("upgradeRequiredText");
const billingStatus = document.getElementById("billingStatus");
const billingPlanName = document.getElementById("billingPlanName");
const billingStatusText = document.getElementById("billingStatusText");
const refreshBillingBtn = document.getElementById("refreshBillingBtn");
const cancelSubscriptionBtn = document.getElementById("cancelSubscriptionBtn");
const paypalModal = document.getElementById("paypalModal");
const paypalModalCopy = document.getElementById("paypalModalCopy");
const paypalButtonContainer = document.getElementById("paypalButtonContainer");
const paypalPlanName = document.getElementById("paypalPlanName");
const paypalPlanPrice = document.getElementById("paypalPlanPrice");
const paypalPlanMeta = document.getElementById("paypalPlanMeta");
const paypalLoadingState = document.getElementById("paypalLoadingState");
const paypalLoadingText = document.getElementById("paypalLoadingText");
const checkoutStepNodes = [...document.querySelectorAll("[data-checkout-step]")];

const paypalState = {
  config: null,
  sdkPromise: null,
  activePlanKey: null,
};

function applyCycle(mode) {
  cycleButtons.forEach((button) => {
    const active = button.dataset.cycle === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  cyclePrices.forEach((node) => {
    node.textContent = mode === "yearly" ? node.dataset.yearly || "" : node.dataset.monthly || "";
  });
}

function getAuthToken() {
  return String(localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();
}

function setPostLoginRedirect(planKey = "") {
  const url = new URL(window.location.href);
  const normalizedPlan = normalizePlanKey(planKey);
  if (normalizedPlan) {
    url.searchParams.set(UPGRADE_PLAN_QUERY_KEY, normalizedPlan);
    url.searchParams.set(UPGRADE_INTENT_QUERY_KEY, "1");
  }

  const target = `${url.pathname}${url.search ? url.search : ""}${url.hash || ""}`;
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, target);
    if (normalizedPlan) {
      sessionStorage.setItem(POST_LOGIN_PLAN_KEY, normalizedPlan);
    } else {
      sessionStorage.removeItem(POST_LOGIN_PLAN_KEY);
    }
  } catch {
    // Ignore storage failures in private mode.
  }
}

function showNotice(message, tone = "error") {
  if (!upgradeRequiredMessage || !upgradeRequiredText) return;
  const safeTone = tone === "success" ? "success" : "error";
  upgradeRequiredMessage.hidden = false;
  upgradeRequiredText.className = `warning-box ${safeTone}`;
  upgradeRequiredText.textContent = message;
}

function hideNotice() {
  if (!upgradeRequiredMessage || !upgradeRequiredText) return;
  upgradeRequiredMessage.hidden = true;
  upgradeRequiredText.textContent = "";
}

function setButtonBusy(button, busy, busyLabel = "Please wait...") {
  if (!(button instanceof HTMLButtonElement)) return;
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent || "";
  }
  button.disabled = !!busy;
  button.classList.toggle("is-loading", !!busy);
  button.textContent = busy ? busyLabel : button.dataset.defaultLabel;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response.");
  }
}

async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body = undefined,
    auth = true,
  } = options;

  const headers = new Headers(options.headers || {});
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAuthToken();
    if (!token) {
      const error = new Error("Please log in to continue.");
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await readJson(response);
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function planLabel(planKey) {
  const key = normalizePlanKey(planKey);
  return PLAN_NAMES[key] || "Basic";
}

function normalizePlanKey(planKey) {
  const key = String(planKey || "")
    .trim()
    .toUpperCase();
  return PLAN_NAMES[key] ? key : "";
}

function getPlanDetails(planKey) {
  const key = normalizePlanKey(planKey);
  return PLAN_DETAILS[key] || PLAN_DETAILS.BASIC;
}

function setPayPalPlanDetails(planKey) {
  const details = getPlanDetails(planKey);
  if (paypalPlanName) paypalPlanName.textContent = details.label;
  if (paypalPlanPrice) paypalPlanPrice.textContent = details.price;
  if (paypalPlanMeta) paypalPlanMeta.textContent = details.meta;
  if (paypalModalCopy) {
    paypalModalCopy.textContent = `You're upgrading to ${details.label}. Approve with PayPal to unlock limits instantly.`;
  }
}

function setPayPalLoadingState(busy, message = "Preparing secure PayPal checkout...") {
  if (paypalLoadingText) {
    paypalLoadingText.textContent = message;
  }
  if (paypalLoadingState) {
    paypalLoadingState.hidden = !busy;
  }
  if (paypalButtonContainer) {
    paypalButtonContainer.classList.toggle("is-ready", !busy);
  }
  if (paypalModal) {
    paypalModal.classList.toggle("is-syncing", !!busy && /finalizing/i.test(message));
  }
}

function setCheckoutStep(activeStep) {
  const safeStep = Number(activeStep) || 1;
  checkoutStepNodes.forEach((node) => {
    const step = Number(node.dataset.checkoutStep || "0");
    node.classList.toggle("active", step <= safeStep);
  });
}

function setActivePlanCard(planKey) {
  const normalizedKey = normalizePlanKey(planKey);
  subscribeButtons.forEach((button) => {
    const card = button.closest(".plan-card");
    const active = normalizePlanKey(button.dataset.planKey || "") === normalizedKey;
    if (!card) return;
    card.classList.toggle("is-checking-out", active);
  });
}

function clearActivePlanCard() {
  document.querySelectorAll(".plan-card.is-checking-out").forEach((card) => {
    card.classList.remove("is-checking-out");
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderSubscriptionStatus(subscription) {
  if (!billingStatus || !billingPlanName || !billingStatusText || !cancelSubscriptionBtn) return;

  if (!subscription) {
    billingStatus.hidden = true;
    cancelSubscriptionBtn.hidden = true;
    return;
  }

  billingStatus.hidden = false;
  billingPlanName.textContent = planLabel(subscription.planKey);

  const status = String(subscription.status || "inactive").toLowerCase();
  const statusMap = {
    active: "Active",
    inactive: "Inactive",
    cancelled: "Cancelled",
    suspended: "Suspended",
    past_due: "Past due",
  };
  let label = statusMap[status] || "Inactive";
  if (subscription.cancelAtPeriodEnd) {
    const endDate = formatDate(subscription.currentPeriodEnd);
    label = endDate ? `Active until ${endDate}` : "Cancels at period end";
  } else if (status === "active") {
    const renewalDate = formatDate(subscription.currentPeriodEnd);
    if (renewalDate) {
      label = `Active • Renews ${renewalDate}`;
    }
  }

  billingStatusText.textContent = label;
  cancelSubscriptionBtn.hidden = !(status === "active" && !subscription.cancelAtPeriodEnd);
}

async function refreshSubscriptionStatus() {
  if (!getAuthToken()) {
    renderSubscriptionStatus(null);
    return;
  }

  try {
    const payload = await apiRequest("/api/billing/subscription");
    renderSubscriptionStatus(payload.subscription || null);
  } catch (error) {
    if (error.status === 401 || error.code === "AUTH_REQUIRED") {
      renderSubscriptionStatus(null);
      return;
    }
    showNotice(error.message || "Unable to refresh billing status.");
  }
}

async function loadPayPalClientConfig() {
  if (paypalState.config) return paypalState.config;
  const payload = await apiRequest("/api/billing/paypal/client-config", { auth: false });
  const clientId = String(payload.clientId || "").trim();
  if (!clientId) {
    throw new Error("PayPal is not configured yet. Please contact support.");
  }
  paypalState.config = {
    clientId,
    env: String(payload.env || "").toLowerCase(),
  };
  return paypalState.config;
}

function loadPayPalSdk(clientId) {
  if (window.paypal && typeof window.paypal.Buttons === "function") {
    return Promise.resolve();
  }
  if (paypalState.sdkPromise) {
    return paypalState.sdkPromise;
  }

  paypalState.sdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector("script[data-paypal-sdk='pricing']");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load PayPal SDK.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.dataset.paypalSdk = "pricing";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayPal SDK."));
    document.head.appendChild(script);
  });

  return paypalState.sdkPromise;
}

function openPayPalModal() {
  if (!paypalModal) return;
  paypalModal.classList.remove("is-syncing");
  paypalModal.classList.remove("hidden");
  paypalModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setCheckoutStep(1);
}

function closePayPalModal() {
  if (!paypalModal) return;
  paypalModal.classList.add("hidden");
  paypalModal.classList.remove("is-syncing");
  paypalModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearActivePlanCard();
}

async function syncSubscription(subscriptionId) {
  return apiRequest("/api/billing/paypal/capture", {
    method: "POST",
    body: { subscriptionId },
  });
}

async function renderPayPalButtons(planKey) {
  if (!paypalButtonContainer) {
    throw new Error("Missing PayPal button container.");
  }
  if (!window.paypal || typeof window.paypal.Buttons !== "function") {
    throw new Error("PayPal SDK is unavailable.");
  }

  paypalButtonContainer.innerHTML = "";
  setPayPalLoadingState(true, "Preparing secure PayPal checkout...");

  const buttons = window.paypal.Buttons({
    style: {
      layout: "vertical",
      shape: "rect",
      label: "paypal",
      height: 44,
    },
    createSubscription: async () => {
      const payload = await apiRequest("/api/billing/paypal/create-subscription", {
        method: "POST",
        body: { planKey },
      });
      const subscriptionId = String(payload.subscriptionId || "").trim();
      if (!subscriptionId) {
        throw new Error("PayPal subscription could not be created.");
      }
      return subscriptionId;
    },
    onApprove: async (data) => {
      const subscriptionId = String(data?.subscriptionID || "").trim();
      if (!subscriptionId) {
        throw new Error("Subscription approval is missing an ID.");
      }

      try {
        setCheckoutStep(3);
        setPayPalLoadingState(true, "Finalizing your subscription...");
        await syncSubscription(subscriptionId);
        await refreshSubscriptionStatus();
        closePayPalModal();
        showNotice(`Subscription activated on ${planLabel(planKey)} plan.`, "success");
      } catch (error) {
        setPayPalLoadingState(false);
        showNotice(error.message || "Payment approved but activation failed. Please refresh.");
      }
    },
    onCancel: () => {
      setPayPalLoadingState(false);
      setCheckoutStep(2);
      showNotice("PayPal checkout was cancelled.");
    },
    onError: (error) => {
      setPayPalLoadingState(false);
      setCheckoutStep(2);
      const message = error?.message || "PayPal checkout failed.";
      showNotice(message);
    },
  });

  if (typeof buttons.isEligible === "function" && !buttons.isEligible()) {
    throw new Error("PayPal checkout is unavailable for this browser.");
  }

  await buttons.render("#paypalButtonContainer");
  setCheckoutStep(2);
  setPayPalLoadingState(false);
}

async function startPayPalCheckout(planKey, sourceButton = null) {
  const normalizedPlanKey = normalizePlanKey(planKey) || "BASIC";
  hideNotice();
  if (!getAuthToken()) {
    setPostLoginRedirect(normalizedPlanKey);
    showNotice("Please log in or sign up first. We'll continue this upgrade after login.");
    window.setTimeout(() => {
      const next = new URL("/login", window.location.origin);
      next.searchParams.set(UPGRADE_PLAN_QUERY_KEY, normalizedPlanKey);
      next.searchParams.set(UPGRADE_INTENT_QUERY_KEY, "1");
      window.location.assign(`${next.pathname}${next.search}`);
    }, 600);
    return;
  }

  setButtonBusy(sourceButton, true, "Loading...");
  paypalState.activePlanKey = normalizedPlanKey;
  setActivePlanCard(normalizedPlanKey);
  setPayPalPlanDetails(normalizedPlanKey);
  setPayPalLoadingState(true, "Preparing secure PayPal checkout...");
  openPayPalModal();

  try {
    const config = await loadPayPalClientConfig();
    await loadPayPalSdk(config.clientId);
    await renderPayPalButtons(normalizedPlanKey);
  } catch (error) {
    showNotice(error.message || "Unable to start PayPal checkout.");
    setPayPalLoadingState(false);
    closePayPalModal();
  } finally {
    setButtonBusy(sourceButton, false);
  }
}

async function cancelSubscription() {
  if (!getAuthToken()) {
    showNotice("Please log in to manage subscriptions.");
    return;
  }

  if (!window.confirm("Cancel your subscription at the end of the current billing period?")) {
    return;
  }

  setButtonBusy(cancelSubscriptionBtn, true, "Cancelling...");
  hideNotice();
  try {
    await apiRequest("/api/billing/paypal/cancel", {
      method: "POST",
      body: { reason: "Cancelled from pricing page" },
    });
    await refreshSubscriptionStatus();
    showNotice("Subscription cancellation scheduled.", "success");
  } catch (error) {
    showNotice(error.message || "Unable to cancel subscription.");
  } finally {
    setButtonBusy(cancelSubscriptionBtn, false);
  }
}

function cleanReturnQueryParams() {
  const url = new URL(window.location.href);
  const keys = [
    "paypal",
    "subscription_id",
    "workspaceId",
    "planKey",
    "ba_token",
    "token",
    "PayerID",
    UPGRADE_PLAN_QUERY_KEY,
    UPGRADE_INTENT_QUERY_KEY,
  ];
  let changed = false;
  keys.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });
  if (changed) {
    const next = `${url.pathname}${url.search ? url.search : ""}${url.hash || ""}`;
    window.history.replaceState({}, document.title, next);
  }
}

function cleanUpgradeIntentQueryParams() {
  const url = new URL(window.location.href);
  let changed = false;
  [UPGRADE_PLAN_QUERY_KEY, UPGRADE_INTENT_QUERY_KEY].forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });
  if (changed) {
    const next = `${url.pathname}${url.search ? url.search : ""}${url.hash || ""}`;
    window.history.replaceState({}, document.title, next);
  }
}

function readPendingUpgradePlan() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizePlanKey(params.get(UPGRADE_PLAN_QUERY_KEY));
  if (fromQuery) {
    return fromQuery;
  }

  try {
    return normalizePlanKey(sessionStorage.getItem(POST_LOGIN_PLAN_KEY) || "");
  } catch {
    return "";
  }
}

function clearPendingUpgradePlan() {
  try {
    sessionStorage.removeItem(POST_LOGIN_PLAN_KEY);
  } catch {
    // Ignore storage failures in private mode.
  }
}

async function resumeCheckoutAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("paypal")) return;
  if (!getAuthToken()) return;

  const pendingPlan = readPendingUpgradePlan();
  if (!pendingPlan) return;

  clearPendingUpgradePlan();
  cleanUpgradeIntentQueryParams();
  await startPayPalCheckout(pendingPlan);
}

async function handlePayPalReturn() {
  const params = new URLSearchParams(window.location.search);
  const mode = String(params.get("paypal") || "").toLowerCase();
  if (!mode) return;

  if (mode === "cancelled") {
    showNotice("Payment was cancelled before completion.");
    cleanReturnQueryParams();
    return;
  }

  if (mode === "success") {
    const subscriptionId = String(params.get("subscription_id") || "").trim();
    if (subscriptionId && getAuthToken()) {
      try {
        await syncSubscription(subscriptionId);
        showNotice("Payment confirmed and subscription synced.", "success");
      } catch (error) {
        showNotice(error.message || "Payment approved but sync failed. Please refresh status.");
      }
    } else {
      showNotice("Payment approved. Click Refresh status to sync your subscription.", "success");
    }
    await refreshSubscriptionStatus();
    cleanReturnQueryParams();
  }
}

cycleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyCycle(button.dataset.cycle === "yearly" ? "yearly" : "monthly");
  });
});

if (cycleButtons.length) {
  applyCycle("monthly");
}

subscribeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const planKey = String(button.dataset.planKey || "BASIC").toUpperCase();
    startPayPalCheckout(planKey, button);
  });
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", closePayPalModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePayPalModal();
  }
});

if (refreshBillingBtn) {
  refreshBillingBtn.addEventListener("click", async () => {
    setButtonBusy(refreshBillingBtn, true, "Refreshing...");
    hideNotice();
    try {
      await refreshSubscriptionStatus();
    } finally {
      setButtonBusy(refreshBillingBtn, false);
    }
  });
}

if (cancelSubscriptionBtn) {
  cancelSubscriptionBtn.addEventListener("click", cancelSubscription);
}

window.addEventListener("DOMContentLoaded", async () => {
  await refreshSubscriptionStatus();
  await handlePayPalReturn();
  await resumeCheckoutAfterAuth();
});
