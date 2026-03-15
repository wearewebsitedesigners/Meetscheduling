const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const activeForm = loginForm || signupForm;
const feedback = document.getElementById("form-feedback");

const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
const AUTH_USER_KEY = "meetscheduling_auth_user";
const POST_LOGIN_REDIRECT_KEY = "meetscheduling_post_login_redirect";
const POST_LOGIN_PLAN_KEY = "meetscheduling_post_login_plan";
const UPGRADE_PLAN_QUERY_KEY = "upgradePlan";
const UPGRADE_INTENT_QUERY_KEY = "upgradeIntent";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLAN_NAMES = Object.freeze({
  BASIC: "Basic",
  POPULAR: "Popular",
  PRO: "Pro",
});

const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = String(urlParams.get("token") || "").trim();

function normalizePlanKey(value) {
  const key = String(value || "")
    .trim()
    .toUpperCase();
  return PLAN_NAMES[key] ? key : "";
}

function planLabel(planKey) {
  const normalized = normalizePlanKey(planKey);
  return PLAN_NAMES[normalized] || "selected";
}

function readPostLoginRedirect() {
  try {
    const raw = String(sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) || "").trim();
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    if (!raw.startsWith("/") || raw.startsWith("//")) return "";
    return raw;
  } catch {
    return "";
  }
}

function readUpgradePlanIntent() {
  const fromQuery = normalizePlanKey(urlParams.get(UPGRADE_PLAN_QUERY_KEY));
  if (fromQuery) return fromQuery;
  try {
    return normalizePlanKey(sessionStorage.getItem(POST_LOGIN_PLAN_KEY) || "");
  } catch {
    return "";
  }
}

function persistUpgradePlanIntent(planKey) {
  try {
    if (planKey) {
      sessionStorage.setItem(POST_LOGIN_PLAN_KEY, planKey);
    } else {
      sessionStorage.removeItem(POST_LOGIN_PLAN_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

function preserveUpgradeIntentLinks(planKey) {
  if (!planKey) return;

  const authPaths = new Set(["/login", "/login.html", "/signup", "/signup.html"]);
  document.querySelectorAll("a[href]").forEach((anchor) => {
    const rawHref = String(anchor.getAttribute("href") || "").trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      return;
    }

    let parsed;
    try {
      parsed = new URL(rawHref, window.location.origin);
    } catch {
      return;
    }

    if (!authPaths.has(parsed.pathname)) return;
    parsed.searchParams.set(UPGRADE_PLAN_QUERY_KEY, planKey);
    parsed.searchParams.set(UPGRADE_INTENT_QUERY_KEY, "1");
    anchor.setAttribute("href", `${parsed.pathname}${parsed.search}${parsed.hash || ""}`);
  });
}

function redirectToDashboard() {
  const next = readPostLoginRedirect();
  if (next) {
    window.location.replace(next);
    return;
  }

  const pendingPlan = readUpgradePlanIntent();
  if (pendingPlan) {
    const nextPricing = new URL("/pricing", window.location.origin);
    nextPricing.searchParams.set(UPGRADE_PLAN_QUERY_KEY, pendingPlan);
    nextPricing.searchParams.set(UPGRADE_INTENT_QUERY_KEY, "1");
    window.location.replace(`${nextPricing.pathname}${nextPricing.search}`);
    return;
  }

  window.location.replace("/dashboard");
}

function hasSession() {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

function setFeedback(message, ok = false) {
  if (!feedback) return;
  feedback.textContent = message || "";
  feedback.classList.toggle("success", Boolean(ok));
}

const pendingUpgradePlan = readUpgradePlanIntent();
if (pendingUpgradePlan) {
  persistUpgradePlanIntent(pendingUpgradePlan);
  preserveUpgradeIntentLinks(pendingUpgradePlan);

  if (!tokenFromUrl && !hasSession()) {
    setFeedback(`Log in or sign up to continue with the ${planLabel(pendingUpgradePlan)} plan upgrade.`);
  }
}

if (tokenFromUrl) {
  localStorage.setItem(AUTH_TOKEN_KEY, tokenFromUrl);

  // Wipe the token from the URL bar so it isn't copied/shared by accident
  window.history.replaceState({}, document.title, window.location.pathname);

  // Try to pre-fetch user info so we have it for the dashboard, then redirect
  fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${tokenFromUrl}` }
  })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      }
      redirectToDashboard();
    })
    .catch(() => redirectToDashboard());
} else if (hasSession()) {
  redirectToDashboard();
}

function getFormData() {
  if (!activeForm || !activeForm.email) return {};
  const email = String(activeForm.email.value || "").trim();
  const password = String(activeForm.password?.value || "");
  return { email, password };
}

if (activeForm && feedback) {
  activeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    const { email, password } = getFormData();
    if (!emailPattern.test(email)) {
      setFeedback("Enter a valid email address.");
      return;
    }
    if (!password) {
      setFeedback("Enter your password.");
      return;
    }

    setFeedback(
      signupForm
        ? "Creating your account..."
        : "Logging you in..."
    );

    try {
      const endpoint = signupForm ? "/api/auth/signup" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Authentication failed.");
      }

      if (data.requires2FA) {
        setFeedback("2FA Required. Redirecting...", true);
        localStorage.setItem("temp2faToken", data.tempToken);
        window.setTimeout(() => {
          window.location.replace(`/verify-2fa.html?tempToken=${data.tempToken}`);
        }, 320);
        return;
      }

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

      const planAfterAuth = readUpgradePlanIntent();
      if (planAfterAuth) {
        setFeedback(`Success. Continuing with ${planLabel(planAfterAuth)} checkout...`, true);
      } else {
        setFeedback("Success. Opening your dashboard...", true);
      }
      window.setTimeout(redirectToDashboard, 320);
    } catch (error) {
      setFeedback(error.message || "Could not log in right now.");
    }
  });
}
