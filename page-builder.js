(function pageBuilderController() {
  const renderer = window.BookingPageRenderer;
  if (!renderer) return;

  const AUTH_TOKEN_KEY = "meetscheduling_auth_token";

  const pageMetaEl = document.getElementById("pbuilder-page-meta");
  const saveStatusEl = document.getElementById("pbuilder-save-status");
  const liveLinkEl = document.getElementById("pbuilder-live-link");
  const publishBtn = document.getElementById("pbuilder-publish-btn");

  const themeControlsEl = document.getElementById("pbuilder-theme-controls");
  const sectionControlsEl = document.getElementById("pbuilder-section-controls");
  const sectionsListEl = document.getElementById("pbuilder-sections-list");
  const historyListEl = document.getElementById("pbuilder-history-list");

  const previewFrameEl = document.getElementById("pbuilder-preview-frame");
  const previewRootEl = document.getElementById("pbuilder-preview-root");

  const addTypeEl = document.getElementById("pbuilder-add-type");
  const addSectionBtn = document.getElementById("pbuilder-add-section-btn");

  const SECTION_TYPE_META = {
    header: { label: "Header", singleton: true },
    hero: { label: "Hero", singleton: false },
    serviceList: { label: "Service list", singleton: true },
    bookingWidget: { label: "Booking widget", singleton: true },
    detailsForm: { label: "Details form", singleton: true },
    confirmation: { label: "Confirmation", singleton: true },
    policies: { label: "Policies", singleton: true },
    footer: { label: "Footer", singleton: true },
  };

  const SECTION_ORDER = Object.keys(SECTION_TYPE_META);

  const SECTION_TEMPLATES = {
    header: {
      type: "header",
      visible: true,
      settings: {
        logoUrl: "/assets/scheduling-logo.svg",
        businessName: "MeetScheduling",
        showNav: false,
      },
    },
    hero: {
      type: "hero",
      visible: true,
      settings: {
        badge: "Online scheduling",
        title: "Book your appointment",
        description: "Pick a service and choose a time that works for you.",
      },
    },
    serviceList: {
      type: "serviceList",
      visible: true,
      settings: {
        title: "Choose appointment type",
        description: "Select one service to continue",
        layout: "cards",
        selectedServiceIds: [],
        showDuration: true,
      },
    },
    bookingWidget: {
      type: "bookingWidget",
      visible: true,
      settings: {
        title: "Select a date and time",
        showTimezone: true,
        showNextAvailable: true,
        layout: "split",
        dateRangeDays: 60,
      },
    },
    detailsForm: {
      type: "detailsForm",
      visible: true,
      settings: {
        title: "Enter your details",
        description: "We will send your confirmation instantly.",
        phoneEnabled: true,
        phoneRequired: false,
        customQuestions: [],
      },
    },
    confirmation: {
      type: "confirmation",
      visible: true,
      settings: {
        title: "You're scheduled",
        subtitle: "A confirmation email has been sent.",
        showAddToCalendar: true,
      },
    },
    policies: {
      type: "policies",
      visible: true,
      settings: {
        title: "Policies",
        cancellationPolicy: "Please cancel or reschedule at least 24 hours in advance.",
        reschedulePolicy: "Rescheduling is available up to 2 hours before the start time.",
      },
    },
    footer: {
      type: "footer",
      visible: true,
      settings: {
        copyright: "© MeetScheduling",
        secondaryText: "Secure scheduling powered by MeetScheduling.",
      },
    },
  };

  const state = {
    page: null,
    services: [],
    config: null,
    publishedConfig: null,
    history: [],
    selectedSectionId: "",
    device: "desktop",
    saveTimer: null,
    saveInFlight: false,
    saveQueued: false,
    initialized: false,
  };

  function getToken() {
    return String(localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();
  }

  function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("meetscheduling_auth_user");
  }

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

  async function apiRequest(path, options) {
    const token = getToken();
    if (!token) {
      window.location.replace("/login");
      throw new Error("Session expired. Please log in again.");
    }

    const headers = new Headers(options && options.headers ? options.headers : {});
    headers.set("Authorization", `Bearer ${token}`);
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

  function formatDateTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function setSaveStatus(type, customText) {
    if (!saveStatusEl) return;
    saveStatusEl.classList.remove("is-saving", "is-error");

    if (type === "saving") {
      saveStatusEl.classList.add("is-saving");
      saveStatusEl.textContent = customText || "Saving...";
      return;
    }

    if (type === "error") {
      saveStatusEl.classList.add("is-error");
      saveStatusEl.textContent = customText || "Save failed";
      return;
    }

    saveStatusEl.textContent = customText || "Saved";
  }

  function sectionList() {
    return Array.isArray(state.config && state.config.sections) ? state.config.sections : [];
  }

  function getSelectedSection() {
    return sectionList().find((section) => section.id === state.selectedSectionId) || null;
  }

  function setSelectedSection(sectionId) {
    const id = String(sectionId || "").trim();
    if (!id) return;
    const exists = sectionList().some((section) => section.id === id);
    if (!exists) return;
    state.selectedSectionId = id;
    renderSidebar();
    renderPreview();
  }

  function ensureSelectedSection() {
    const sections = sectionList();
    if (!sections.length) {
      state.selectedSectionId = "";
      return;
    }

    if (!state.selectedSectionId || !sections.some((section) => section.id === state.selectedSectionId)) {
      state.selectedSectionId = sections[0].id;
    }
  }

  function createId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function sectionLabel(type) {
    return SECTION_TYPE_META[type] ? SECTION_TYPE_META[type].label : type;
  }

  function buildPreviewState() {
    const previewState = renderer.defaultState();
    const services = Array.isArray(state.services) ? state.services : [];
    const serviceSection = sectionList().find((section) => section.type === "serviceList");

    let selectedServices = services;
    if (serviceSection && serviceSection.settings && Array.isArray(serviceSection.settings.selectedServiceIds)) {
      const ids = serviceSection.settings.selectedServiceIds;
      if (ids.length) {
        selectedServices = services.filter((service) => ids.includes(service.id));
      }
    }

    const firstService = selectedServices[0] || services[0] || null;
    if (firstService) previewState.selectedServiceId = firstService.id;

    const now = new Date();
    previewState.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    previewState.selectedDate = renderer.toDateKey(now);
    previewState.selectedDateLabel = renderer.humanDateLabel(previewState.selectedDate);

    const slots = [
      { startAtUtc: "sample-1", startLabel: "9:00 AM", startLocal: { time: "9:00 AM" }, endLocal: { time: "9:30 AM" }, token: "sample-1" },
      { startAtUtc: "sample-2", startLabel: "9:30 AM", startLocal: { time: "9:30 AM" }, endLocal: { time: "10:00 AM" }, token: "sample-2" },
      { startAtUtc: "sample-3", startLabel: "10:00 AM", startLocal: { time: "10:00 AM" }, endLocal: { time: "10:30 AM" }, token: "sample-3" },
      { startAtUtc: "sample-4", startLabel: "10:30 AM", startLocal: { time: "10:30 AM" }, endLocal: { time: "11:00 AM" }, token: "sample-4" },
    ];

    const monthDates = [];
    const base = renderer.parseDateKey(previewState.currentMonth);
    if (base) {
      const count = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      for (let index = 1; index <= count; index += 1) {
        const key = renderer.toDateKey(new Date(base.getFullYear(), base.getMonth(), index));
        const weekday = new Date(base.getFullYear(), base.getMonth(), index).getDay();
        previewState.availabilityMap[key] = weekday !== 0;
        monthDates.push(key);
      }
    }

    previewState.slots = slots;
    previewState.selectedSlotStart = "sample-1";
    previewState.nextAvailable = {
      date: monthDates.find((value) => value !== previewState.selectedDate) || previewState.selectedDate,
    };
    previewState.timezone = state.page && state.page.timezone ? state.page.timezone : previewState.timezone;
    previewState.timezoneOptions = [previewState.timezone, "UTC", "America/New_York", "Europe/London", "Asia/Kolkata"];
    previewState.form = {
      name: "Alex Customer",
      email: "alex@example.com",
      phone: "+1 555 432 1000",
      notes: "Looking forward to this call.",
      answers: {},
    };

    return previewState;
  }

  function renderThemeControls() {
    if (!themeControlsEl || !state.config || !state.config.theme) return;
    const theme = state.config.theme;

    themeControlsEl.innerHTML = `
      <div class="pbuilder-field">
        <label for="theme-brandColor">Brand color</label>
        <input id="theme-brandColor" class="pbuilder-color" type="color" data-theme-field="brandColor" value="${escapeHtml(
          theme.brandColor || "#1a73e8"
        )}" />
      </div>
      <div class="pbuilder-field">
        <label for="theme-surfaceColor">Surface color</label>
        <input id="theme-surfaceColor" class="pbuilder-color" type="color" data-theme-field="surfaceColor" value="${escapeHtml(
          theme.surfaceColor || "#ffffff"
        )}" />
      </div>
      <div class="pbuilder-field">
        <label for="theme-backgroundColor">Background color</label>
        <input id="theme-backgroundColor" class="pbuilder-color" type="color" data-theme-field="backgroundColor" value="${escapeHtml(
          theme.backgroundColor || "#f4f7fb"
        )}" />
      </div>
      <div class="pbuilder-field">
        <label for="theme-fontFamily">Font family</label>
        <select id="theme-fontFamily" class="pbuilder-select" data-theme-field="fontFamily">
          <option value="Inter" ${theme.fontFamily === "Inter" ? "selected" : ""}>Inter</option>
          <option value="DM Sans" ${theme.fontFamily === "DM Sans" ? "selected" : ""}>DM Sans</option>
          <option value="Sora" ${theme.fontFamily === "Sora" ? "selected" : ""}>Sora</option>
          <option value="System" ${theme.fontFamily === "System" ? "selected" : ""}>System</option>
        </select>
      </div>
      <div class="pbuilder-field">
        <label for="theme-buttonStyle">Button style</label>
        <select id="theme-buttonStyle" class="pbuilder-select" data-theme-field="buttonStyle">
          <option value="solid" ${theme.buttonStyle === "solid" ? "selected" : ""}>Solid</option>
          <option value="outline" ${theme.buttonStyle === "outline" ? "selected" : ""}>Outline</option>
          <option value="soft" ${theme.buttonStyle === "soft" ? "selected" : ""}>Soft</option>
        </select>
      </div>
      <div class="pbuilder-field">
        <div class="pbuilder-field-inline">
          <label for="theme-radius">Radius</label>
          <strong>${Number(theme.radius || 14)}px</strong>
        </div>
        <input id="theme-radius" class="pbuilder-range" type="range" min="0" max="24" step="1" data-theme-field="radius" value="${Number(
          theme.radius || 14
        )}" />
      </div>
      <div class="pbuilder-field">
        <div class="pbuilder-field-inline">
          <label for="theme-spacing">Spacing</label>
          <strong>${Number(theme.spacing || 16)}px</strong>
        </div>
        <input id="theme-spacing" class="pbuilder-range" type="range" min="8" max="32" step="1" data-theme-field="spacing" value="${Number(
          theme.spacing || 16
        )}" />
      </div>
    `;
  }

  function renderSectionsList() {
    if (!sectionsListEl) return;
    const items = sectionList();

    sectionsListEl.innerHTML = items
      .map((section) => {
        const selected = state.selectedSectionId === section.id;
        return `
          <li
            class="pbuilder-section-row ${selected ? "is-selected" : ""} ${section.visible === false ? "is-hidden" : ""}"
            data-section-id="${escapeHtml(section.id)}"
            draggable="true"
          >
            <div class="pbuilder-section-main">
              <div>
                <p class="pbuilder-section-title">${escapeHtml(sectionLabel(section.type))}</p>
                <p class="pbuilder-section-meta">${escapeHtml(section.type)}</p>
              </div>
              <div class="pbuilder-row-actions">
                <button type="button" class="pbuilder-action-icon" data-row-action="toggle" aria-label="Toggle section">
                  ${section.visible === false ? "Show" : "Hide"}
                </button>
                <button type="button" class="pbuilder-action-icon" data-row-action="duplicate" aria-label="Duplicate section">Copy</button>
                <button type="button" class="pbuilder-action-icon" data-row-action="delete" aria-label="Delete section">Del</button>
              </div>
            </div>
          </li>
        `;
      })
      .join("");
  }

  function renderServiceSelectorControl(section) {
    const serviceIds = Array.isArray(section.settings.selectedServiceIds)
      ? section.settings.selectedServiceIds
      : [];
    const services = Array.isArray(state.services) ? state.services : [];

    if (!services.length) {
      return '<p class="pbuilder-empty">No active services found. Create services first.</p>';
    }

    return `
      <div class="pbuilder-field">
        <span class="pbuilder-field-title">Visible services</span>
        <div class="pbuilder-service-pills">
          ${services
            .map((service) => {
              const checked = serviceIds.includes(service.id) || (!serviceIds.length && services.length > 0);
              return `<label class="pbuilder-pill"><input type="checkbox" data-service-toggle="${escapeHtml(
                service.id
              )}" ${checked ? "checked" : ""} />${escapeHtml(service.title)}</label>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderCustomQuestionsControl(section) {
    const questions = Array.isArray(section.settings.customQuestions)
      ? section.settings.customQuestions
      : [];

    return `
      <div class="pbuilder-field">
        <div class="pbuilder-field-inline">
          <span class="pbuilder-field-title">Custom questions</span>
          <button type="button" class="pbuilder-btn pbuilder-btn-secondary" data-question-action="add">Add</button>
        </div>
        <div class="pbuilder-controls">
          ${
            questions.length
              ? questions
                  .map(
                    (question, index) => `
                <div class="pbuilder-question-row" data-question-index="${index}">
                  <div class="pbuilder-field">
                    <label>Label</label>
                    <input class="pbuilder-input" type="text" data-question-field="label" value="${escapeHtml(
                      question.label || ""
                    )}" />
                  </div>
                  <div class="pbuilder-field">
                    <label>Type</label>
                    <select class="pbuilder-select" data-question-field="type">
                      <option value="text" ${question.type === "text" ? "selected" : ""}>Text</option>
                      <option value="textarea" ${question.type === "textarea" ? "selected" : ""}>Textarea</option>
                    </select>
                  </div>
                  <label class="pbuilder-checkbox"><input type="checkbox" data-question-field="required" ${
                    question.required ? "checked" : ""
                  } />Required</label>
                  <button type="button" class="pbuilder-btn pbuilder-btn-secondary" data-question-action="remove" data-question-index="${
                    index
                  }">Remove</button>
                </div>
              `
                  )
                  .join("")
              : '<p class="pbuilder-empty">No custom questions added.</p>'
          }
        </div>
      </div>
    `;
  }

  function renderSectionControls() {
    if (!sectionControlsEl) return;
    const section = getSelectedSection();

    if (!section) {
      sectionControlsEl.innerHTML = '<p class="pbuilder-empty">Select a section to edit settings.</p>';
      return;
    }

    const settings = section.settings || {};
    const baseControls = [];

    baseControls.push(`
      <div class="pbuilder-field">
        <label>Section type</label>
        <input class="pbuilder-input" type="text" value="${escapeHtml(sectionLabel(section.type))}" disabled />
      </div>
      <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="visible" ${
        section.visible === false ? "" : "checked"
      } />Visible on live page</label>
    `);

    if (section.type === "header") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Business name</label><input class="pbuilder-input" type="text" data-section-setting="businessName" value="${escapeHtml(
          settings.businessName || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Logo URL</label><input class="pbuilder-input" type="text" data-section-setting="logoUrl" value="${escapeHtml(
          settings.logoUrl || ""
        )}" /></div>
        <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="showNav" ${
          settings.showNav ? "checked" : ""
        } />Show navigation links</label>
      `);
    }

    if (section.type === "hero") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Badge</label><input class="pbuilder-input" type="text" data-section-setting="badge" value="${escapeHtml(
          settings.badge || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Title</label><input class="pbuilder-input" type="text" data-section-setting="title" value="${escapeHtml(
          settings.title || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Description</label><textarea class="pbuilder-textarea" data-section-setting="description">${escapeHtml(
          settings.description || ""
        )}</textarea></div>
      `);
    }

    if (section.type === "serviceList") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Title</label><input class="pbuilder-input" type="text" data-section-setting="title" value="${escapeHtml(
          settings.title || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Description</label><textarea class="pbuilder-textarea" data-section-setting="description">${escapeHtml(
          settings.description || ""
        )}</textarea></div>
        <div class="pbuilder-field"><label>Layout</label>
          <select class="pbuilder-select" data-section-setting="layout">
            <option value="cards" ${settings.layout === "cards" ? "selected" : ""}>Cards</option>
            <option value="list" ${settings.layout === "list" ? "selected" : ""}>List</option>
          </select>
        </div>
        <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="showDuration" ${
          settings.showDuration ? "checked" : ""
        } />Show duration on cards</label>
        ${renderServiceSelectorControl(section)}
      `);
    }

    if (section.type === "bookingWidget") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Title</label><input class="pbuilder-input" type="text" data-section-setting="title" value="${escapeHtml(
          settings.title || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Layout</label>
          <select class="pbuilder-select" data-section-setting="layout">
            <option value="split" ${settings.layout === "split" ? "selected" : ""}>Split</option>
            <option value="stacked" ${settings.layout === "stacked" ? "selected" : ""}>Stacked</option>
          </select>
        </div>
        <div class="pbuilder-field"><label>Date range (days)</label><input class="pbuilder-input" type="number" min="14" max="180" data-section-setting="dateRangeDays" value="${Number(
          settings.dateRangeDays || 60
        )}" /></div>
        <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="showTimezone" ${
          settings.showTimezone ? "checked" : ""
        } />Show timezone selector</label>
        <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="showNextAvailable" ${
          settings.showNextAvailable ? "checked" : ""
        } />Show next available shortcut</label>
      `);
    }

    if (section.type === "detailsForm") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Title</label><input class="pbuilder-input" type="text" data-section-setting="title" value="${escapeHtml(
          settings.title || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Description</label><textarea class="pbuilder-textarea" data-section-setting="description">${escapeHtml(
          settings.description || ""
        )}</textarea></div>
        <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="phoneEnabled" ${
          settings.phoneEnabled ? "checked" : ""
        } />Enable phone field</label>
        <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="phoneRequired" ${
          settings.phoneRequired ? "checked" : ""
        } />Require phone field</label>
        ${renderCustomQuestionsControl(section)}
      `);
    }

    if (section.type === "confirmation") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Title</label><input class="pbuilder-input" type="text" data-section-setting="title" value="${escapeHtml(
          settings.title || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Subtitle</label><textarea class="pbuilder-textarea" data-section-setting="subtitle">${escapeHtml(
          settings.subtitle || ""
        )}</textarea></div>
        <label class="pbuilder-checkbox"><input type="checkbox" data-section-setting="showAddToCalendar" ${
          settings.showAddToCalendar ? "checked" : ""
        } />Show add-to-calendar actions</label>
      `);
    }

    if (section.type === "policies") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Title</label><input class="pbuilder-input" type="text" data-section-setting="title" value="${escapeHtml(
          settings.title || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Cancellation policy</label><textarea class="pbuilder-textarea" data-section-setting="cancellationPolicy">${escapeHtml(
          settings.cancellationPolicy || ""
        )}</textarea></div>
        <div class="pbuilder-field"><label>Reschedule policy</label><textarea class="pbuilder-textarea" data-section-setting="reschedulePolicy">${escapeHtml(
          settings.reschedulePolicy || ""
        )}</textarea></div>
      `);
    }

    if (section.type === "footer") {
      baseControls.push(`
        <div class="pbuilder-field"><label>Copyright</label><input class="pbuilder-input" type="text" data-section-setting="copyright" value="${escapeHtml(
          settings.copyright || ""
        )}" /></div>
        <div class="pbuilder-field"><label>Secondary text</label><textarea class="pbuilder-textarea" data-section-setting="secondaryText">${escapeHtml(
          settings.secondaryText || ""
        )}</textarea></div>
      `);
    }

    sectionControlsEl.innerHTML = baseControls.join("");
  }

  function renderHistory() {
    if (!historyListEl) return;
    const history = Array.isArray(state.history) ? state.history : [];

    if (!history.length) {
      historyListEl.innerHTML = '<li class="pbuilder-empty">No versions yet.</li>';
      return;
    }

    historyListEl.innerHTML = history
      .map(
        (item) => `
          <li class="pbuilder-history-row">
            <p class="pbuilder-history-title">${escapeHtml(item.sourceStatus || "draft")} #${Number(
              item.versionNumber || 1
            )}</p>
            <p class="pbuilder-history-meta">${escapeHtml(formatDateTime(item.createdAt))}</p>
            <button type="button" class="pbuilder-btn pbuilder-btn-secondary" data-history-id="${escapeHtml(
              item.id
            )}">Restore draft</button>
          </li>
        `
      )
      .join("");
  }

  function renderPreview() {
    if (!previewRootEl || !state.config) return;

    const previewState = buildPreviewState();
    renderer.mount(
      previewRootEl,
      state.config,
      { services: state.services },
      {
        mode: "preview",
        selectedSectionId: state.selectedSectionId,
        state: previewState,
      }
    );
  }

  function renderSidebar() {
    renderThemeControls();
    renderSectionsList();
    renderSectionControls();
    renderHistory();
  }

  function renderPageMeta() {
    if (!state.page) return;
    if (pageMetaEl) {
      pageMetaEl.textContent = `${state.page.title || "Booking page"} - ${state.page.slug || ""}`;
    }
    if (liveLinkEl instanceof HTMLAnchorElement) {
      liveLinkEl.href = `/book/${encodeURIComponent(state.page.slug)}`;
    }
  }

  function renderAll() {
    ensureSelectedSection();
    renderSidebar();
    renderPreview();
    renderPageMeta();
  }

  function updateConfigAndRender() {
    renderAll();
    scheduleAutosave();
  }

  function updatePreviewAndQueueSave() {
    renderPreview();
    scheduleAutosave();
  }

  function scheduleAutosave() {
    if (!state.initialized) return;
    setSaveStatus("saving", "Pending changes...");

    if (state.saveTimer) {
      window.clearTimeout(state.saveTimer);
    }

    state.saveTimer = window.setTimeout(() => {
      saveDraft();
    }, 700);
  }

  async function saveDraft() {
    if (!state.page || !state.config) return;

    if (state.saveInFlight) {
      state.saveQueued = true;
      return;
    }

    state.saveInFlight = true;
    setSaveStatus("saving", "Saving...");

    try {
      const payload = await apiRequest(
        `/api/dashboard/pages/${encodeURIComponent(state.page.id)}/draft`,
        {
          method: "PUT",
          body: JSON.stringify({ config: state.config }),
        }
      );

      state.config = deepClone(payload.draftConfig || state.config);
      state.publishedConfig = deepClone(payload.publishedConfig || state.publishedConfig || {});
      state.history = Array.isArray(payload.history) ? payload.history : state.history;
      state.services = Array.isArray(payload.services) ? payload.services : state.services;
      setSaveStatus("saved", "Saved");
      renderAll();
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

  async function publishConfig() {
    if (!state.page) return;
    publishBtn.disabled = true;
    setSaveStatus("saving", "Publishing...");

    try {
      const payload = await apiRequest(
        `/api/dashboard/pages/${encodeURIComponent(state.page.id)}/publish`,
        { method: "POST" }
      );
      state.config = deepClone(payload.draftConfig || state.config);
      state.publishedConfig = deepClone(payload.publishedConfig || state.publishedConfig || {});
      state.history = Array.isArray(payload.history) ? payload.history : state.history;
      setSaveStatus("saved", "Published");
      renderAll();
    } catch (error) {
      setSaveStatus("error", error.message || "Publish failed");
    } finally {
      publishBtn.disabled = false;
    }
  }

  async function restoreVersion(historyId) {
    if (!state.page || !historyId) return;
    setSaveStatus("saving", "Restoring...");

    try {
      const payload = await apiRequest(
        `/api/dashboard/pages/${encodeURIComponent(state.page.id)}/restore/${encodeURIComponent(historyId)}`,
        { method: "POST" }
      );
      state.config = deepClone(payload.draftConfig || state.config);
      state.publishedConfig = deepClone(payload.publishedConfig || state.publishedConfig || {});
      state.history = Array.isArray(payload.history) ? payload.history : state.history;
      state.services = Array.isArray(payload.services) ? payload.services : state.services;
      setSaveStatus("saved", "Restored to draft");
      renderAll();
    } catch (error) {
      setSaveStatus("error", error.message || "Restore failed");
    }
  }

  function sectionIndexById(sectionId) {
    return sectionList().findIndex((section) => section.id === sectionId);
  }

  function moveSection(fromIndex, toIndex) {
    const sections = sectionList();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= sections.length || toIndex >= sections.length) return;
    if (fromIndex === toIndex) return;

    const [item] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, item);
    updateConfigAndRender();
  }

  function addSection(type) {
    const template = SECTION_TEMPLATES[type];
    if (!template) return;

    if (SECTION_TYPE_META[type] && SECTION_TYPE_META[type].singleton) {
      const exists = sectionList().some((section) => section.type === type);
      if (exists) {
        setSaveStatus("error", `${sectionLabel(type)} already exists`);
        return;
      }
    }

    const next = deepClone(template);
    next.id = createId(type);
    if (next.type === "serviceList" && Array.isArray(state.services)) {
      next.settings.selectedServiceIds = state.services.map((service) => service.id);
    }

    sectionList().push(next);
    state.selectedSectionId = next.id;
    updateConfigAndRender();
  }

  function duplicateSection(sectionId) {
    const sections = sectionList();
    const index = sectionIndexById(sectionId);
    if (index < 0) return;

    const original = sections[index];
    if (!original) return;

    if (SECTION_TYPE_META[original.type] && SECTION_TYPE_META[original.type].singleton) {
      setSaveStatus("error", `${sectionLabel(original.type)} can only be used once`);
      return;
    }

    const clone = deepClone(original);
    clone.id = createId(original.type || "section");
    sections.splice(index + 1, 0, clone);
    state.selectedSectionId = clone.id;
    updateConfigAndRender();
  }

  function deleteSection(sectionId) {
    const sections = sectionList();
    if (sections.length <= 1) {
      setSaveStatus("error", "At least one section is required");
      return;
    }
    const index = sectionIndexById(sectionId);
    if (index < 0) return;

    sections.splice(index, 1);
    ensureSelectedSection();
    updateConfigAndRender();
  }

  function toggleSection(sectionId) {
    const section = sectionList().find((item) => item.id === sectionId);
    if (!section) return;
    section.visible = section.visible === false;
    updateConfigAndRender();
  }

  function updateThemeField(field, value) {
    if (!state.config || !state.config.theme) return;

    if (field === "radius" || field === "spacing") {
      const parsed = Number(value);
      state.config.theme[field] = Number.isFinite(parsed) ? parsed : state.config.theme[field];
    } else {
      state.config.theme[field] = value;
    }

    updatePreviewAndQueueSave();
    if (field === "radius" || field === "spacing") {
      renderThemeControls();
    }
  }

  function updateSectionSetting(section, field, value, isCheckbox, rerenderSidebar) {
    if (!section || !section.settings) return;
    const fullRerender = Boolean(rerenderSidebar);

    if (field === "visible") {
      section.visible = Boolean(value);
      updateConfigAndRender();
      return;
    }

    if (field === "dateRangeDays") {
      const parsed = Number(value);
      section.settings[field] = Number.isFinite(parsed) ? parsed : 60;
      if (fullRerender) updateConfigAndRender();
      else updatePreviewAndQueueSave();
      return;
    }

    section.settings[field] = isCheckbox ? Boolean(value) : value;
    if (fullRerender) updateConfigAndRender();
    else updatePreviewAndQueueSave();
  }

  function updateServiceVisibility(serviceId, checked) {
    const section = getSelectedSection();
    if (!section || section.type !== "serviceList") return;
    if (!Array.isArray(section.settings.selectedServiceIds)) {
      section.settings.selectedServiceIds = [];
    }

    const set = new Set(section.settings.selectedServiceIds);
    if (checked) set.add(serviceId);
    else set.delete(serviceId);

    section.settings.selectedServiceIds = Array.from(set);
    updatePreviewAndQueueSave();
  }

  function setValueByPath(path, value) {
    const parts = String(path || "").split(".").filter(Boolean);
    if (parts.length < 3) return;

    const sectionId = parts[0];
    const section = sectionList().find((item) => item.id === sectionId);
    if (!section || parts[1] !== "settings") return;

    let cursor = section.settings;
    for (let index = 2; index < parts.length - 1; index += 1) {
      const key = parts[index];
      if (!cursor[key] || typeof cursor[key] !== "object") {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }

    cursor[parts[parts.length - 1]] = value;
    scheduleAutosave();
  }

  function updateQuestion(index, field, value, isCheckbox) {
    const section = getSelectedSection();
    if (!section || section.type !== "detailsForm") return;
    if (!Array.isArray(section.settings.customQuestions)) {
      section.settings.customQuestions = [];
    }

    const item = section.settings.customQuestions[index];
    if (!item) return;
    item[field] = isCheckbox ? Boolean(value) : value;
    updatePreviewAndQueueSave();
  }

  function addQuestion() {
    const section = getSelectedSection();
    if (!section || section.type !== "detailsForm") return;
    if (!Array.isArray(section.settings.customQuestions)) {
      section.settings.customQuestions = [];
    }

    section.settings.customQuestions.push({
      id: createId("q"),
      label: `Question ${section.settings.customQuestions.length + 1}`,
      required: false,
      type: "text",
      placeholder: "",
    });

    updateConfigAndRender();
  }

  function removeQuestion(index) {
    const section = getSelectedSection();
    if (!section || section.type !== "detailsForm") return;
    if (!Array.isArray(section.settings.customQuestions)) return;

    section.settings.customQuestions.splice(index, 1);
    updateConfigAndRender();
  }

  function bindSidebarEvents() {
    if (themeControlsEl) {
      themeControlsEl.addEventListener("input", (event) => {
        const el = event.target;
        if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
        const field = String(el.dataset.themeField || "").trim();
        if (!field) return;
        updateThemeField(field, el.value);
      });

      themeControlsEl.addEventListener("change", (event) => {
        const el = event.target;
        if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
        const field = String(el.dataset.themeField || "").trim();
        if (!field) return;
        updateThemeField(field, el.value);
      });
    }

    if (sectionControlsEl) {
      sectionControlsEl.addEventListener("input", (event) => {
        const el = event.target;
        if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
          return;
        }

        const settingField = String(el.dataset.sectionSetting || "").trim();
        if (settingField) {
          const section = getSelectedSection();
          const isCheckbox = el instanceof HTMLInputElement && el.type === "checkbox";
          const value = isCheckbox ? el.checked : el.value;
          const rerenderSidebar = ["visible", "phoneEnabled"].includes(settingField);
          updateSectionSetting(section, settingField, value, isCheckbox, rerenderSidebar);
          return;
        }

        const serviceId = String(el.dataset.serviceToggle || "").trim();
        if (serviceId && el instanceof HTMLInputElement) {
          updateServiceVisibility(serviceId, el.checked);
          return;
        }

        const questionField = String(el.dataset.questionField || "").trim();
        if (questionField) {
          const row = el.closest("[data-question-index]");
          if (!row) return;
          const index = Number(row.getAttribute("data-question-index"));
          if (!Number.isFinite(index)) return;
          const isCheckbox = el instanceof HTMLInputElement && el.type === "checkbox";
          updateQuestion(index, questionField, isCheckbox ? el.checked : el.value, isCheckbox);
        }
      });

      sectionControlsEl.addEventListener("click", (event) => {
        const btn = event.target instanceof Element ? event.target.closest("button") : null;
        if (!btn) return;

        const questionAction = String(btn.dataset.questionAction || "").trim();
        if (!questionAction) return;

        if (questionAction === "add") {
          addQuestion();
          return;
        }

        if (questionAction === "remove") {
          const index = Number(btn.dataset.questionIndex);
          if (!Number.isFinite(index)) return;
          removeQuestion(index);
        }
      });
    }

    if (sectionsListEl) {
      sectionsListEl.addEventListener("click", (event) => {
        const row = event.target instanceof Element ? event.target.closest("[data-section-id]") : null;
        if (!row) return;

        const sectionId = String(row.getAttribute("data-section-id") || "").trim();
        if (!sectionId) return;

        const actionBtn = event.target instanceof Element ? event.target.closest("[data-row-action]") : null;
        if (actionBtn) {
          const action = String(actionBtn.getAttribute("data-row-action") || "").trim();
          if (action === "toggle") toggleSection(sectionId);
          if (action === "duplicate") duplicateSection(sectionId);
          if (action === "delete") deleteSection(sectionId);
          return;
        }

        setSelectedSection(sectionId);
      });

      sectionsListEl.addEventListener("dragstart", (event) => {
        const row = event.target instanceof Element ? event.target.closest("[data-section-id]") : null;
        if (!row) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(row.getAttribute("data-section-id") || ""));
      });

      sectionsListEl.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });

      sectionsListEl.addEventListener("drop", (event) => {
        event.preventDefault();
        const fromId = String(event.dataTransfer.getData("text/plain") || "").trim();
        const target = event.target instanceof Element ? event.target.closest("[data-section-id]") : null;
        const toId = target ? String(target.getAttribute("data-section-id") || "").trim() : "";
        if (!fromId || !toId || fromId === toId) return;

        const fromIndex = sectionIndexById(fromId);
        const toIndex = sectionIndexById(toId);
        if (fromIndex < 0 || toIndex < 0) return;
        moveSection(fromIndex, toIndex);
      });
    }

    if (historyListEl) {
      historyListEl.addEventListener("click", (event) => {
        const button = event.target instanceof Element ? event.target.closest("[data-history-id]") : null;
        if (!button) return;
        const historyId = String(button.getAttribute("data-history-id") || "").trim();
        if (!historyId) return;
        restoreVersion(historyId);
      });
    }

    if (addSectionBtn) {
      addSectionBtn.addEventListener("click", () => {
        if (!(addTypeEl instanceof HTMLSelectElement)) return;
        addSection(String(addTypeEl.value || "").trim());
      });
    }

    if (publishBtn) {
      publishBtn.addEventListener("click", () => {
        if (state.saveTimer) {
          window.clearTimeout(state.saveTimer);
          state.saveTimer = null;
        }
        if (state.saveInFlight) {
          state.saveQueued = true;
        }
        publishConfig();
      });
    }
  }

  function bindPreviewEvents() {
    if (!previewRootEl) return;

    previewRootEl.addEventListener("click", (event) => {
      const section = event.target instanceof Element ? event.target.closest("[data-section-id]") : null;
      if (!section) return;

      event.preventDefault();
      const sectionId = String(section.getAttribute("data-section-id") || "").trim();
      if (!sectionId) return;
      if (state.selectedSectionId !== sectionId) {
        state.selectedSectionId = sectionId;
        renderSidebar();
        renderPreview();
      }
    });

    previewRootEl.addEventListener("input", (event) => {
      const editable = event.target;
      if (!(editable instanceof HTMLElement)) return;
      if (!editable.classList.contains("pb-editable")) return;
      const path = String(editable.dataset.editPath || "").trim();
      if (!path) return;
      setValueByPath(path, editable.textContent || "");
      setSaveStatus("saving", "Pending changes...");
    });

    previewRootEl.addEventListener("blur", (event) => {
      const editable = event.target;
      if (!(editable instanceof HTMLElement)) return;
      if (!editable.classList.contains("pb-editable")) return;
      const path = String(editable.dataset.editPath || "").trim();
      if (!path) return;
      setValueByPath(path, editable.textContent || "");
      renderSidebar();
      renderPreview();
    }, true);
  }

  function bindDeviceToggle() {
    const toggle = document.querySelector(".pbuilder-device-toggle");
    if (!toggle || !(previewFrameEl instanceof HTMLElement)) return;

    toggle.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-device]") : null;
      if (!button) return;

      const device = String(button.dataset.device || "").trim();
      if (!device || device === state.device) return;

      state.device = device;
      toggle.querySelectorAll("button[data-device]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });

      previewFrameEl.classList.remove("is-desktop", "is-tablet", "is-mobile");
      previewFrameEl.classList.add(`is-${device}`);
    });
  }

  function initializeSectionTypeSelect() {
    if (!(addTypeEl instanceof HTMLSelectElement)) return;
    addTypeEl.innerHTML = SECTION_ORDER
      .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(sectionLabel(type))}</option>`)
      .join("");
  }

  async function loadPage() {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const routeId = pathParts.length >= 3 ? String(pathParts[2] || "").trim() : "";

    let pageId = routeId;
    if (!pageId || pageId === "page-builder") {
      const listPayload = await apiRequest("/api/dashboard/pages");
      const pages = Array.isArray(listPayload.pages) ? listPayload.pages : [];
      if (!pages.length) throw new Error("No booking pages found for this account.");
      pageId = pages[0].id;
      window.history.replaceState({}, "", `/dashboard/page-builder/${encodeURIComponent(pageId)}`);
    }

    const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(pageId)}/draft`);

    state.page = payload.page || null;
    state.services = Array.isArray(payload.services) ? payload.services : [];
    state.config = deepClone(payload.draftConfig || { theme: {}, sections: [] });
    state.publishedConfig = deepClone(payload.publishedConfig || { theme: {}, sections: [] });
    state.history = Array.isArray(payload.history) ? payload.history : [];

    ensureSelectedSection();
    state.initialized = true;

    setSaveStatus("saved", "Saved");
    renderAll();
  }

  function boot() {
    initializeSectionTypeSelect();
    bindSidebarEvents();
    bindPreviewEvents();
    bindDeviceToggle();

    loadPage().catch((error) => {
      setSaveStatus("error", error.message || "Failed to load page builder");
      if (pageMetaEl) {
        pageMetaEl.textContent = error.message || "Failed to load page builder";
      }
    });
  }

  boot();
})();
