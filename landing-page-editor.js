(function landingPageEditorController() {
  const renderer = window.LandingPageRenderer;
  if (!renderer) return;

  const AUTH_TOKEN_KEY = "meetscheduling_auth_token";

  const els = {
    pageTitle: document.getElementById("lpe-page-title"),
    pageMeta: document.getElementById("lpe-page-meta"),
    saveStatus: document.getElementById("lpe-save-status"),
    previewBtn: document.getElementById("lpe-preview-btn"),
    copyLinkBtn: document.getElementById("lpe-copy-link-btn"),
    publishBtn: document.getElementById("lpe-publish-btn"),
    saveBtn: document.getElementById("lpe-save-btn"),
    sectionsList: document.getElementById("lpe-sections-list"),
    previewFrame: document.getElementById("lpe-preview-frame"),
    previewRoot: document.getElementById("lpe-preview-root"),
    themeControls: document.getElementById("lpe-theme-controls"),
    sectionControls: document.getElementById("lpe-section-controls"),
    historyList: document.getElementById("lpe-history-list"),
    addSectionBtn: document.getElementById("lpe-add-section-btn"),
    addDialog: document.getElementById("lpe-add-dialog"),
    dialogCancel: document.getElementById("lpe-dialog-cancel"),
    dialogSelect: document.getElementById("lpe-dialog-select"),
    libraryGrid: document.getElementById("lpe-library-grid"),
  };

  const SECTION_DEFAULTS = Object.freeze({
    header: {
      brandName: "MeetScheduling",
      logoUrl: "/assets/scheduling-logo.svg",
      navLinks: [
        { label: "Home", href: "#top" },
        { label: "Services", href: "#services" },
        { label: "Reviews", href: "#reviews" },
        { label: "Contact", href: "#contact" },
      ],
      showSearch: true,
      searchPlaceholder: "Search services...",
      ctaLabel: "Book Now",
      ctaHref: "#services",
      sticky: false,
    },
    hero: {
      badge: "Premium salon experience",
      title: "Where beauty meets precision",
      subtitle: "Create unforgettable beauty experiences with services clients can book instantly.",
      primaryButtonLabel: "Book consultation",
      primaryButtonHref: "#services",
      secondaryButtonLabel: "View services",
      secondaryButtonHref: "#services",
      backgroundImageUrl: "",
      align: "left",
    },
    text: {
      title: "About our studio",
      body: "We blend modern techniques with personalized care to deliver custom looks for every client.",
      align: "left",
    },
    imageShowcase: {
      title: "Gallery",
      subtitle: "A glimpse of our latest transformations",
      columnsDesktop: 3,
      columnsMobile: 1,
      images: [{ url: "", alt: "Style showcase 1" }],
    },
    servicesMenu: {
      title: "Service Menu",
      subtitle: "Indulge in our curated selection of professional beauty treatments.",
      viewMode: "tabs",
      showSearch: true,
      showPhotos: true,
      showDuration: true,
      showPrice: true,
      cardRadius: 14,
      columnsDesktop: 2,
      columnsMobile: 1,
      categoryIds: [],
      showViewAll: true,
      viewAllLabel: "View All Services",
      bookButtonLabel: "Book",
      bookButtonStyle: "solid",
    },
    stylists: {
      title: "Meet the Stylists",
      subtitle: "Experts who bring your vision to life",
      members: [{ name: "Lead Stylist", role: "Color Specialist", imageUrl: "", bio: "" }],
    },
    reviewsMarquee: {
      title: "Loved by clients",
      subtitle: "Real stories from happy customers",
      style: "cards",
      speed: 35,
      pauseOnHover: true,
      showStars: true,
      rows: 1,
    },
    contactMap: {
      title: "Visit us",
      subtitle: "Walk-ins welcome during business hours",
      address: "123 Beauty Street, Your City",
      phone: "+1 (555) 000-1234",
      email: "hello@yourstudio.com",
      mapEmbedUrl: "",
      showForm: true,
    },
    faq: {
      title: "Frequently asked questions",
      items: [
        {
          question: "How far in advance should I book?",
          answer: "We recommend booking at least 2-3 days in advance for peak times.",
        },
      ],
    },
    footer: {
      copyright: "© MeetScheduling",
      tagline: "Built with MeetScheduling",
      links: [
        { label: "Privacy", href: "/privacy-policy" },
        { label: "Terms", href: "/legal" },
      ],
    },
  });

  const state = {
    pageId: "",
    page: null,
    draftConfig: null,
    publishedConfig: null,
    categories: [],
    services: [],
    reviews: [],
    eventTypes: [],
    history: [],
    sectionLibrary: [],
    selectedSectionId: "",
    selectedLibraryType: "",
    device: "desktop",
    saveTimer: null,
    saveInFlight: false,
    saveQueued: false,
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeText(value, fallback) {
    if (value === undefined || value === null) return fallback || "";
    const text = String(value);
    return text.trim() ? text : fallback || "";
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
      throw new Error(payload.error || payload.message || "Request failed");
    }

    return payload;
  }

  function sectionList() {
    return Array.isArray(state.draftConfig?.sections) ? state.draftConfig.sections : [];
  }

  function getSectionById(sectionId) {
    return sectionList().find((item) => String(item.id) === String(sectionId)) || null;
  }

  function selectedSection() {
    return getSectionById(state.selectedSectionId);
  }

  function findSectionIndexById(sectionId) {
    return sectionList().findIndex((item) => String(item.id) === String(sectionId));
  }

  function setSaveStatus(type, customText) {
    if (!els.saveStatus) return;
    els.saveStatus.classList.remove("is-saving", "is-error");
    if (type === "saving") {
      els.saveStatus.classList.add("is-saving");
      els.saveStatus.textContent = customText || "Saving...";
      return;
    }
    if (type === "error") {
      els.saveStatus.classList.add("is-error");
      els.saveStatus.textContent = customText || "Save failed";
      return;
    }
    els.saveStatus.textContent = customText || "Saved";
  }

  function ensureSelection() {
    const sections = sectionList();
    if (!sections.length) {
      state.selectedSectionId = "";
      return;
    }
    if (!state.selectedSectionId || !sections.some((item) => item.id === state.selectedSectionId)) {
      state.selectedSectionId = sections[0].id;
    }
  }

  function parsePageIdFromPath() {
    const match = window.location.pathname.match(/\/dashboard\/landing-page\/([^/]+)\/editor/);
    if (!match) return "";
    return decodeURIComponent(match[1]);
  }

  function formatDateTime(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unknown";
    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function pageShareUrl() {
    if (!state.page) return "";
    return `${window.location.origin}${state.page.shareUrl || `/${state.page.slug}`}`;
  }

  function createSection(type) {
    const defaults = deepClone(SECTION_DEFAULTS[type] || {});
    return {
      id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      enabled: true,
      settings: defaults,
    };
  }

  function normalizePayload(payload) {
    state.page = payload.page || state.page;
    state.draftConfig = deepClone(payload.draftConfig || state.draftConfig || { theme: {}, sections: [] });
    state.publishedConfig = deepClone(payload.publishedConfig || state.publishedConfig || { theme: {}, sections: [] });
    state.categories = Array.isArray(payload.categories) ? payload.categories : state.categories;
    state.services = Array.isArray(payload.services) ? payload.services : state.services;
    state.reviews = Array.isArray(payload.reviews) ? payload.reviews : state.reviews;
    state.eventTypes = Array.isArray(payload.eventTypes) ? payload.eventTypes : state.eventTypes;
    state.history = Array.isArray(payload.history) ? payload.history : state.history;
    state.sectionLibrary = Array.isArray(payload.sectionLibrary) ? payload.sectionLibrary : state.sectionLibrary;
    ensureSelection();
  }

  function setPathValue(path, rawValue, kind) {
    if (!path) return;
    let value = rawValue;
    if (kind === "number") {
      const parsed = Number(value);
      value = Number.isFinite(parsed) ? parsed : 0;
    } else if (kind === "boolean") {
      value = Boolean(rawValue);
    }

    if (path.startsWith("page.")) {
      const key = path.slice("page.".length);
      if (state.page) state.page[key] = value;
      return;
    }

    const parts = path.split(".");
    let cursor = state.draftConfig;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const tokenPart = parts[index];
      if (!Object.prototype.hasOwnProperty.call(cursor, tokenPart)) {
        const nextPart = parts[index + 1];
        cursor[tokenPart] = /^\d+$/.test(nextPart) ? [] : {};
      }
      cursor = cursor[tokenPart];
      if (cursor === undefined || cursor === null) return;
    }
    cursor[parts[parts.length - 1]] = value;
  }

  function queueAutosave() {
    setSaveStatus("saving", "Saving draft...");
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      saveDraft();
    }, 700);
  }

  async function saveDraft(forceNow) {
    if (state.saveInFlight && !forceNow) {
      state.saveQueued = true;
      return;
    }
    if (!state.pageId || !state.draftConfig) return;

    state.saveInFlight = true;
    setSaveStatus("saving");
    try {
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`, {
        method: "PUT",
        body: JSON.stringify({
          title: state.page?.title,
          slug: state.page?.slug,
          config: state.draftConfig,
        }),
      });
      normalizePayload(payload);
      setSaveStatus("saved", "Saved");
      renderStaticSections();
      renderPreview();
    } catch (error) {
      setSaveStatus("error", error.message || "Save failed");
    } finally {
      state.saveInFlight = false;
      if (state.saveQueued) {
        state.saveQueued = false;
        saveDraft();
      }
    }
  }

  function renderPageMeta() {
    if (els.pageTitle) {
      els.pageTitle.textContent = state.page?.title || "Landing Page Editor";
    }
    if (els.pageMeta) {
      const slug = state.page?.slug ? `/${state.page.slug}` : "";
      const updatedAt = state.page?.updatedAt ? formatDateTime(state.page.updatedAt) : "unknown";
      els.pageMeta.textContent = `${slug} • last updated ${updatedAt}`;
    }
  }

  function renderSectionsList() {
    if (!els.sectionsList) return;
    const sections = sectionList();
    const labelByType = new Map(
      (Array.isArray(state.sectionLibrary) ? state.sectionLibrary : []).map((item) => [
        String(item.type || ""),
        String(item.label || item.type || ""),
      ])
    );
    els.sectionsList.innerHTML = sections
      .map(
        (section, index) => `
          <li class="lpe-section-row ${section.id === state.selectedSectionId ? "is-active" : ""}" draggable="true" data-index="${index}" data-section-id="${escapeHtml(section.id)}">
            <div class="lpe-section-main">
              <span class="lpe-section-grip">&#8942;</span>
              <button type="button" class="lpe-section-name" data-action="select-section" data-section-id="${escapeHtml(
                section.id
              )}">${escapeHtml(labelByType.get(String(section.type)) || section.type)}</button>
            </div>
            <div class="lpe-section-actions">
              <button type="button" class="lpe-icon-btn" data-action="toggle-section" data-section-id="${escapeHtml(
                section.id
              )}" aria-label="Toggle section">${section.enabled === false ? "&#128065;" : "&#128064;"}</button>
              <button type="button" class="lpe-icon-btn" data-action="duplicate-section" data-section-id="${escapeHtml(
                section.id
              )}" aria-label="Duplicate section">&#10697;</button>
              <button type="button" class="lpe-icon-btn" data-action="delete-section" data-section-id="${escapeHtml(
                section.id
              )}" aria-label="Delete section">&#10005;</button>
            </div>
          </li>
        `
      )
      .join("");
  }

  function themeField(label, path, value, type, extraAttrs) {
    const inputType = safeText(type, "text");
    return `
      <label class="lpe-field">
        <span>${escapeHtml(label)}</span>
        <input type="${escapeHtml(inputType)}" data-bind-path="${escapeHtml(path)}" ${
      inputType === "checkbox" ? "" : `value="${escapeHtml(String(value ?? ""))}"`
    } ${extraAttrs || ""} ${inputType === "checkbox" && value ? "checked" : ""} />
      </label>
    `;
  }

  function renderThemeControls() {
    if (!els.themeControls) return;
    const theme = state.draftConfig?.theme || {};
    els.themeControls.innerHTML = `
      ${themeField("Page title", "page.title", state.page?.title || "", "text", 'maxlength="160"')}
      ${themeField("Page slug", "page.slug", state.page?.slug || "", "text", 'maxlength="80"')}
      <div class="lpe-row-grid">
        ${themeField("Primary", "theme.primary", theme.primary || "#7c3aed", "color")}
        ${themeField("Secondary", "theme.secondary", theme.secondary || "#d946ef", "color")}
      </div>
      <div class="lpe-row-grid">
        ${themeField("Background", "theme.background", theme.background || "#f6f5fb", "color")}
        ${themeField("Surface", "theme.surface", theme.surface || "#ffffff", "color")}
      </div>
      <div class="lpe-row-grid">
        ${themeField("Text", "theme.text", theme.text || "#171a2b", "color")}
        ${themeField("Muted", "theme.muted", theme.muted || "#5f6377", "color")}
      </div>
      <label class="lpe-field">
        <span>Font</span>
        <select data-bind-path="theme.font">
          <option value="Inter" ${theme.font === "Inter" ? "selected" : ""}>Inter</option>
          <option value="DM Sans" ${theme.font === "DM Sans" ? "selected" : ""}>DM Sans</option>
          <option value="Sora" ${theme.font === "Sora" ? "selected" : ""}>Sora</option>
          <option value="System" ${theme.font === "System" ? "selected" : ""}>System</option>
        </select>
      </label>
      <div class="lpe-row-grid">
        <label class="lpe-field">
          <span>Radius (${Number(theme.radius || 14)})</span>
          <input type="range" min="0" max="28" value="${Number(theme.radius || 14)}" data-bind-path="theme.radius" data-bind-type="number" />
        </label>
        <label class="lpe-field">
          <span>Section Padding (${Number(theme.sectionPadding || 52)})</span>
          <input type="range" min="20" max="120" value="${Number(theme.sectionPadding || 52)}" data-bind-path="theme.sectionPadding" data-bind-type="number" />
        </label>
      </div>
      <div class="lpe-row-grid">
        <label class="lpe-field">
          <span>Button style</span>
          <select data-bind-path="theme.buttonStyle">
            <option value="solid" ${theme.buttonStyle === "solid" ? "selected" : ""}>Solid</option>
            <option value="outline" ${theme.buttonStyle === "outline" ? "selected" : ""}>Outline</option>
            <option value="gradient" ${theme.buttonStyle === "gradient" ? "selected" : ""}>Gradient</option>
          </select>
        </label>
        <label class="lpe-field">
          <span>Shadow</span>
          <select data-bind-path="theme.shadowStyle">
            <option value="none" ${theme.shadowStyle === "none" ? "selected" : ""}>None</option>
            <option value="minimal" ${theme.shadowStyle === "minimal" ? "selected" : ""}>Minimal</option>
            <option value="soft" ${theme.shadowStyle === "soft" ? "selected" : ""}>Soft</option>
            <option value="medium" ${theme.shadowStyle === "medium" ? "selected" : ""}>Medium</option>
          </select>
        </label>
      </div>
      <label class="lpe-checkbox"><input type="checkbox" data-bind-path="theme.animationsEnabled" data-bind-type="boolean" ${
        theme.animationsEnabled === false ? "" : "checked"
      } /> Enable animations</label>
      <label class="lpe-field">
        <span>Animation style</span>
        <select data-bind-path="theme.animationStyle">
          <option value="subtle" ${theme.animationStyle === "subtle" ? "selected" : ""}>Subtle</option>
          <option value="medium" ${theme.animationStyle === "medium" ? "selected" : ""}>Medium</option>
          <option value="bold" ${theme.animationStyle === "bold" ? "selected" : ""}>Bold</option>
        </select>
      </label>
    `;
  }

  function baseTextField(label, path, value, max) {
    return `
      <label class="lpe-field">
        <span>${escapeHtml(label)}</span>
        <input type="text" data-bind-path="${escapeHtml(path)}" value="${escapeHtml(String(value || ""))}" ${
      max ? `maxlength="${Number(max)}"` : ""
    } />
      </label>
    `;
  }

  function baseTextareaField(label, path, value, max) {
    return `
      <label class="lpe-field">
        <span>${escapeHtml(label)}</span>
        <textarea data-bind-path="${escapeHtml(path)}" ${
      max ? `maxlength="${Number(max)}"` : ""
    }>${escapeHtml(String(value || ""))}</textarea>
      </label>
    `;
  }

  function sectionControlsHtml(section, sectionIndex) {
    if (!section) {
      return '<p class="lp-empty">Select a section from the left panel to edit its settings.</p>';
    }

    const settingsPath = `sections.${sectionIndex}.settings`;
    const settings = section.settings || {};

    let html = `
      <label class="lpe-checkbox"><input type="checkbox" data-bind-path="sections.${sectionIndex}.enabled" data-bind-type="boolean" ${
      section.enabled === false ? "" : "checked"
    } /> Section visible</label>
    `;

    if (section.type === "header") {
      html += `
        ${baseTextField("Brand name", `${settingsPath}.brandName`, settings.brandName, 120)}
        ${baseTextField("Logo URL", `${settingsPath}.logoUrl`, settings.logoUrl, 2000)}
        <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showSearch" data-bind-type="boolean" ${
          settings.showSearch ? "checked" : ""
        } /> Show search</label>
        ${baseTextField("Search placeholder", `${settingsPath}.searchPlaceholder`, settings.searchPlaceholder, 80)}
        <div class="lpe-row-grid">
          ${baseTextField("CTA label", `${settingsPath}.ctaLabel`, settings.ctaLabel, 60)}
          ${baseTextField("CTA href", `${settingsPath}.ctaHref`, settings.ctaHref, 200)}
        </div>
      `;
    } else if (section.type === "hero") {
      html += `
        ${baseTextField("Badge", `${settingsPath}.badge`, settings.badge, 80)}
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 200)}
        ${baseTextareaField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 800)}
        <div class="lpe-row-grid">
          ${baseTextField("Primary label", `${settingsPath}.primaryButtonLabel`, settings.primaryButtonLabel, 60)}
          ${baseTextField("Primary href", `${settingsPath}.primaryButtonHref`, settings.primaryButtonHref, 200)}
        </div>
        <div class="lpe-row-grid">
          ${baseTextField("Secondary label", `${settingsPath}.secondaryButtonLabel`, settings.secondaryButtonLabel, 60)}
          ${baseTextField("Secondary href", `${settingsPath}.secondaryButtonHref`, settings.secondaryButtonHref, 200)}
        </div>
        ${baseTextField("Background image URL", `${settingsPath}.backgroundImageUrl`, settings.backgroundImageUrl, 2000)}
      `;
    } else if (section.type === "text") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 180)}
        ${baseTextareaField("Body", `${settingsPath}.body`, settings.body, 4000)}
      `;
    } else if (section.type === "imageShowcase") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <div class="lpe-row-grid">
          <label class="lpe-field">
            <span>Desktop columns</span>
            <input type="number" min="1" max="4" data-bind-path="${settingsPath}.columnsDesktop" data-bind-type="number" value="${Number(
        settings.columnsDesktop || 3
      )}" />
          </label>
          <label class="lpe-field">
            <span>Mobile columns</span>
            <input type="number" min="1" max="2" data-bind-path="${settingsPath}.columnsMobile" data-bind-type="number" value="${Number(
        settings.columnsMobile || 1
      )}" />
          </label>
        </div>
        <div class="lpe-list-stack">
          ${(Array.isArray(settings.images) ? settings.images : []).map((item, imageIndex) => `
            <article class="lpe-list-item">
              ${baseTextField("Image URL", `${settingsPath}.images.${imageIndex}.url`, item.url, 2000)}
              ${baseTextField("Alt", `${settingsPath}.images.${imageIndex}.alt`, item.alt, 180)}
              <div class="lpe-inline-actions">
                <button type="button" class="lpe-btn lpe-btn-secondary" data-action="remove-array-item" data-path="${settingsPath}.images" data-index="${imageIndex}">Remove image</button>
              </div>
            </article>
          `).join("")}
          <button type="button" class="lpe-btn lpe-btn-secondary" data-action="add-image-item" data-path="${settingsPath}.images">+ Add image</button>
        </div>
      `;
    } else if (section.type === "servicesMenu") {
      const categories = Array.isArray(state.categories) ? state.categories : [];
      const selectedIds = Array.isArray(settings.categoryIds) ? settings.categoryIds.map(String) : [];
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <div class="lpe-row-grid">
          <label class="lpe-field">
            <span>View mode</span>
            <select data-bind-path="${settingsPath}.viewMode">
              <option value="tabs" ${settings.viewMode === "tabs" ? "selected" : ""}>Tabbed view</option>
              <option value="stacked" ${settings.viewMode === "stacked" ? "selected" : ""}>Stacked list</option>
            </select>
          </label>
          <label class="lpe-field">
            <span>Book button style</span>
            <select data-bind-path="${settingsPath}.bookButtonStyle">
              <option value="solid" ${settings.bookButtonStyle === "solid" ? "selected" : ""}>Solid</option>
              <option value="outline" ${settings.bookButtonStyle === "outline" ? "selected" : ""}>Outline</option>
              <option value="gradient" ${settings.bookButtonStyle === "gradient" ? "selected" : ""}>Gradient</option>
            </select>
          </label>
        </div>
        <div class="lpe-row-grid">
          <label class="lpe-field">
            <span>Desktop columns</span>
            <input type="number" min="1" max="3" data-bind-path="${settingsPath}.columnsDesktop" data-bind-type="number" value="${Number(
        settings.columnsDesktop || 2
      )}" />
          </label>
          <label class="lpe-field">
            <span>Card radius</span>
            <input type="range" min="0" max="30" data-bind-path="${settingsPath}.cardRadius" data-bind-type="number" value="${Number(
        settings.cardRadius || 14
      )}" />
          </label>
        </div>
        <div class="lpe-row-grid">
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showSearch" data-bind-type="boolean" ${
        settings.showSearch ? "checked" : ""
      } /> Search</label>
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showPhotos" data-bind-type="boolean" ${
        settings.showPhotos ? "checked" : ""
      } /> Service photo</label>
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showDuration" data-bind-type="boolean" ${
        settings.showDuration ? "checked" : ""
      } /> Duration</label>
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showPrice" data-bind-type="boolean" ${
        settings.showPrice ? "checked" : ""
      } /> Price</label>
        </div>
        ${baseTextField("Book button label", `${settingsPath}.bookButtonLabel`, settings.bookButtonLabel, 50)}
        <div class="lpe-field">
          <span class="lpe-field-label">Active categories</span>
          <div class="lpe-list-stack">
            ${categories.map((category) => `
              <label class="lpe-checkbox">
                <input type="checkbox" data-action="toggle-category-id" data-section-index="${sectionIndex}" data-category-id="${escapeHtml(
        category.id
      )}" ${selectedIds.includes(String(category.id)) ? "checked" : ""} />
                ${escapeHtml(category.name)}
              </label>
            `).join("")}
          </div>
          <div class="lpe-inline-actions">
            <button type="button" class="lpe-btn lpe-btn-secondary" data-action="create-category">+ Add category</button>
          </div>
        </div>
        <div class="lpe-field">
          <span class="lpe-field-label">Services</span>
          <div class="lpe-list-stack">
            ${state.services.slice(0, 10).map((service) => `
              <article class="lpe-list-item">
                <strong>${escapeHtml(service.name)}</strong>
                <p>${escapeHtml(service.categoryName || "Uncategorized")} • ${escapeHtml(renderer.formatDuration(service.durationMinutes))} • ${escapeHtml(
        renderer.formatPrice(service.priceCents)
      )}</p>
                <div class="lpe-inline-actions">
                  <button type="button" class="lpe-icon-btn" data-action="edit-service" data-service-id="${escapeHtml(
                    service.id
                  )}" aria-label="Edit service">&#9998;</button>
                  <button type="button" class="lpe-icon-btn" data-action="delete-service" data-service-id="${escapeHtml(
                    service.id
                  )}" aria-label="Delete service">&#10005;</button>
                </div>
              </article>
            `).join("")}
          </div>
          <div class="lpe-inline-actions">
            <button type="button" class="lpe-btn lpe-btn-secondary" data-action="create-service">+ Add service</button>
          </div>
        </div>
      `;
    } else if (section.type === "reviewsMarquee") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <div class="lpe-row-grid">
          <label class="lpe-field">
            <span>Style</span>
            <select data-bind-path="${settingsPath}.style">
              <option value="cards" ${settings.style === "cards" ? "selected" : ""}>Cards</option>
              <option value="marquee" ${settings.style === "marquee" ? "selected" : ""}>Marquee</option>
              <option value="multi-row" ${settings.style === "multi-row" ? "selected" : ""}>Multi-row</option>
            </select>
          </label>
          <label class="lpe-field">
            <span>Speed (${Number(settings.speed || 35)}s)</span>
            <input type="range" min="10" max="80" data-bind-path="${settingsPath}.speed" data-bind-type="number" value="${Number(
        settings.speed || 35
      )}" />
          </label>
        </div>
        <div class="lpe-row-grid">
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.pauseOnHover" data-bind-type="boolean" ${
        settings.pauseOnHover ? "checked" : ""
      } /> Pause on hover</label>
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showStars" data-bind-type="boolean" ${
        settings.showStars ? "checked" : ""
      } /> Show stars</label>
        </div>
        <div class="lpe-field">
          <span class="lpe-field-label">Reviews</span>
          <div class="lpe-list-stack">
            ${state.reviews.slice(0, 10).map((review) => `
              <article class="lpe-list-item">
                <strong>${escapeHtml(review.name)} (${escapeHtml(String(review.rating))}/5)</strong>
                <p>${escapeHtml(review.text)}</p>
                <div class="lpe-inline-actions">
                  <button type="button" class="lpe-icon-btn" data-action="edit-review" data-review-id="${escapeHtml(
                    review.id
                  )}" aria-label="Edit review">&#9998;</button>
                  <button type="button" class="lpe-icon-btn" data-action="delete-review" data-review-id="${escapeHtml(
                    review.id
                  )}" aria-label="Delete review">&#10005;</button>
                </div>
              </article>
            `).join("")}
          </div>
          <div class="lpe-inline-actions">
            <button type="button" class="lpe-btn lpe-btn-secondary" data-action="create-review">+ Add review</button>
          </div>
        </div>
      `;
    } else if (section.type === "stylists") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
      `;
    } else if (section.type === "contactMap") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        ${baseTextField("Address", `${settingsPath}.address`, settings.address, 300)}
        <div class="lpe-row-grid">
          ${baseTextField("Phone", `${settingsPath}.phone`, settings.phone, 80)}
          ${baseTextField("Email", `${settingsPath}.email`, settings.email, 180)}
        </div>
        ${baseTextField("Map embed URL", `${settingsPath}.mapEmbedUrl`, settings.mapEmbedUrl, 2000)}
        <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showForm" data-bind-type="boolean" ${
          settings.showForm ? "checked" : ""
        } /> Show contact form</label>
      `;
    } else if (section.type === "faq") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        <div class="lpe-list-stack">
          ${(Array.isArray(settings.items) ? settings.items : []).map((item, itemIndex) => `
            <article class="lpe-list-item">
              ${baseTextField("Question", `${settingsPath}.items.${itemIndex}.question`, item.question, 180)}
              ${baseTextareaField("Answer", `${settingsPath}.items.${itemIndex}.answer`, item.answer, 1200)}
              <button type="button" class="lpe-btn lpe-btn-secondary" data-action="remove-array-item" data-path="${settingsPath}.items" data-index="${itemIndex}">Remove item</button>
            </article>
          `).join("")}
          <button type="button" class="lpe-btn lpe-btn-secondary" data-action="add-faq-item" data-path="${settingsPath}.items">+ Add FAQ item</button>
        </div>
      `;
    } else if (section.type === "footer") {
      html += `
        ${baseTextField("Copyright", `${settingsPath}.copyright`, settings.copyright, 180)}
        ${baseTextField("Tagline", `${settingsPath}.tagline`, settings.tagline, 180)}
      `;
    }

    return html;
  }

  function renderSectionControls() {
    if (!els.sectionControls) return;
    const selected = selectedSection();
    const index = selected ? findSectionIndexById(selected.id) : -1;
    els.sectionControls.innerHTML = sectionControlsHtml(selected, index);
  }

  function renderHistory() {
    if (!els.historyList) return;
    if (!state.history.length) {
      els.historyList.innerHTML = '<p class="lp-empty">No versions yet.</p>';
      return;
    }
    els.historyList.innerHTML = state.history
      .map(
        (item) => `
          <article class="lpe-history-item">
            <strong>${escapeHtml(item.sourceStatus || "draft")} v${escapeHtml(String(item.versionNumber || 1))}</strong>
            <time>${escapeHtml(formatDateTime(item.createdAt))}</time>
            <button type="button" class="lpe-btn lpe-btn-secondary" data-action="restore-version" data-history-id="${escapeHtml(
              item.id
            )}">Restore</button>
          </article>
        `
      )
      .join("");
  }

  function renderPreview() {
    if (!els.previewRoot || !state.draftConfig || !state.page) return;
    renderer.renderInto(
      els.previewRoot,
      {
        page: state.page,
        config: state.draftConfig,
        categories: state.categories,
        services: state.services,
        reviews: state.reviews,
      },
      {
        mode: "preview",
        selectedSectionId: state.selectedSectionId,
        onSelectSection(sectionId) {
          state.selectedSectionId = sectionId;
          renderSectionsList();
          renderSectionControls();
        },
        onInlineEdit(path, value) {
          setPathValue(path, value, "string");
          queueAutosave();
          renderPreview();
        },
      }
    );
  }

  function renderStaticSections() {
    renderPageMeta();
    renderSectionsList();
    renderThemeControls();
    renderSectionControls();
    renderHistory();
  }

  function renderAll() {
    renderStaticSections();
    renderPreview();
  }

  function categoryName(categoryId) {
    const category = state.categories.find((item) => String(item.id) === String(categoryId));
    return category ? category.name : "Uncategorized";
  }

  async function createCategoryPrompt() {
    const name = window.prompt("Category name");
    if (!name || !name.trim()) return;
    try {
      await apiRequest("/api/dashboard/pages/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      queueAutosave();
    } catch (error) {
      alert(error.message || "Could not create category");
    }
  }

  async function createServicePrompt() {
    const name = window.prompt("Service name");
    if (!name || !name.trim()) return;
    const durationRaw = window.prompt("Duration in minutes", "60");
    const priceRaw = window.prompt("Price (USD)", "120");
    const categoryOptions = state.categories.map((item, index) => `${index + 1}. ${item.name}`).join("\n");
    const categoryChoice = window.prompt(
      `Choose category number (optional)\n${categoryOptions}`,
      state.categories.length ? "1" : ""
    );
    const categoryIndex = Number(categoryChoice);
    const category = Number.isFinite(categoryIndex) && categoryIndex > 0 ? state.categories[categoryIndex - 1] : null;

    try {
      await apiRequest("/api/dashboard/pages/services", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          durationMinutes: Number(durationRaw) || 60,
          price: priceRaw || "0",
          categoryId: category ? category.id : null,
        }),
      });
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      queueAutosave();
    } catch (error) {
      alert(error.message || "Could not create service");
    }
  }

  async function editServicePrompt(serviceId) {
    const current = state.services.find((item) => String(item.id) === String(serviceId));
    if (!current) return;
    const name = window.prompt("Service name", current.name || "");
    if (!name || !name.trim()) return;
    const duration = window.prompt("Duration in minutes", String(current.durationMinutes || 60));
    const price = window.prompt("Price (USD)", String((Number(current.priceCents || 0) / 100).toFixed(2)));
    try {
      await apiRequest(`/api/dashboard/pages/services/${encodeURIComponent(serviceId)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          durationMinutes: Number(duration) || current.durationMinutes || 60,
          price,
        }),
      });
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      queueAutosave();
    } catch (error) {
      alert(error.message || "Could not update service");
    }
  }

  async function deleteService(serviceId) {
    if (!window.confirm("Delete this service?")) return;
    try {
      await apiRequest(`/api/dashboard/pages/services/${encodeURIComponent(serviceId)}`, {
        method: "DELETE",
      });
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      queueAutosave();
    } catch (error) {
      alert(error.message || "Could not delete service");
    }
  }

  async function createReviewPrompt() {
    const name = window.prompt("Reviewer name");
    if (!name || !name.trim()) return;
    const rating = window.prompt("Rating (1-5)", "5");
    const text = window.prompt("Review text");
    if (!text || !text.trim()) return;
    try {
      await apiRequest("/api/dashboard/pages/reviews", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          rating: Number(rating) || 5,
          text: text.trim(),
        }),
      });
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      queueAutosave();
    } catch (error) {
      alert(error.message || "Could not create review");
    }
  }

  async function editReviewPrompt(reviewId) {
    const current = state.reviews.find((item) => String(item.id) === String(reviewId));
    if (!current) return;
    const name = window.prompt("Reviewer name", current.name || "");
    if (!name || !name.trim()) return;
    const rating = window.prompt("Rating (1-5)", String(current.rating || 5));
    const text = window.prompt("Review text", current.text || "");
    if (!text || !text.trim()) return;
    try {
      await apiRequest(`/api/dashboard/pages/reviews/${encodeURIComponent(reviewId)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          rating: Number(rating) || current.rating || 5,
          text: text.trim(),
        }),
      });
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      queueAutosave();
    } catch (error) {
      alert(error.message || "Could not update review");
    }
  }

  async function deleteReview(reviewId) {
    if (!window.confirm("Delete this review?")) return;
    try {
      await apiRequest(`/api/dashboard/pages/reviews/${encodeURIComponent(reviewId)}`, {
        method: "DELETE",
      });
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      queueAutosave();
    } catch (error) {
      alert(error.message || "Could not delete review");
    }
  }

  function removeArrayItem(path, index) {
    const parts = path.split(".");
    let cursor = state.draftConfig;
    for (let i = 0; i < parts.length; i += 1) {
      const tokenPart = parts[i];
      if (i === parts.length - 1) {
        if (Array.isArray(cursor[tokenPart])) {
          cursor[tokenPart].splice(index, 1);
        }
      } else {
        cursor = cursor[tokenPart];
        if (!cursor) return;
      }
    }
    renderAll();
    queueAutosave();
  }

  function addArrayItem(path, value) {
    const parts = path.split(".");
    let cursor = state.draftConfig;
    for (let i = 0; i < parts.length; i += 1) {
      const tokenPart = parts[i];
      if (i === parts.length - 1) {
        if (!Array.isArray(cursor[tokenPart])) {
          cursor[tokenPart] = [];
        }
        cursor[tokenPart].push(value);
      } else {
        if (!cursor[tokenPart]) cursor[tokenPart] = {};
        cursor = cursor[tokenPart];
      }
    }
    renderAll();
    queueAutosave();
  }

  function toggleCategorySelection(sectionIndex, categoryId, checked) {
    const section = sectionList()[sectionIndex];
    if (!section || section.type !== "servicesMenu") return;
    const current = Array.isArray(section.settings.categoryIds)
      ? section.settings.categoryIds.map(String)
      : [];
    const next = current.filter((item) => item !== String(categoryId));
    if (checked) next.push(String(categoryId));
    section.settings.categoryIds = Array.from(new Set(next));
    renderPreview();
    queueAutosave();
  }

  async function restoreHistory(historyId) {
    if (!window.confirm("Restore this version into draft?")) return;
    try {
      const payload = await apiRequest(
        `/api/dashboard/pages/${encodeURIComponent(state.pageId)}/restore/${encodeURIComponent(historyId)}`,
        { method: "POST" }
      );
      normalizePayload(payload);
      renderAll();
      setSaveStatus("saved", "Restored");
    } catch (error) {
      setSaveStatus("error", error.message || "Restore failed");
    }
  }

  async function publishPage() {
    if (!window.confirm("Publish current draft to live page?")) return;
    setSaveStatus("saving", "Publishing...");
    try {
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/publish`, {
        method: "POST",
      });
      normalizePayload(payload);
      renderAll();
      setSaveStatus("saved", "Published");
    } catch (error) {
      setSaveStatus("error", error.message || "Publish failed");
    }
  }

  function copyLink() {
    const link = pageShareUrl();
    if (!link) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(
        () => setSaveStatus("saved", "Link copied"),
        () => setSaveStatus("error", "Copy failed")
      );
      return;
    }
    const helper = document.createElement("textarea");
    helper.value = link;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    setSaveStatus("saved", "Link copied");
  }

  function openPreview() {
    const link = pageShareUrl();
    if (!link) return;
    window.open(link, "_blank", "noopener");
  }

  function reorderSections(fromIndex, toIndex) {
    const sections = sectionList();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= sections.length || toIndex >= sections.length) return;
    const [moved] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, moved);
    renderAll();
    queueAutosave();
  }

  function addSection(type) {
    const entry = state.sectionLibrary.find((item) => item.type === type);
    if (!entry) return;
    const existsSingleton = entry.singleton && sectionList().some((section) => section.type === type);
    if (existsSingleton) {
      alert("This section type can only be added once.");
      return;
    }
    const next = createSection(type);
    sectionList().push(next);
    state.selectedSectionId = next.id;
    renderAll();
    queueAutosave();
  }

  function renderLibraryModal() {
    if (!els.libraryGrid) return;
    const groups = {
      essentials: "Essentials",
      salon: "Salon Specific",
      info: "Information",
    };

    const grouped = Object.keys(groups).map((key) => ({
      key,
      label: groups[key],
      items: state.sectionLibrary.filter((item) => item.category === key),
    }));

    els.libraryGrid.innerHTML = grouped
      .map(
        (group) => `
          <section class="lpe-library-group">
            <h3>${escapeHtml(group.label)}</h3>
            <div class="lpe-library-cards">
              ${group.items
                .map(
                  (item) => `
                    <article class="lpe-library-card ${
                      state.selectedLibraryType === item.type ? "is-selected" : ""
                    }" data-action="select-library" data-type="${escapeHtml(item.type)}">
                      <h4>${escapeHtml(item.label)}</h4>
                      <p>${escapeHtml(item.description)}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>
        `
      )
      .join("");
  }

  function openAddDialog() {
    if (!els.addDialog) return;
    state.selectedLibraryType = "";
    renderLibraryModal();
    els.addDialog.showModal();
  }

  function bindTopbarEvents() {
    document.querySelectorAll(".lpe-device-toggle button[data-device]").forEach((button) => {
      button.addEventListener("click", () => {
        const device = button.getAttribute("data-device");
        if (!device) return;
        state.device = device;
        document.querySelectorAll(".lpe-device-toggle button[data-device]").forEach((item) => {
          item.classList.toggle("is-active", item.getAttribute("data-device") === device);
        });
        if (els.previewFrame) {
          els.previewFrame.classList.toggle("is-desktop", device === "desktop");
          els.previewFrame.classList.toggle("is-mobile", device === "mobile");
        }
      });
    });

    if (els.previewBtn) els.previewBtn.addEventListener("click", openPreview);
    if (els.copyLinkBtn) els.copyLinkBtn.addEventListener("click", copyLink);
    if (els.publishBtn) els.publishBtn.addEventListener("click", publishPage);
    if (els.saveBtn) {
      els.saveBtn.addEventListener("click", () => {
        if (state.saveTimer) clearTimeout(state.saveTimer);
        saveDraft(true);
      });
    }
  }

  function bindSectionsEvents() {
    if (!els.sectionsList) return;
    let dragFrom = -1;

    els.sectionsList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-action");
      const sectionId = target.getAttribute("data-section-id");
      if (!action || !sectionId) return;

      if (action === "select-section") {
        state.selectedSectionId = sectionId;
        renderSectionsList();
        renderSectionControls();
        renderPreview();
        return;
      }

      const index = findSectionIndexById(sectionId);
      if (index < 0) return;

      if (action === "toggle-section") {
        const section = sectionList()[index];
        section.enabled = !(section.enabled !== false);
        renderAll();
        queueAutosave();
        return;
      }

      if (action === "duplicate-section") {
        const source = sectionList()[index];
        const clone = deepClone(source);
        clone.id = `${source.type}-${Math.random().toString(36).slice(2, 8)}`;
        sectionList().splice(index + 1, 0, clone);
        state.selectedSectionId = clone.id;
        renderAll();
        queueAutosave();
        return;
      }

      if (action === "delete-section") {
        if (sectionList().length === 1) {
          alert("At least one section is required.");
          return;
        }
        sectionList().splice(index, 1);
        ensureSelection();
        renderAll();
        queueAutosave();
      }
    });

    els.sectionsList.addEventListener("dragstart", (event) => {
      const row = event.target.closest("[data-index]");
      if (!row) return;
      dragFrom = Number(row.getAttribute("data-index"));
      if (Number.isFinite(dragFrom)) {
        event.dataTransfer.effectAllowed = "move";
      }
    });

    els.sectionsList.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    els.sectionsList.addEventListener("drop", (event) => {
      event.preventDefault();
      const row = event.target.closest("[data-index]");
      if (!row) return;
      const toIndex = Number(row.getAttribute("data-index"));
      if (!Number.isFinite(toIndex) || !Number.isFinite(dragFrom)) return;
      reorderSections(dragFrom, toIndex);
      dragFrom = -1;
    });
  }

  function bindControlsEvents() {
    const attachValueBinding = (container) => {
      if (!container) return;
      const handleBind = (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const path = target.getAttribute("data-bind-path");
        if (!path) return;
        const kind = target.getAttribute("data-bind-type") || "string";
        const value =
          target instanceof HTMLInputElement && target.type === "checkbox"
            ? target.checked
            : target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
              ? target.value
              : "";
        setPathValue(path, value, kind);
        renderPreview();
        queueAutosave();
      };
      container.addEventListener("input", handleBind);
      container.addEventListener("change", handleBind);
    };

    attachValueBinding(els.themeControls);
    attachValueBinding(els.sectionControls);

    if (els.sectionControls) {
      els.sectionControls.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        if (!action) return;

        if (action === "add-image-item") {
          addArrayItem(target.getAttribute("data-path"), { url: "", alt: "" });
          return;
        }
        if (action === "add-faq-item") {
          addArrayItem(target.getAttribute("data-path"), { question: "", answer: "" });
          return;
        }
        if (action === "remove-array-item") {
          const path = target.getAttribute("data-path");
          const index = Number(target.getAttribute("data-index"));
          removeArrayItem(path, index);
          return;
        }
        if (action === "toggle-category-id") return;
        if (action === "create-category") {
          createCategoryPrompt();
          return;
        }
        if (action === "create-service") {
          createServicePrompt();
          return;
        }
        if (action === "edit-service") {
          editServicePrompt(target.getAttribute("data-service-id"));
          return;
        }
        if (action === "delete-service") {
          deleteService(target.getAttribute("data-service-id"));
          return;
        }
        if (action === "create-review") {
          createReviewPrompt();
          return;
        }
        if (action === "edit-review") {
          editReviewPrompt(target.getAttribute("data-review-id"));
          return;
        }
        if (action === "delete-review") {
          deleteReview(target.getAttribute("data-review-id"));
        }
      });

      els.sectionControls.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const action = target.getAttribute("data-action");
        if (action !== "toggle-category-id") return;
        const sectionIndex = Number(target.getAttribute("data-section-index"));
        const categoryId = target.getAttribute("data-category-id");
        if (!Number.isFinite(sectionIndex) || !categoryId) return;
        toggleCategorySelection(sectionIndex, categoryId, target.checked);
      });
    }
  }

  function bindHistoryEvents() {
    if (!els.historyList) return;
    els.historyList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-action");
      if (action !== "restore-version") return;
      const historyId = target.getAttribute("data-history-id");
      if (!historyId) return;
      restoreHistory(historyId);
    });
  }

  function bindModalEvents() {
    if (els.addSectionBtn) {
      els.addSectionBtn.addEventListener("click", () => {
        openAddDialog();
      });
    }

    if (els.dialogCancel) {
      els.dialogCancel.addEventListener("click", () => {
        if (els.addDialog) els.addDialog.close();
      });
    }

    if (els.libraryGrid) {
      els.libraryGrid.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const card = target.closest("[data-action='select-library']");
        if (!card) return;
        const type = card.getAttribute("data-type");
        if (!type) return;
        state.selectedLibraryType = type;
        renderLibraryModal();
      });
    }

    if (els.dialogSelect) {
      els.dialogSelect.addEventListener("click", () => {
        if (!state.selectedLibraryType) {
          alert("Select a section first.");
          return;
        }
        addSection(state.selectedLibraryType);
        if (els.addDialog) els.addDialog.close();
      });
    }
  }

  async function loadEditor() {
    state.pageId = parsePageIdFromPath();
    if (!state.pageId) {
      setSaveStatus("error", "Invalid page id");
      return;
    }
    setSaveStatus("saving", "Loading...");
    try {
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/draft`);
      normalizePayload(payload);
      renderAll();
      setSaveStatus("saved", "Loaded");
    } catch (error) {
      setSaveStatus("error", error.message || "Load failed");
    }
  }

  bindTopbarEvents();
  bindSectionsEvents();
  bindControlsEvents();
  bindHistoryEvents();
  bindModalEvents();
  loadEditor();
})();
