(function landingPageListController() {
  const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
  const rootEl = document.getElementById("lp-list-root");
  const statusEl = document.getElementById("lp-list-status");
  const refreshBtn = document.getElementById("lp-refresh-btn");
  const createBtn = document.getElementById("lp-create-btn");
  const dialogEl = document.getElementById("lp-create-dialog");
  const createFormEl = document.getElementById("lp-create-form");
  const createCancelBtn = document.getElementById("lp-create-cancel");
  const createTitleEl = document.getElementById("lp-create-title");
  const createSlugEl = document.getElementById("lp-create-slug");
  const createPresetEl = document.getElementById("lp-create-preset");

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function token() {
    return String(localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();
  }

  function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("meetscheduling_auth_user");
  }

  async function apiRequest(path, options) {
    const authToken = token();
    if (!authToken) {
      window.location.replace("/login");
      throw new Error("Session expired. Please log in again.");
    }

    const headers = new Headers(options && options.headers ? options.headers : {});
    headers.set("Authorization", `Bearer ${authToken}`);
    if (!headers.has("Content-Type") && options && options.body) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(path, {
      ...(options || {}),
      headers,
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

    if (response.status === 401) {
      clearSession();
      window.location.replace("/login");
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(payload.error || "Request failed");
    }

    return payload;
  }

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
  }

  function copyText(value) {
    if (!value) return Promise.reject(new Error("Nothing to copy"));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return Promise.resolve();
  }

  function renderPages(pages) {
    if (!rootEl) return;
    const list = Array.isArray(pages) ? pages : [];

    if (!list.length) {
      rootEl.innerHTML = `
        <article class="lp-empty-state">
          <h3>No landing pages yet</h3>
          <p>Create your first page to start publishing your custom URL and booking experience.</p>
        </article>
      `;
      return;
    }

    rootEl.innerHTML = list
      .map((page) => {
        const shareUrl = `${window.location.origin}${page.shareUrl || `/${page.slug}`}`;
        const updatedAt = page.updatedAt
          ? new Date(page.updatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "Unknown";
        return `
          <article class="lp-page-card" data-page-id="${escapeHtml(page.id)}">
            <div>
              <h3>${escapeHtml(page.title || "Landing page")}</h3>
              <div class="lp-page-meta">
                <span>Slug: ${escapeHtml(page.slug)}</span>
                <span>Updated: ${escapeHtml(updatedAt)}</span>
              </div>
            </div>
            <span class="lp-page-url">${escapeHtml(shareUrl)}</span>
            <div class="lp-page-actions">
              <button type="button" data-action="copy-link" data-url="${escapeHtml(shareUrl)}">Copy link</button>
              <a href="${escapeHtml(shareUrl)}" target="_blank" rel="noopener">Preview</a>
              <a class="lp-open-editor" href="/dashboard/landing-page/${escapeHtml(
                page.id
              )}/editor">Editor</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadPages() {
    setStatus("Loading...");
    try {
      const payload = await apiRequest("/api/dashboard/pages");
      renderPages(payload.pages || []);
      setStatus(`Loaded ${(payload.pages || []).length} page(s)`);
    } catch (error) {
      if (rootEl) {
        rootEl.innerHTML = `
          <article class="lp-empty-state">
            <h3>Could not load pages</h3>
            <p>${escapeHtml(error.message || "Request failed")}</p>
          </article>
        `;
      }
      setStatus("Load failed");
    }
  }

  function openCreateDialog() {
    if (!dialogEl) return;
    if (createFormEl) createFormEl.reset();
    if (createTitleEl) createTitleEl.value = "Landing page";
    if (createSlugEl) createSlugEl.value = "";
    if (createPresetEl) createPresetEl.value = "hairluxury";
    dialogEl.showModal();
  }

  async function createPage() {
    if (!createTitleEl || !createSlugEl || !createPresetEl) return;
    const body = {
      title: String(createTitleEl.value || "").trim(),
      slug: String(createSlugEl.value || "").trim() || undefined,
      preset: String(createPresetEl.value || "").trim() || "hairluxury",
    };

    if (!body.title) {
      alert("Title is required.");
      return;
    }

    setStatus("Creating page...");
    try {
      const payload = await apiRequest("/api/dashboard/pages", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (dialogEl) dialogEl.close();
      setStatus("Page created");
      const editorUrl = payload?.page?.editorUrl || `/dashboard/landing-page/${payload?.page?.id || ""}/editor`;
      if (editorUrl && editorUrl.includes("/dashboard/landing-page/")) {
        window.location.assign(editorUrl);
        return;
      }
      loadPages();
    } catch (error) {
      setStatus("Create failed");
      alert(error.message || "Could not create page");
    }
  }

  function bindEvents() {
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        loadPages();
      });
    }

    if (createBtn) {
      createBtn.addEventListener("click", () => {
        openCreateDialog();
      });
    }

    if (createCancelBtn) {
      createCancelBtn.addEventListener("click", () => {
        if (dialogEl) dialogEl.close();
      });
    }

    if (createFormEl) {
      createFormEl.addEventListener("submit", (event) => {
        event.preventDefault();
        createPage();
      });
    }

    if (rootEl) {
      rootEl.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        if (action !== "copy-link") return;
        const url = target.getAttribute("data-url");
        if (!url) return;
        try {
          await copyText(url);
          setStatus("Link copied");
        } catch {
          setStatus("Copy failed");
        }
      });
    }
  }

  bindEvents();
  loadPages();
})();
