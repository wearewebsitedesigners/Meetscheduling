const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const activeForm = loginForm || signupForm;
const feedback = document.getElementById("form-feedback");

const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
const AUTH_USER_KEY = "meetscheduling_auth_user";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectToDashboard() {
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

function getEmailFromForm() {
  if (!activeForm || !activeForm.email) return "";
  return String(activeForm.email.value || "").trim();
}

async function authWithEmail(email, provider = "email") {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const localPart = email.split("@")[0] || "user";
  const displayName =
    localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[._-]+/g, " ");

  const response = await fetch("/api/auth/dev-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      timezone,
      displayName,
      provider,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Authentication failed.");
  }

  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      ...(data.user || {}),
      provider,
    })
  );
}

if (hasSession()) {
  redirectToDashboard();
}

if (activeForm && feedback) {
  activeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    const email = getEmailFromForm();
    if (!emailPattern.test(email)) {
      setFeedback("Enter a valid email address.");
      return;
    }

    setFeedback(
      signupForm
        ? "Creating your account..."
        : "Logging you in..."
    );

    try {
      await authWithEmail(email, "email");
      setFeedback("Success. Opening your dashboard...", true);
      window.setTimeout(redirectToDashboard, 320);
    } catch (error) {
      setFeedback(error.message || "Could not log in right now.");
    }
  });

  const socialButtons = document.querySelectorAll("[data-provider]");
  socialButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const email = getEmailFromForm();
      const provider = button.getAttribute("data-provider") || "email";
      if (!emailPattern.test(email)) {
        setFeedback("Enter your email first, then continue with social login.");
        return;
      }

      setFeedback(
        provider === "google"
          ? "Connecting your Google account..."
          : "Connecting your Microsoft account..."
      );

      try {
        await authWithEmail(email, provider);
        setFeedback("Connected. Opening your dashboard...", true);
        window.setTimeout(redirectToDashboard, 320);
      } catch (error) {
        setFeedback(error.message || "Could not complete social sign-in.");
      }
    });
  });
}
