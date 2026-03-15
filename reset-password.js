const resetForm = document.getElementById("reset-form");
const feedback = document.getElementById("reset-feedback");
const submitButton = resetForm ? resetForm.querySelector('button[type="submit"]') : null;
const urlParams = new URLSearchParams(window.location.search);
const resetToken = String(urlParams.get("token") || "").trim();

function setFeedback(message, ok = false) {
  if (!feedback) return;
  feedback.textContent = message || "";
  feedback.classList.toggle("success", Boolean(ok));
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;
  submitButton.disabled = Boolean(isSubmitting);
  submitButton.textContent = isSubmitting ? "Updating..." : "Update password";
}

if (!resetToken) {
  setFeedback("Reset link is missing or invalid. Please request a new link.");
  if (submitButton) submitButton.disabled = true;
}

if (resetForm && feedback && resetToken) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    const password = String(resetForm.password.value || "");
    const confirmPassword = String(resetForm.confirmPassword.value || "");

    if (password.length < 8) {
      setFeedback("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFeedback("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(data.error || "Could not reset password. Please request a new link.");
        return;
      }

      setFeedback(data.message || "Password updated successfully. Redirecting to login...", true);
      window.setTimeout(() => {
        window.location.href = "/login.html";
      }, 1200);
    } catch (_error) {
      setFeedback("Could not connect to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });
}
