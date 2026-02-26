(function landingPagePublicController() {
  const renderer = window.LandingPageRenderer;
  const rootEl = document.getElementById("lpp-root");
  if (!renderer || !rootEl) return;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function resolveSlug() {
    const path = window.location.pathname.split("/").filter(Boolean);
    if (!path.length) return "";
    return decodeURIComponent(path[0]);
  }

  async function loadPublicPage() {
    const slug = resolveSlug();
    if (!slug) {
      rootEl.innerHTML = `
        <section class="lpp-error">
          <div>
            <h1>Page not found</h1>
            <p>Missing public slug.</p>
          </div>
        </section>
      `;
      return;
    }

    try {
      const response = await fetch(`/api/public/page/${encodeURIComponent(slug)}`, {
        headers: { Accept: "application/json" },
      });
      const text = await response.text();
      let payload = {};
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = {};
        }
      }
      if (!response.ok) {
        throw new Error(payload.error || "Page not found");
      }

      if (payload.page && payload.page.title) {
        document.title = `${payload.page.title} | MeetScheduling`;
      }

      renderer.renderInto(
        rootEl,
        {
          page: payload.page,
          config: payload.config,
          categories: payload.categories || [],
          services: payload.services || [],
          reviews: payload.reviews || [],
        },
        { mode: "live" }
      );
    } catch (error) {
      rootEl.innerHTML = `
        <section class="lpp-error">
          <div>
            <h1>Unable to load page</h1>
            <p>${escapeHtml(error.message || "Request failed")}</p>
            <a href="/">Go to home</a>
          </div>
        </section>
      `;
    }
  }

  loadPublicPage();
})();
