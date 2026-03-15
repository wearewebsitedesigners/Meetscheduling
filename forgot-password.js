const forgotForm = document.getElementById("forgot-form");
const feedback = document.getElementById("forgot-feedback");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFeedback(message, ok = false) {
  if (!feedback) return;
  feedback.textContent = message || "";
  feedback.classList.toggle("success", Boolean(ok));
}

if (forgotForm && feedback) {
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    const email = String(forgotForm.email.value || "").trim();
    if (!emailPattern.test(email)) {
      setFeedback("Enter a valid email address.");
      return;
    }

    setFeedback("Sending reset link...");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(data.error || "Could not process your request right now.");
        return;
      }

      setFeedback(
        data.message ||
          "If an account exists for this email, a password reset link has been sent.",
        true
      );
    } catch (_error) {
      setFeedback("Could not connect to server. Please try again.");
    }
  });
}
