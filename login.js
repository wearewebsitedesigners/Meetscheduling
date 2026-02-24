const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const activeForm = loginForm || signupForm;
const feedback = document.getElementById("form-feedback");

const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
const AUTH_USER_KEY = "meetscheduling_auth_user";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectToDashboard() {
  window.location.replace("/dashboard.html");
}

function hasSession() {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

function setFeedback(message, ok = false) {
  if (!feedback) return;
  feedback.textContent = message || "";
  feedback.classList.toggle("success", Boolean(ok));
}

// OAuth Callback handling
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get("token");

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

      setFeedback("Success. Opening your dashboard...", true);
      window.setTimeout(redirectToDashboard, 320);
    } catch (error) {
      setFeedback(error.message || "Could not log in right now.");
    }
  });
}
