(function landingPageEditorController() {
  const renderer = window.LandingPageRenderer;
  if (!renderer) return;

  const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  const ALLOWED_UPLOAD_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);

  const els = {
    shell: document.querySelector(".lpe-shell"),
    pageTitle: document.getElementById("lpe-page-title"),
    pageMeta: document.getElementById("lpe-page-meta"),
    saveStatus: document.getElementById("lpe-save-status"),
    topSaveState: document.getElementById("lpe-top-save-state"),
    focusBtn: document.getElementById("lpe-focus-btn"),
    previewBtn: document.getElementById("lpe-preview-btn"),
    copyLinkBtn: document.getElementById("lpe-copy-link-btn"),
    publishBtn: document.getElementById("lpe-publish-btn"),
    saveTopBtn: document.getElementById("lpe-save-top-btn"),
    saveBtn: document.getElementById("lpe-save-btn"),
    layout: document.getElementById("lpe-layout"),
    utilityRail: document.getElementById("lpe-utility-rail"),
    railToggle: document.getElementById("lpe-rail-toggle"),
    leftPanel: document.getElementById("lpe-left-panel"),
    rightPanel: document.getElementById("lpe-right-panel"),
    leftCollapseBtn: document.getElementById("lpe-left-collapse"),
    rightCollapseBtn: document.getElementById("lpe-right-collapse"),
    settingsDoneBtn: document.getElementById("lpe-settings-done-btn"),
    leftResizer: document.getElementById("lpe-resizer-left"),
    rightResizer: document.getElementById("lpe-resizer-right"),
    sectionsFilter: document.getElementById("lpe-sections-filter"),
    sectionsList: document.getElementById("lpe-sections-list"),
    previewFrame: document.getElementById("lpe-preview-frame"),
    previewRoot: document.getElementById("lpe-preview-root"),
    presetThemes: document.getElementById("lpe-preset-themes"),
    themeControls: document.getElementById("lpe-theme-controls"),
    sectionControls: document.getElementById("lpe-section-controls"),
    historyList: document.getElementById("lpe-history-list"),
    rightTabButtons: Array.from(document.querySelectorAll("[data-right-tab-btn]")),
    rightTabPanels: Array.from(document.querySelectorAll("[data-right-tab-panel]")),
    googleSnippet: document.getElementById("lpe-google-snippet"),
    ogPreview: document.getElementById("lpe-og-preview"),
    twitterPreview: document.getElementById("lpe-twitter-preview"),
    addSectionBtn: document.getElementById("lpe-add-section-btn"),
    addDialog: document.getElementById("lpe-add-dialog"),
    dialogCancel: document.getElementById("lpe-dialog-cancel"),
    dialogSelect: document.getElementById("lpe-dialog-select"),
    libraryGrid: document.getElementById("lpe-library-grid"),
  };

  const SECTION_DEFAULTS = Object.freeze({
    marquee: {
      items: ["FREE SHIPPING ON ORDERS OVER $100", "BOOK NOW, PAY LATER", "PREMIUM HUMAN HAIR"],
      speed: 28,
      uppercase: true,
    },
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
    imageBanner: {
      pretitle: "Luxury Collection",
      title: "Raw hair that feels naturally yours",
      subtitle: "Crafted for premium installs, everyday confidence, and long-term wear.",
      backgroundImageUrl: "",
      mobileImageUrl: "",
      align: "left",
      buttonLabel: "Shop Collection",
      buttonHref: "#services",
      overlayOpacity: 22,
      height: "lg",
    },
    slideShow: {
      title: "Featured looks",
      subtitle: "Swipe through this season's signature installs.",
      autoplay: true,
      intervalSeconds: 6,
      slides: [
        {
          imageUrl: "",
          title: "Natural Hair Install",
          subtitle: "Breathable lace with realistic finish.",
          buttonLabel: "Book now",
          buttonHref: "#services",
        },
      ],
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
    spotlightGrid: {
      title: "Shop by style",
      subtitle: "Browse our best-selling looks and signature textures.",
      columnsDesktop: 3,
      cards: [
        {
          title: "Glueless units",
          description: "Install-ready wigs for everyday wear.",
          imageUrl: "",
          buttonLabel: "Explore",
          buttonHref: "#services",
        },
        {
          title: "Lace front wigs",
          description: "Natural hairline with premium volume.",
          imageUrl: "",
          buttonLabel: "Explore",
          buttonHref: "#services",
        },
      ],
    },
    productGrid: {
      title: "Featured services",
      subtitle: "Most booked appointments from your catalog.",
      columnsDesktop: 4,
      limit: 8,
      showDescription: true,
      showDuration: true,
      showPrice: true,
      buttonLabel: "Book",
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
    customerReviewBlock: {
      title: "What our clients say",
      subtitle: "Trusted by customers across the world.",
      columnsDesktop: 3,
      showStars: true,
    },
    instagramGrid: {
      title: "@hairluxury",
      subtitle: "Follow us for installs, transformations, and care tips.",
      handle: "@hairluxury",
      columnsDesktop: 5,
      images: [
        { url: "", link: "" },
        { url: "", link: "" },
        { url: "", link: "" },
        { url: "", link: "" },
        { url: "", link: "" },
      ],
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
    newsletterSignup: {
      title: "Newsletter sign up",
      subtitle: "Get new arrivals, wig care tips, and exclusive offers first.",
      placeholder: "Enter your email",
      buttonLabel: "Submit",
      note: "By subscribing, you agree to receive marketing emails.",
      backgroundImageUrl: "",
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
    presets: [],
    selectedSectionId: "",
    openRowMenuSectionId: "",
    selectedLibraryType: "",
    sectionsFilterText: "",
    rightTab: "element",
    device: "desktop",
    railExpanded: false,
    focusMode: false,
    focusMemory: null,
    leftPanelCollapsed: false,
    rightPanelCollapsed: true,
    leftPanelWidth: 280,
    rightPanelWidth: 360,
    isDirty: false,
    saveStatusType: "saved",
    saveTimer: null,
    saveInFlight: false,
    saveQueued: false,
    previewRenderFrame: 0,
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

  function safeText(value, fallback, max) {
    if (value === undefined || value === null) return fallback || "";
    const text = String(value).trim();
    if (!text) return "";
    if (!max) return text;
    return text.slice(0, max);
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

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(String(reader.result || ""));
      };
      reader.onerror = () => {
        reject(new Error("Could not read selected image."));
      };
      reader.readAsDataURL(file);
    });
  }

  function getUploadInputByPath(path) {
    if (!path) return null;
    const candidates = Array.from(document.querySelectorAll("input[type='file'][data-upload-input='true']"));
    return candidates.find((input) => input.getAttribute("data-path") === path) || null;
  }

  async function handleImageUpload(path, inputEl) {
    const file = inputEl?.files && inputEl.files[0] ? inputEl.files[0] : null;
    if (!file || !path) return;

    if (!ALLOWED_UPLOAD_TYPES.has(String(file.type || "").toLowerCase())) {
      setSaveStatus("error", "Use PNG, JPG, WEBP, or GIF.");
      inputEl.value = "";
      return;
    }
    if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
      setSaveStatus("error", "Image too large. Max 5MB.");
      inputEl.value = "";
      return;
    }

    setSaveStatus("saving", "Uploading image...");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const payload = await apiRequest("/api/uploads/images", {
        method: "POST",
        body: JSON.stringify({
          dataUrl,
          fileName: file.name || "upload-image",
        }),
      });
      const uploadedUrl = safeText(payload.url, "");
      if (!uploadedUrl) throw new Error("Image upload failed.");

      setPathValue(path, uploadedUrl, "string");
      renderAll();
      queueAutosave();
      setSaveStatus("saved", "Image uploaded");
    } catch (error) {
      setSaveStatus("error", error.message || "Image upload failed");
    } finally {
      inputEl.value = "";
    }
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

  function updateSaveActions() {
    const shouldDisableSave = !state.isDirty || state.saveInFlight;
    if (els.saveTopBtn) {
      els.saveTopBtn.disabled = shouldDisableSave;
      els.saveTopBtn.setAttribute("aria-disabled", shouldDisableSave ? "true" : "false");
    }
    if (els.saveBtn) {
      els.saveBtn.disabled = shouldDisableSave;
      els.saveBtn.setAttribute("aria-disabled", shouldDisableSave ? "true" : "false");
    }
  }

  function setDirty(value) {
    state.isDirty = Boolean(value);
    updateSaveActions();
  }

  function applySaveStatus(node, type, text) {
    if (!node) return;
    node.classList.remove("is-saving", "is-error", "is-dirty", "is-saved");
    node.classList.add(
      type === "error" ? "is-error" : type === "saving" ? "is-saving" : type === "dirty" ? "is-dirty" : "is-saved"
    );
    node.textContent = text;
  }

  function setSaveStatus(type, customText) {
    state.saveStatusType = type;
    let text = customText || "Saved";
    if (!customText) {
      if (type === "saving") text = "Saving...";
      if (type === "error") text = "Save failed";
      if (type === "dirty") text = "Unsaved changes";
      if (type === "saved") text = "Saved";
    }
    applySaveStatus(els.saveStatus, type, text);
    applySaveStatus(els.topSaveState, type, text);
    updateSaveActions();
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
    state.presets = Array.isArray(payload.presets) ? payload.presets : state.presets;
    ensureSelection();
  }

  function defaultPresetThemes() {
    return [
      {
        id: "hairluxury",
        name: "Hairluxury Signature",
        description: "Shopify-inspired luxury storefront styling.",
        theme: {
          primary: "#7f5933",
          secondary: "#e5cc83",
          background: "#f7f3ee",
          surface: "#ffffff",
          text: "#1f1a16",
          muted: "#67594d",
          border: "#d8cbbb",
          font: "DM Sans",
          radius: 10,
          sectionPadding: 48,
          buttonStyle: "solid",
          shadowStyle: "minimal",
          animationsEnabled: true,
          animationStyle: "subtle",
        },
      },
      {
        id: "luxe",
        name: "Luxe Glow",
        description: "Elegant gradients with premium spacing.",
        theme: {
          primary: "#7c3aed",
          secondary: "#d946ef",
          background: "#f6f5fb",
          surface: "#ffffff",
          text: "#171a2b",
          muted: "#5f6377",
          border: "#e4ddf8",
          font: "DM Sans",
          radius: 14,
          sectionPadding: 52,
          buttonStyle: "gradient",
          shadowStyle: "soft",
          animationsEnabled: true,
          animationStyle: "subtle",
        },
      },
      {
        id: "minimal",
        name: "Minimal Studio",
        description: "Clean style with subtle blue accents.",
        theme: {
          primary: "#1a73e8",
          secondary: "#0f766e",
          background: "#f4f7fb",
          surface: "#ffffff",
          text: "#111827",
          muted: "#5b6475",
          border: "#d8e1ef",
          font: "Inter",
          radius: 12,
          sectionPadding: 48,
          buttonStyle: "solid",
          shadowStyle: "minimal",
          animationsEnabled: true,
          animationStyle: "subtle",
        },
      },
      {
        id: "vivid",
        name: "Vivid Editorial",
        description: "Bold contrast and energetic highlights.",
        theme: {
          primary: "#ef4444",
          secondary: "#f59e0b",
          background: "#f8fafc",
          surface: "#ffffff",
          text: "#0f172a",
          muted: "#55607a",
          border: "#d7dfed",
          font: "Sora",
          radius: 16,
          sectionPadding: 56,
          buttonStyle: "outline",
          shadowStyle: "medium",
          animationsEnabled: true,
          animationStyle: "medium",
        },
      },
    ];
  }

  function presetListWithTheme() {
    const incoming = Array.isArray(state.presets) ? state.presets : [];
    const withTheme = incoming.filter((item) => item && item.theme);
    if (withTheme.length) return withTheme;
    return defaultPresetThemes();
  }

  function templateDefinitions() {
    return [
      {
        id: "hair-salon-complete",
        name: "Hair Salon Complete",
        description: "Full salon funnel with all major sections, ideal for premium services.",
        presetId: "hairluxury",
        sections: [
          { type: "marquee", settings: { items: ["PREMIUM HAIR SERVICES", "BOOK INSTANTLY ONLINE", "NEW CLIENT OFFERS LIVE"], speed: 24 } },
          { type: "header", settings: { brandName: "{{businessName}}", showSearch: true, searchPlaceholder: "Search services..." } },
          { type: "imageBanner", settings: { pretitle: "Luxury Hair Experience", title: "{{businessName}} Beauty Studio", subtitle: "Install, color, and treatment services with expert stylists.", buttonLabel: "Book now", buttonHref: "#services" } },
          { type: "servicesMenu", settings: { title: "Service Menu", subtitle: "Choose your treatment and reserve your best slot.", showSearch: true, showPhotos: true, showDuration: true, showPrice: true, columnsDesktop: 2 } },
          { type: "spotlightGrid" },
          { type: "productGrid" },
          { type: "stylists" },
          { type: "reviewsMarquee", settings: { title: "Trusted by clients", style: "cards", speed: 32, showStars: true } },
          { type: "customerReviewBlock" },
          { type: "instagramGrid" },
          { type: "contactMap" },
          { type: "faq" },
          { type: "newsletterSignup" },
          { type: "footer", settings: { copyright: "© {{businessName}}" } },
        ],
      },
      {
        id: "booking-focused",
        name: "Booking Focused",
        description: "Clean conversion-first template for quick scheduling and service checkout.",
        presetId: "minimal",
        sections: [
          { type: "header", settings: { brandName: "{{businessName}}", showSearch: false } },
          { type: "hero", settings: { badge: "Fast Booking", title: "Book your next appointment in minutes", subtitle: "Pick service, choose slot, and confirm instantly." } },
          { type: "servicesMenu", settings: { viewMode: "tabs", showSearch: true, showPhotos: true, columnsDesktop: 2 } },
          { type: "reviewsMarquee", settings: { style: "cards", speed: 36 } },
          { type: "contactMap" },
          { type: "footer", settings: { copyright: "© {{businessName}}" } },
        ],
      },
      {
        id: "editorial-brand",
        name: "Editorial Brand",
        description: "Visual-first storytelling layout with gallery and social proof.",
        presetId: "vivid",
        sections: [
          { type: "marquee", settings: { items: ["EDITORIAL LOOKS", "RUNWAY READY", "CUSTOM COLOR & INSTALL"], speed: 30, uppercase: false } },
          { type: "header", settings: { brandName: "{{businessName}}" } },
          { type: "slideShow" },
          { type: "text", settings: { title: "Our style philosophy", body: "We design looks that fit your face, lifestyle, and long-term hair goals." } },
          { type: "imageShowcase" },
          { type: "servicesMenu", settings: { viewMode: "stacked", showSearch: false, columnsDesktop: 2 } },
          { type: "customerReviewBlock" },
          { type: "newsletterSignup" },
          { type: "footer", settings: { copyright: "© {{businessName}}" } },
        ],
      },
    ];
  }

  function presetById(presetId) {
    return presetListWithTheme().find((item) => String(item.id) === String(presetId));
  }

  function prebuiltTemplates() {
    return templateDefinitions().map((template) => {
      const preset = presetById(template.presetId);
      return {
        ...template,
        theme: deepClone((preset && preset.theme) || {}),
      };
    });
  }

  function withTemplateVariables(value, businessName) {
    if (typeof value === "string") {
      return value.replaceAll("{{businessName}}", businessName);
    }
    if (Array.isArray(value)) {
      return value.map((item) => withTemplateVariables(item, businessName));
    }
    if (value && typeof value === "object") {
      const next = {};
      Object.keys(value).forEach((key) => {
        next[key] = withTemplateVariables(value[key], businessName);
      });
      return next;
    }
    return value;
  }

  function buildTemplateSection(spec, businessName) {
    const definition = spec && typeof spec === "object" ? spec : { type: String(spec || "") };
    const type = String(definition.type || "");
    if (!type || !SECTION_DEFAULTS[type]) return null;
    const section = createSection(type);
    const overrideSettings = withTemplateVariables(deepClone(definition.settings || {}), businessName);
    section.settings = {
      ...section.settings,
      ...overrideSettings,
    };
    if (type === "header" && !safeText(section.settings.brandName, "")) {
      section.settings.brandName = businessName;
    }
    if (type === "footer" && !safeText(section.settings.copyright, "")) {
      section.settings.copyright = `© ${businessName}`;
    }
    return section;
  }

  function templateTypeSignature(template) {
    const sections = Array.isArray(template.sections) ? template.sections : [];
    return sections
      .map((item) => (item && typeof item === "object" ? String(item.type || "") : String(item || "")))
      .filter(Boolean);
  }

  function isTemplateActive(template) {
    const currentTypes = sectionList().map((item) => String(item.type || ""));
    const templateTypes = templateTypeSignature(template);
    if (currentTypes.length !== templateTypes.length) return false;
    return templateTypes.every((type, index) => type === currentTypes[index]);
  }

  function applyPrebuiltTemplateById(templateId) {
    const template = prebuiltTemplates().find((item) => String(item.id) === String(templateId));
    if (!template || !state.draftConfig) return;

    const businessName = safeText(state.page?.businessName || state.page?.title, "Your Studio");
    const sections = (Array.isArray(template.sections) ? template.sections : [])
      .map((spec) => buildTemplateSection(spec, businessName))
      .filter(Boolean);
    if (!sections.length) return;

    state.draftConfig = {
      ...(state.draftConfig || {}),
      theme: {
        ...(state.draftConfig.theme || {}),
        ...(template.theme || {}),
      },
      sections,
    };
    state.selectedSectionId = sections[0] ? sections[0].id : "";
    renderAll();
    queueAutosave();
    setSaveStatus("saving", `Applying ${template.name}...`);
  }

  function renderPresetThemes() {
    if (!els.presetThemes) return;
    const templates = prebuiltTemplates();
    if (!templates.length) {
      els.presetThemes.innerHTML = '<p class="lp-empty">No prebuilt themes available.</p>';
      return;
    }

    els.presetThemes.innerHTML = templates
      .map((template) => {
        const active = isTemplateActive(template);
        const theme = template.theme || {};
        const swatches = [
          theme.primary || "#1a73e8",
          theme.secondary || "#0f766e",
          theme.background || "#f4f7fb",
          theme.text || "#111827",
        ];
        const sectionCount = templateTypeSignature(template).length;
        return `
          <article class="lpe-preset-card ${active ? "is-active" : ""}">
            <div class="lpe-preset-card-head">
              <div>
                <h3>${escapeHtml(template.name)}</h3>
                <p>${escapeHtml(template.description)}</p>
              </div>
              <span class="lpe-preset-badge">${active ? "Active" : "Full design"}</span>
            </div>
            <p class="lpe-preset-meta">${escapeHtml(String(sectionCount))} sections included</p>
            <div class="lpe-preset-swatches" aria-hidden="true">
              ${swatches.map((color) => `<span style="background:${escapeHtml(String(color))};"></span>`).join("")}
            </div>
            <button type="button" class="lpe-btn lpe-btn-secondary" data-action="apply-prebuilt-template" data-template-id="${escapeHtml(
              template.id
            )}">${active ? "Applied" : "Apply full design"}</button>
          </article>
        `;
      })
      .join("");
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
    setDirty(true);
    setSaveStatus("dirty", "Unsaved changes");
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      saveDraft();
    }, 700);
  }

  async function saveDraft(forceNow) {
    if (state.saveInFlight && !forceNow) {
      state.saveQueued = true;
      return false;
    }
    if (!state.pageId || !state.draftConfig) return false;

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
      setDirty(false);
      setSaveStatus("saved", "Saved");
      renderStaticSections();
      renderPreview();
      return true;
    } catch (error) {
      setDirty(true);
      setSaveStatus("error", error.message || "Save failed");
      return false;
    } finally {
      state.saveInFlight = false;
      if (state.saveQueued) {
        state.saveQueued = false;
        saveDraft();
      }
      updateSaveActions();
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

  function sectionIcon(name) {
    const icons = {
      grip:
        '<svg class="lpe-icon-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3h0M11 3h0M5 8h0M11 8h0M5 13h0M11 13h0"/></svg>',
      eye:
        '<svg class="lpe-icon-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8s2.4-4.5 7-4.5S15 8 15 8s-2.4 4.5-7 4.5S1 8 1 8z"/><circle cx="8" cy="8" r="2.3"/></svg>',
      eyeOff:
        '<svg class="lpe-icon-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8s2.4-4.5 7-4.5 7 4.5 7 4.5-2.4 4.5-7 4.5S1 8 1 8z"/><path d="M2 2l12 12"/></svg>',
      copy:
        '<svg class="lpe-icon-svg" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="3" width="8" height="10" rx="1.5"/><path d="M3 11H2.5A1.5 1.5 0 0 1 1 9.5v-7A1.5 1.5 0 0 1 2.5 1H8"/></svg>',
      x:
        '<svg class="lpe-icon-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>',
      menu:
        '<svg class="lpe-icon-svg" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/></svg>',
    };
    return icons[name] || "";
  }

  function captureSectionRowPositions() {
    const positions = new Map();
    if (!els.sectionsList) return positions;
    els.sectionsList.querySelectorAll(".lpe-section-row[data-section-id]").forEach((row) => {
      const sectionId = row.getAttribute("data-section-id");
      if (!sectionId) return;
      positions.set(sectionId, row.getBoundingClientRect().top);
    });
    return positions;
  }

  function animateSectionRowPositions(previousPositions) {
    if (!els.sectionsList || !previousPositions || !previousPositions.size) return;
    const rows = Array.from(els.sectionsList.querySelectorAll(".lpe-section-row[data-section-id]"));
    rows.forEach((row) => {
      const sectionId = row.getAttribute("data-section-id");
      if (!sectionId || !previousPositions.has(sectionId)) return;
      const oldTop = previousPositions.get(sectionId);
      const newTop = row.getBoundingClientRect().top;
      const delta = oldTop - newTop;
      if (!Number.isFinite(delta) || Math.abs(delta) < 1) return;
      row.style.transition = "none";
      row.style.transform = `translateY(${delta}px)`;
      row.getBoundingClientRect();
      row.style.transition = "";
      row.style.transform = "";
    });
  }

  function renderSectionsList() {
    if (!els.sectionsList) return;
    const previousPositions = captureSectionRowPositions();
    const sections = sectionList();
    const query = safeText(state.sectionsFilterText, "").toLowerCase();
    const labelByType = new Map(
      (Array.isArray(state.sectionLibrary) ? state.sectionLibrary : []).map((item) => [
        String(item.type || ""),
        String(item.label || item.type || ""),
      ])
    );
    const headerTypes = new Set(["marquee", "header"]);
    let hasHeaderGroup = false;
    let hasTemplateGroup = false;
    const rows = [];

    sections.forEach((section, index) => {
      const customSectionLabel = safeText(section.customLabel, "");
      const sectionTitle = customSectionLabel || labelByType.get(String(section.type)) || section.type;
      const matches =
        !query ||
        sectionTitle.toLowerCase().includes(query) ||
        String(section.type || "")
          .toLowerCase()
          .includes(query);
      if (!matches) return;

      const inHeaderGroup = headerTypes.has(String(section.type || ""));
      if (inHeaderGroup && !hasHeaderGroup) {
        hasHeaderGroup = true;
        rows.push('<li class="lpe-section-group">Header Group</li>');
      }
      if (!inHeaderGroup && !hasTemplateGroup) {
        hasTemplateGroup = true;
        rows.push('<li class="lpe-section-group">Template</li>');
      }

      rows.push(`
          <li class="lpe-section-row ${section.id === state.selectedSectionId ? "is-active" : ""} ${
            section.enabled === false ? "is-hidden" : ""
          }" draggable="true" data-index="${index}" data-section-id="${escapeHtml(section.id)}">
            <div class="lpe-section-main">
              <span class="lpe-section-grip" aria-hidden="true">${sectionIcon("grip")}</span>
              <button type="button" class="lpe-section-name" data-action="select-section" data-section-id="${escapeHtml(
                section.id
              )}">${escapeHtml(sectionTitle)}</button>
            </div>
            <div class="lpe-section-actions">
              <button type="button" class="lpe-icon-btn ${
                section.enabled === false ? "is-visibility-off" : "is-visibility-on"
              }" data-action="toggle-section" data-section-id="${escapeHtml(section.id)}" aria-label="${
                section.enabled === false ? "Show section" : "Hide section"
              }">${section.enabled === false ? sectionIcon("eyeOff") : sectionIcon("eye")}</button>
              <button
                type="button"
                class="lpe-icon-btn"
                data-action="duplicate-section"
                data-section-id="${escapeHtml(section.id)}"
                aria-label="Duplicate section"
              >${sectionIcon("copy")}</button>
              <button
                type="button"
                class="lpe-icon-btn"
                data-action="toggle-row-menu"
                data-section-id="${escapeHtml(section.id)}"
                aria-label="Open section actions"
              >${sectionIcon("menu")}</button>
              <div class="lpe-context-menu ${state.openRowMenuSectionId === section.id ? "is-open" : ""}" data-row-menu="${escapeHtml(
                section.id
              )}">
                <button type="button" data-action="rename-section" data-section-id="${escapeHtml(section.id)}">Rename</button>
                <button type="button" data-action="duplicate-section" data-section-id="${escapeHtml(section.id)}">Duplicate</button>
                <button type="button" data-action="delete-section" data-section-id="${escapeHtml(section.id)}">Delete</button>
              </div>
            </div>
          </li>
        `);
    });

    if (!rows.length) {
      els.sectionsList.innerHTML = '<li class="lpe-empty-list">No sections match your search.</li>';
      return;
    }

    els.sectionsList.innerHTML = rows.join("");
    animateSectionRowPositions(previousPositions);
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
    const seo = theme.seo && typeof theme.seo === "object" ? theme.seo : {};
    const metaTitle = safeText(seo.metaTitle, state.page?.title || "", 180);
    const metaDescription = safeText(
      seo.metaDescription,
      "Describe your services to attract the right customers.",
      300
    );
    const ogTitle = safeText(seo.ogTitle, metaTitle, 180);
    const ogDescription = safeText(seo.ogDescription, metaDescription, 300);
    const ogImageUrl = safeText(seo.ogImageUrl, "", 2400);
    const twitterTitle = safeText(seo.twitterTitle, ogTitle, 180);
    const twitterDescription = safeText(seo.twitterDescription, ogDescription, 300);
    const twitterImageUrl = safeText(seo.twitterImageUrl, ogImageUrl, 2400);
    const twitterCard = safeText(seo.twitterCard, "summary_large_image", 40);
    const metaTitleCount = String(metaTitle.length);
    const metaDescriptionCount = String(metaDescription.length);

    els.themeControls.innerHTML = `
      <details class="lpe-control-group" open>
        <summary>Brand & Identity</summary>
        <div class="lpe-control-group-body">
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
        </div>
      </details>

      <details class="lpe-control-group" open>
        <summary>Layout & Motion</summary>
        <div class="lpe-control-group-body">
          <div class="lpe-row-grid">
            <label class="lpe-field">
              <span>Radius (${Number(theme.radius || 14)})</span>
              <input type="range" min="0" max="28" value="${Number(
                theme.radius || 14
              )}" data-bind-path="theme.radius" data-bind-type="number" />
            </label>
            <label class="lpe-field">
              <span>Section Padding (${Number(theme.sectionPadding || 52)})</span>
              <input type="range" min="20" max="120" value="${Number(
                theme.sectionPadding || 52
              )}" data-bind-path="theme.sectionPadding" data-bind-type="number" />
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
        </div>
      </details>

      <details class="lpe-control-group" open>
        <summary>SEO & Social</summary>
        <div class="lpe-control-group-body">
          <label class="lpe-field">
            <span class="lpe-field-inline">
              <span>Meta title</span>
              <span class="lpe-counter ${metaTitle.length > 60 ? "is-over" : ""}" data-seo-counter="metaTitle">${escapeHtml(
                metaTitleCount
              )}/60</span>
            </span>
            <input type="text" data-bind-path="theme.seo.metaTitle" value="${escapeHtml(metaTitle)}" maxlength="120" />
          </label>
          <label class="lpe-field">
            <span class="lpe-field-inline">
              <span>Meta description</span>
              <span class="lpe-counter ${metaDescription.length > 160 ? "is-over" : ""}" data-seo-counter="metaDescription">${escapeHtml(
                metaDescriptionCount
              )}/160</span>
            </span>
            <textarea data-bind-path="theme.seo.metaDescription" maxlength="300">${escapeHtml(metaDescription)}</textarea>
          </label>
          ${baseTextField("OG title", "theme.seo.ogTitle", ogTitle, 180)}
          ${baseTextareaField("OG description", "theme.seo.ogDescription", ogDescription, 300)}
          ${baseTextField("OG image URL", "theme.seo.ogImageUrl", ogImageUrl, 2400)}
          <label class="lpe-field">
            <span>Twitter card</span>
            <select data-bind-path="theme.seo.twitterCard">
              <option value="summary" ${twitterCard === "summary" ? "selected" : ""}>summary</option>
              <option value="summary_large_image" ${
                twitterCard === "summary_large_image" ? "selected" : ""
              }>summary_large_image</option>
            </select>
          </label>
          ${baseTextField("Twitter title", "theme.seo.twitterTitle", twitterTitle, 180)}
          ${baseTextareaField("Twitter description", "theme.seo.twitterDescription", twitterDescription, 300)}
          ${baseTextField("Twitter image URL", "theme.seo.twitterImageUrl", twitterImageUrl, 2400)}
        </div>
      </details>
    `;
    enhanceImageUploadControls(els.themeControls);
    refreshSeoPreviews();
  }

  function readControlValue(path, fallback = "") {
    if (!els.themeControls) return fallback;
    const escapedPath =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(path)
        : String(path).replace(/"/g, '\\"');
    const control = els.themeControls.querySelector(`[data-bind-path="${escapedPath}"]`);
    if (!(control instanceof HTMLElement)) return fallback;
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      return control.checked;
    }
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement
    ) {
      return control.value;
    }
    return fallback;
  }

  function refreshSeoPreviews() {
    const slug = safeText(String(readControlValue("page.slug", state.page?.slug || "")), state.page?.slug || "", 120);
    const previewUrl = `${window.location.origin}/${slug}`;
    const metaTitle = safeText(
      String(readControlValue("theme.seo.metaTitle", state.page?.title || "")),
      state.page?.title || "",
      180
    );
    const metaDescription = safeText(
      String(
        readControlValue(
          "theme.seo.metaDescription",
          "Describe your services to attract the right customers."
        )
      ),
      "Describe your services to attract the right customers.",
      300
    );
    const ogTitle = safeText(String(readControlValue("theme.seo.ogTitle", metaTitle)), metaTitle, 180);
    const ogDescription = safeText(String(readControlValue("theme.seo.ogDescription", metaDescription)), metaDescription, 300);
    const ogImageUrl = safeText(String(readControlValue("theme.seo.ogImageUrl", "")), "", 2400);
    const twitterTitle = safeText(String(readControlValue("theme.seo.twitterTitle", ogTitle)), ogTitle, 180);
    const twitterDescription = safeText(
      String(readControlValue("theme.seo.twitterDescription", ogDescription)),
      ogDescription,
      300
    );
    const twitterImageUrl = safeText(String(readControlValue("theme.seo.twitterImageUrl", ogImageUrl)), ogImageUrl, 2400);
    const twitterCard = safeText(
      String(readControlValue("theme.seo.twitterCard", "summary_large_image")),
      "summary_large_image",
      40
    );

    const metaTitleCounter = els.themeControls
      ? els.themeControls.querySelector('[data-seo-counter="metaTitle"]')
      : null;
    const metaDescriptionCounter = els.themeControls
      ? els.themeControls.querySelector('[data-seo-counter="metaDescription"]')
      : null;

    if (metaTitleCounter) {
      metaTitleCounter.textContent = `${metaTitle.length}/60`;
      metaTitleCounter.classList.toggle("is-over", metaTitle.length > 60);
    }
    if (metaDescriptionCounter) {
      metaDescriptionCounter.textContent = `${metaDescription.length}/160`;
      metaDescriptionCounter.classList.toggle("is-over", metaDescription.length > 160);
    }

    if (els.googleSnippet) {
      els.googleSnippet.innerHTML = `
        <p class="lpe-snippet-url">${escapeHtml(previewUrl)}</p>
        <p class="lpe-snippet-title">${escapeHtml(metaTitle || state.page?.title || "Your page title")}</p>
        <p class="lpe-snippet-description">${escapeHtml(metaDescription || "Your meta description will appear here.")}</p>
      `;
    }

    if (els.ogPreview) {
      els.ogPreview.innerHTML = `
        <div class="lpe-social-card-image"${
          ogImageUrl ? ` style="background-image:url('${escapeHtml(ogImageUrl)}')"` : ""
        }></div>
        <div class="lpe-social-card-body">
          <p class="lpe-social-card-kicker">Open Graph</p>
          <p class="lpe-social-card-title">${escapeHtml(ogTitle || "OG title preview")}</p>
          <p class="lpe-social-card-description">${escapeHtml(ogDescription || "OG description preview")}</p>
        </div>
      `;
    }

    if (els.twitterPreview) {
      els.twitterPreview.innerHTML = `
        <div class="lpe-social-card-image"${
          twitterImageUrl ? ` style="background-image:url('${escapeHtml(twitterImageUrl)}')"` : ""
        }></div>
        <div class="lpe-social-card-body">
          <p class="lpe-social-card-kicker">Twitter (${escapeHtml(twitterCard)})</p>
          <p class="lpe-social-card-title">${escapeHtml(twitterTitle || "Twitter title preview")}</p>
          <p class="lpe-social-card-description">${escapeHtml(
            twitterDescription || "Twitter description preview"
          )}</p>
        </div>
      `;
    }
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

    if (section.type === "marquee") {
      html += `
        <label class="lpe-field">
          <span>Speed (${Number(settings.speed || 28)}s)</span>
          <input type="range" min="10" max="80" data-bind-path="${settingsPath}.speed" data-bind-type="number" value="${Number(
            settings.speed || 28
          )}" />
        </label>
        <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.uppercase" data-bind-type="boolean" ${
          settings.uppercase ? "checked" : ""
        } /> Uppercase text</label>
        <div class="lpe-list-stack">
          ${(Array.isArray(settings.items) ? settings.items : []).map((item, itemIndex) => `
            <article class="lpe-list-item">
              ${baseTextField("Text", `${settingsPath}.items.${itemIndex}`, item, 120)}
              <button type="button" class="lpe-btn lpe-btn-secondary" data-action="remove-array-item" data-path="${settingsPath}.items" data-index="${itemIndex}">Remove item</button>
            </article>
          `).join("")}
          <button type="button" class="lpe-btn lpe-btn-secondary" data-action="add-array-item" data-path="${settingsPath}.items" data-template="marqueeItem">+ Add marquee text</button>
        </div>
      `;
    } else if (section.type === "header") {
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
    } else if (section.type === "imageBanner") {
      html += `
        ${baseTextField("Pretitle", `${settingsPath}.pretitle`, settings.pretitle, 80)}
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 220)}
        ${baseTextareaField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 700)}
        ${baseTextField("Desktop image URL", `${settingsPath}.backgroundImageUrl`, settings.backgroundImageUrl, 2000)}
        ${baseTextField("Mobile image URL", `${settingsPath}.mobileImageUrl`, settings.mobileImageUrl, 2000)}
        <div class="lpe-row-grid">
          <label class="lpe-field">
            <span>Alignment</span>
            <select data-bind-path="${settingsPath}.align">
              <option value="left" ${settings.align === "left" ? "selected" : ""}>Left</option>
              <option value="center" ${settings.align === "center" ? "selected" : ""}>Center</option>
              <option value="right" ${settings.align === "right" ? "selected" : ""}>Right</option>
            </select>
          </label>
          <label class="lpe-field">
            <span>Height</span>
            <select data-bind-path="${settingsPath}.height">
              <option value="md" ${settings.height === "md" ? "selected" : ""}>Medium</option>
              <option value="lg" ${settings.height === "lg" ? "selected" : ""}>Large</option>
              <option value="xl" ${settings.height === "xl" ? "selected" : ""}>Extra large</option>
            </select>
          </label>
        </div>
        <div class="lpe-row-grid">
          ${baseTextField("Button label", `${settingsPath}.buttonLabel`, settings.buttonLabel, 60)}
          ${baseTextField("Button href", `${settingsPath}.buttonHref`, settings.buttonHref, 240)}
        </div>
        <label class="lpe-field">
          <span>Overlay opacity (${Number(settings.overlayOpacity || 22)}%)</span>
          <input type="range" min="0" max="80" data-bind-path="${settingsPath}.overlayOpacity" data-bind-type="number" value="${Number(
            settings.overlayOpacity || 22
          )}" />
        </label>
      `;
    } else if (section.type === "slideShow") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <div class="lpe-row-grid">
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.autoplay" data-bind-type="boolean" ${
            settings.autoplay ? "checked" : ""
          } /> Autoplay</label>
          <label class="lpe-field">
            <span>Interval (${Number(settings.intervalSeconds || 6)}s)</span>
            <input type="range" min="3" max="12" data-bind-path="${settingsPath}.intervalSeconds" data-bind-type="number" value="${Number(
              settings.intervalSeconds || 6
            )}" />
          </label>
        </div>
        <div class="lpe-list-stack">
          ${(Array.isArray(settings.slides) ? settings.slides : []).map((slide, slideIndex) => `
            <article class="lpe-list-item">
              ${baseTextField("Slide image URL", `${settingsPath}.slides.${slideIndex}.imageUrl`, slide.imageUrl, 2000)}
              ${baseTextField("Slide title", `${settingsPath}.slides.${slideIndex}.title`, slide.title, 140)}
              ${baseTextField("Slide subtitle", `${settingsPath}.slides.${slideIndex}.subtitle`, slide.subtitle, 400)}
              <div class="lpe-row-grid">
                ${baseTextField("Button label", `${settingsPath}.slides.${slideIndex}.buttonLabel`, slide.buttonLabel, 60)}
                ${baseTextField("Button href", `${settingsPath}.slides.${slideIndex}.buttonHref`, slide.buttonHref, 240)}
              </div>
              <button type="button" class="lpe-btn lpe-btn-secondary" data-action="remove-array-item" data-path="${settingsPath}.slides" data-index="${slideIndex}">Remove slide</button>
            </article>
          `).join("")}
          <button type="button" class="lpe-btn lpe-btn-secondary" data-action="add-array-item" data-path="${settingsPath}.slides" data-template="slide">+ Add slide</button>
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
    } else if (section.type === "spotlightGrid") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <label class="lpe-field">
          <span>Desktop columns</span>
          <input type="number" min="1" max="4" data-bind-path="${settingsPath}.columnsDesktop" data-bind-type="number" value="${Number(
            settings.columnsDesktop || 3
          )}" />
        </label>
        <div class="lpe-list-stack">
          ${(Array.isArray(settings.cards) ? settings.cards : []).map((card, cardIndex) => `
            <article class="lpe-list-item">
              ${baseTextField("Card title", `${settingsPath}.cards.${cardIndex}.title`, card.title, 120)}
              ${baseTextField("Card description", `${settingsPath}.cards.${cardIndex}.description`, card.description, 300)}
              ${baseTextField("Card image URL", `${settingsPath}.cards.${cardIndex}.imageUrl`, card.imageUrl, 2000)}
              <div class="lpe-row-grid">
                ${baseTextField("Button label", `${settingsPath}.cards.${cardIndex}.buttonLabel`, card.buttonLabel, 60)}
                ${baseTextField("Button href", `${settingsPath}.cards.${cardIndex}.buttonHref`, card.buttonHref, 240)}
              </div>
              <button type="button" class="lpe-btn lpe-btn-secondary" data-action="remove-array-item" data-path="${settingsPath}.cards" data-index="${cardIndex}">Remove card</button>
            </article>
          `).join("")}
          <button type="button" class="lpe-btn lpe-btn-secondary" data-action="add-array-item" data-path="${settingsPath}.cards" data-template="spotlightCard">+ Add spotlight card</button>
        </div>
      `;
    } else if (section.type === "productGrid") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <div class="lpe-row-grid">
          <label class="lpe-field">
            <span>Desktop columns</span>
            <input type="number" min="1" max="4" data-bind-path="${settingsPath}.columnsDesktop" data-bind-type="number" value="${Number(
              settings.columnsDesktop || 4
            )}" />
          </label>
          <label class="lpe-field">
            <span>Card limit</span>
            <input type="number" min="1" max="24" data-bind-path="${settingsPath}.limit" data-bind-type="number" value="${Number(
              settings.limit || 8
            )}" />
          </label>
        </div>
        <div class="lpe-row-grid">
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showDescription" data-bind-type="boolean" ${
            settings.showDescription ? "checked" : ""
          } /> Description</label>
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showDuration" data-bind-type="boolean" ${
            settings.showDuration ? "checked" : ""
          } /> Duration</label>
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showPrice" data-bind-type="boolean" ${
            settings.showPrice ? "checked" : ""
          } /> Price</label>
        </div>
        ${baseTextField("Button label", `${settingsPath}.buttonLabel`, settings.buttonLabel, 60)}
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
    } else if (section.type === "customerReviewBlock") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <div class="lpe-row-grid">
          <label class="lpe-field">
            <span>Desktop columns</span>
            <input type="number" min="1" max="3" data-bind-path="${settingsPath}.columnsDesktop" data-bind-type="number" value="${Number(
              settings.columnsDesktop || 3
            )}" />
          </label>
          <label class="lpe-checkbox"><input type="checkbox" data-bind-path="${settingsPath}.showStars" data-bind-type="boolean" ${
            settings.showStars ? "checked" : ""
          } /> Show stars</label>
        </div>
      `;
    } else if (section.type === "instagramGrid") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 300)}
        <div class="lpe-row-grid">
          ${baseTextField("Handle", `${settingsPath}.handle`, settings.handle, 80)}
          <label class="lpe-field">
            <span>Desktop columns</span>
            <input type="number" min="2" max="6" data-bind-path="${settingsPath}.columnsDesktop" data-bind-type="number" value="${Number(
              settings.columnsDesktop || 5
            )}" />
          </label>
        </div>
        <div class="lpe-list-stack">
          ${(Array.isArray(settings.images) ? settings.images : []).map((image, imageIndex) => `
            <article class="lpe-list-item">
              ${baseTextField("Image URL", `${settingsPath}.images.${imageIndex}.url`, image.url, 2000)}
              ${baseTextField("Image link", `${settingsPath}.images.${imageIndex}.link`, image.link, 240)}
              <button type="button" class="lpe-btn lpe-btn-secondary" data-action="remove-array-item" data-path="${settingsPath}.images" data-index="${imageIndex}">Remove image</button>
            </article>
          `).join("")}
          <button type="button" class="lpe-btn lpe-btn-secondary" data-action="add-array-item" data-path="${settingsPath}.images" data-template="instagramItem">+ Add instagram image</button>
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
    } else if (section.type === "newsletterSignup") {
      html += `
        ${baseTextField("Title", `${settingsPath}.title`, settings.title, 140)}
        ${baseTextField("Subtitle", `${settingsPath}.subtitle`, settings.subtitle, 400)}
        <div class="lpe-row-grid">
          ${baseTextField("Placeholder", `${settingsPath}.placeholder`, settings.placeholder, 120)}
          ${baseTextField("Button label", `${settingsPath}.buttonLabel`, settings.buttonLabel, 60)}
        </div>
        ${baseTextareaField("Note", `${settingsPath}.note`, settings.note, 400)}
        ${baseTextField("Background image URL", `${settingsPath}.backgroundImageUrl`, settings.backgroundImageUrl, 2000)}
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
    enhanceImageUploadControls(els.sectionControls);
  }

  function enhanceImageUploadControls(container) {
    if (!container) return;
    const fields = Array.from(container.querySelectorAll(".lpe-field"));
    fields.forEach((field) => {
      const labelNode = field.querySelector(":scope > span");
      const textInput = field.querySelector("input[type='text'][data-bind-path]");
      if (!(labelNode instanceof HTMLElement) || !(textInput instanceof HTMLInputElement)) return;
      const labelText = String(labelNode.textContent || "").trim();
      if (!/image url|logo url/i.test(labelText)) return;
      if (field.querySelector("[data-action='choose-image-upload']")) return;

      const path = textInput.getAttribute("data-bind-path");
      if (!path) return;

      const actions = document.createElement("div");
      actions.className = "lpe-inline-actions lpe-upload-actions";

      const uploadButton = document.createElement("button");
      uploadButton.type = "button";
      uploadButton.className = "lpe-btn lpe-btn-secondary";
      uploadButton.textContent = "Upload image";
      uploadButton.setAttribute("data-action", "choose-image-upload");
      uploadButton.setAttribute("data-path", path);

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
      fileInput.hidden = true;
      fileInput.setAttribute("data-upload-input", "true");
      fileInput.setAttribute("data-path", path);

      actions.appendChild(uploadButton);
      actions.appendChild(fileInput);
      field.appendChild(actions);

      const currentValue = safeText(textInput.value, "");
      if (currentValue && !field.querySelector(".lpe-upload-preview")) {
        const preview = document.createElement("img");
        preview.className = "lpe-upload-preview";
        preview.src = currentValue;
        preview.alt = `${labelText} preview`;
        preview.loading = "lazy";
        field.appendChild(preview);
      }
    });
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
          openRightPanel("element");
          setRightTab("element");
          activateRailTool("sections");
          renderSectionsList();
          renderSectionControls();
        },
        onInlineEdit(path, value) {
          setPathValue(path, value, "string");
          queueAutosave();
          queuePreviewRender();
        },
      }
    );
  }

  function queuePreviewRender() {
    if (state.previewRenderFrame) return;
    state.previewRenderFrame = window.requestAnimationFrame(() => {
      state.previewRenderFrame = 0;
      renderPreview();
    });
  }

  function renderStaticSections() {
    renderPageMeta();
    renderSectionsList();
    renderPresetThemes();
    renderThemeControls();
    renderSectionControls();
    renderHistory();
    setRightTab(state.rightTab);
    updateSaveActions();
  }

  function renderAll() {
    renderStaticSections();
    renderPreview();
  }

  function setRightTab(tabName) {
    const normalized = tabName === "theme" ? "theme" : "element";
    state.rightTab = normalized;
    activateRailTool(normalized === "theme" ? "settings" : "sections");
    els.rightTabButtons.forEach((button) => {
      const active = button.getAttribute("data-right-tab-btn") === normalized;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.rightTabPanels.forEach((panel) => {
      const active = panel.getAttribute("data-right-tab-panel") === normalized;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  function setRailExpanded(expanded) {
    if (!els.utilityRail) return;
    state.railExpanded = Boolean(expanded);
    els.utilityRail.classList.toggle("is-expanded", state.railExpanded);
    els.utilityRail.classList.toggle("is-collapsed", !state.railExpanded);
    if (els.layout) {
      els.layout.style.setProperty("--lpe-rail-width", state.railExpanded ? "172px" : "56px");
    }
    if (els.railToggle) {
      els.railToggle.setAttribute("aria-label", state.railExpanded ? "Collapse tools" : "Expand tools");
      els.railToggle.setAttribute("data-tooltip", state.railExpanded ? "Collapse tools" : "Expand tools");
    }
  }

  function setFocusMode(enabled) {
    const next = Boolean(enabled);
    state.focusMode = next;

    if (next) {
      state.focusMemory = {
        leftPanelCollapsed: state.leftPanelCollapsed,
        rightPanelCollapsed: state.rightPanelCollapsed,
        leftPanelWidth: state.leftPanelWidth,
        rightPanelWidth: state.rightPanelWidth,
      };
      state.leftPanelCollapsed = true;
      state.rightPanelCollapsed = true;
      setRailExpanded(false);
    } else if (state.focusMemory) {
      state.leftPanelCollapsed = Boolean(state.focusMemory.leftPanelCollapsed);
      state.rightPanelCollapsed = Boolean(state.focusMemory.rightPanelCollapsed);
      state.leftPanelWidth = Number(state.focusMemory.leftPanelWidth) || 280;
      state.rightPanelWidth = Number(state.focusMemory.rightPanelWidth) || 360;
      state.focusMemory = null;
    }

    if (els.shell) {
      els.shell.classList.toggle("is-focus-mode", state.focusMode);
    }
    if (els.focusBtn) {
      els.focusBtn.classList.toggle("is-active", state.focusMode);
      els.focusBtn.innerHTML = '<span aria-hidden="true">&#9974;</span>';
      els.focusBtn.setAttribute("title", state.focusMode ? "Exit focus mode" : "Focus mode");
      els.focusBtn.setAttribute("aria-label", state.focusMode ? "Exit focus mode" : "Focus mode");
      els.focusBtn.setAttribute("aria-pressed", state.focusMode ? "true" : "false");
    }
    applyPanelLayout();
  }

  function applyPanelLayout() {
    if (!els.layout) return;
    const leftWidth = state.leftPanelCollapsed ? 0 : Math.round(state.leftPanelWidth);
    const rightWidth = state.rightPanelCollapsed ? 0 : Math.round(state.rightPanelWidth);
    els.layout.style.setProperty("--lpe-left-width", `${leftWidth}px`);
    els.layout.style.setProperty("--lpe-right-width", `${rightWidth}px`);
    els.layout.classList.toggle("is-left-collapsed", state.leftPanelCollapsed);
    els.layout.classList.toggle("is-right-collapsed", state.rightPanelCollapsed);
    if (els.rightPanel) {
      els.rightPanel.setAttribute("aria-hidden", state.rightPanelCollapsed ? "true" : "false");
    }
    if (els.leftCollapseBtn) {
      els.leftCollapseBtn.innerHTML = `<span aria-hidden="true">${state.leftPanelCollapsed ? "&rsaquo;" : "&lsaquo;"}</span>`;
      els.leftCollapseBtn.setAttribute(
        "aria-label",
        state.leftPanelCollapsed ? "Expand sections panel" : "Collapse sections panel"
      );
    }
    if (els.rightCollapseBtn) {
      els.rightCollapseBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
      els.rightCollapseBtn.setAttribute("aria-label", "Close settings panel");
    }
  }

  function openRightPanel(tabName) {
    if (state.focusMode) setFocusMode(false);
    if (tabName) setRightTab(tabName);
    state.rightPanelCollapsed = false;
    applyPanelLayout();
    if (els.rightPanel) {
      window.requestAnimationFrame(() => {
        const activePanel = els.rightTabPanels.find((panel) => panel.classList.contains("is-active"));
        if (activePanel) activePanel.scrollTop = 0;
      });
    }
  }

  function closeRightPanel() {
    state.rightPanelCollapsed = true;
    applyPanelLayout();
  }

  function togglePanelCollapse(side) {
    if (state.focusMode) {
      setFocusMode(false);
    }
    if (side === "left") {
      state.leftPanelCollapsed = !state.leftPanelCollapsed;
      if (!state.leftPanelCollapsed && state.leftPanelWidth < 240) state.leftPanelWidth = 280;
    }
    if (side === "right") {
      state.rightPanelCollapsed = !state.rightPanelCollapsed;
      if (!state.rightPanelCollapsed && state.rightPanelWidth < 300) state.rightPanelWidth = 360;
    }
    applyPanelLayout();
  }

  function activateRailTool(tool) {
    if (!els.utilityRail) return;
    const buttons = Array.from(els.utilityRail.querySelectorAll("[data-rail-tool]"));
    buttons.forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-rail-tool") === tool);
    });
  }

  function bindPanelFrameEvents() {
    setRailExpanded(false);
    activateRailTool("sections");
    setFocusMode(false);
    applyPanelLayout();
    setRightTab(state.rightTab);

    if (els.railToggle) {
      els.railToggle.addEventListener("click", () => {
        setRailExpanded(!state.railExpanded);
      });
    }

    if (els.utilityRail) {
      els.utilityRail.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest("[data-rail-tool]");
        if (!(button instanceof HTMLElement)) return;
        const tool = button.getAttribute("data-rail-tool");
        if (!tool) return;
        activateRailTool(tool);
        if (tool === "settings") {
          openRightPanel("theme");
          return;
        }
        if (tool === "sections") {
          closeRightPanel();
          if (state.leftPanelCollapsed) togglePanelCollapse("left");
          if (els.leftPanel) els.leftPanel.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    if (els.leftCollapseBtn) {
      els.leftCollapseBtn.addEventListener("click", () => togglePanelCollapse("left"));
    }

    if (els.rightCollapseBtn) {
      els.rightCollapseBtn.addEventListener("click", () => closeRightPanel());
    }

    if (els.settingsDoneBtn) {
      els.settingsDoneBtn.addEventListener("click", () => closeRightPanel());
    }

    els.rightTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.getAttribute("data-right-tab-btn");
        if (!tab) return;
        setRightTab(tab);
      });
    });

    const bindResizer = (handle, side) => {
      if (!handle) return;
      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        if (state.focusMode) setFocusMode(false);
        const startX = event.clientX;
        const startLeft = state.leftPanelWidth;
        const startRight = state.rightPanelWidth;

        const onMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          if (side === "left") {
            state.leftPanelCollapsed = false;
            state.leftPanelWidth = Math.max(240, Math.min(520, startLeft + deltaX));
          } else {
            state.rightPanelCollapsed = false;
            state.rightPanelWidth = Math.max(300, Math.min(520, startRight - deltaX));
          }
          applyPanelLayout();
        };

        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          document.body.classList.remove("is-panel-resizing");
        };

        document.body.classList.add("is-panel-resizing");
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    };

    bindResizer(els.leftResizer, "left");
    bindResizer(els.rightResizer, "right");
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
    queuePreviewRender();
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
      setDirty(false);
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
      if (state.isDirty) {
        const saved = await saveDraft(true);
        if (!saved) return;
      }
      const payload = await apiRequest(`/api/dashboard/pages/${encodeURIComponent(state.pageId)}/publish`, {
        method: "POST",
      });
      normalizePayload(payload);
      setDirty(false);
      renderAll();
      setSaveStatus("saved", "Published");
    } catch (error) {
      setDirty(true);
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
    openRightPanel("element");
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
    if (els.focusBtn) {
      els.focusBtn.addEventListener("click", () => {
        setFocusMode(!state.focusMode);
      });
    }
    if (els.saveTopBtn) {
      els.saveTopBtn.addEventListener("click", () => {
        if (state.saveTimer) clearTimeout(state.saveTimer);
        saveDraft(true);
      });
    }
    if (els.saveBtn) {
      els.saveBtn.addEventListener("click", () => {
        if (state.saveTimer) clearTimeout(state.saveTimer);
        saveDraft(true);
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "\\" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      setFocusMode(!state.focusMode);
    });
  }

  function bindSectionsEvents() {
    if (!els.sectionsList) return;
    let dragFrom = -1;
    let dragRow = null;
    let dropRow = null;

    const clearDragClasses = () => {
      if (dragRow) dragRow.classList.remove("is-dragging");
      if (dropRow) dropRow.classList.remove("is-drop-target");
      dragRow = null;
      dropRow = null;
    };

    const closeRowMenu = () => {
      if (!state.openRowMenuSectionId) return;
      state.openRowMenuSectionId = "";
      renderSectionsList();
    };

    if (els.sectionsFilter) {
      els.sectionsFilter.addEventListener("input", () => {
        state.sectionsFilterText = safeText(els.sectionsFilter.value, "");
        renderSectionsList();
      });
    }

    els.sectionsList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const actionEl = target.closest("[data-action]");
      if (!(actionEl instanceof HTMLElement)) return;
      const action = actionEl.getAttribute("data-action");
      const sectionId = actionEl.getAttribute("data-section-id");
      if (!action || !sectionId) return;

      if (action !== "toggle-row-menu") {
        state.openRowMenuSectionId = "";
      }

      if (action === "select-section") {
        state.selectedSectionId = sectionId;
        openRightPanel("element");
        setRightTab("element");
        activateRailTool("sections");
        renderSectionsList();
        renderSectionControls();
        renderPreview();
        return;
      }

      if (action === "toggle-row-menu") {
        state.openRowMenuSectionId = state.openRowMenuSectionId === sectionId ? "" : sectionId;
        renderSectionsList();
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
        openRightPanel("element");
        renderAll();
        queueAutosave();
        return;
      }

      if (action === "rename-section") {
        const section = sectionList()[index];
        const currentName = safeText(section.customLabel, section.type);
        const nextName = window.prompt("Section name", currentName);
        if (!nextName || !nextName.trim()) return;
        section.customLabel = nextName.trim().slice(0, 80);
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
        dragRow = row;
        dragRow.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        const sectionId = String(row.getAttribute("data-section-id") || "");
        event.dataTransfer.setData("text/plain", sectionId);
      }
    });

    els.sectionsList.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const row = event.target.closest("[data-index]");
      if (!row || row === dragRow) return;
      if (dropRow && dropRow !== row) {
        dropRow.classList.remove("is-drop-target");
      }
      dropRow = row;
      dropRow.classList.add("is-drop-target");
    });

    els.sectionsList.addEventListener("drop", (event) => {
      event.preventDefault();
      const row = event.target.closest("[data-index]");
      if (!row) {
        clearDragClasses();
        return;
      }
      const toIndex = Number(row.getAttribute("data-index"));
      if (!Number.isFinite(toIndex) || !Number.isFinite(dragFrom)) {
        clearDragClasses();
        return;
      }
      clearDragClasses();
      if (toIndex === dragFrom) {
        dragFrom = -1;
        return;
      }
      reorderSections(dragFrom, toIndex);
      dragFrom = -1;
    });

    els.sectionsList.addEventListener("dragend", () => {
      clearDragClasses();
      dragFrom = -1;
    });

    els.sectionsList.addEventListener("contextmenu", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const row = target.closest(".lpe-section-row[data-section-id]");
      if (!(row instanceof HTMLElement)) return;
      const sectionId = String(row.getAttribute("data-section-id") || "");
      if (!sectionId) return;
      event.preventDefault();
      state.selectedSectionId = sectionId;
      state.openRowMenuSectionId = sectionId;
      renderSectionsList();
      renderSectionControls();
      renderPreview();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("#lpe-sections-list")) {
        closeRowMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeRowMenu();
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
        if (path.startsWith("theme.")) {
          renderPresetThemes();
          refreshSeoPreviews();
        }
        if (path === "page.slug" || path === "page.title") {
          renderPageMeta();
          refreshSeoPreviews();
        }
        queuePreviewRender();
        queueAutosave();
      };
      container.addEventListener("input", handleBind);
      container.addEventListener("change", handleBind);
    };

    attachValueBinding(els.themeControls);
    attachValueBinding(els.sectionControls);

    if (els.presetThemes) {
      els.presetThemes.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest("[data-action='apply-prebuilt-template']");
        if (!(button instanceof HTMLElement)) return;
        const templateId = button.getAttribute("data-template-id");
        if (!templateId) return;
        applyPrebuiltTemplateById(templateId);
      });
    }

    if (els.themeControls) {
      els.themeControls.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        if (action !== "choose-image-upload") return;
        const path = target.getAttribute("data-path");
        const uploadInput = getUploadInputByPath(path);
        if (uploadInput) uploadInput.click();
      });

      els.themeControls.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.type === "file" && target.getAttribute("data-upload-input") === "true") {
          const path = target.getAttribute("data-path");
          if (!path) return;
          handleImageUpload(path, target);
        }
      });
    }

    if (els.sectionControls) {
      els.sectionControls.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute("data-action");
        if (!action) return;

        if (action === "choose-image-upload") {
          const path = target.getAttribute("data-path");
          const uploadInput = getUploadInputByPath(path);
          if (uploadInput) uploadInput.click();
          return;
        }

        if (action === "add-array-item") {
          const path = target.getAttribute("data-path");
          const template = target.getAttribute("data-template");
          const defaults = {
            marqueeItem: "",
            slide: {
              imageUrl: "",
              title: "",
              subtitle: "",
              buttonLabel: "",
              buttonHref: "",
            },
            spotlightCard: {
              title: "",
              description: "",
              imageUrl: "",
              buttonLabel: "",
              buttonHref: "",
            },
            instagramItem: {
              url: "",
              link: "",
            },
          };
          addArrayItem(path, Object.prototype.hasOwnProperty.call(defaults, template) ? defaults[template] : "");
          return;
        }
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
        if (
          target.type === "file" &&
          target.getAttribute("data-upload-input") === "true"
        ) {
          const path = target.getAttribute("data-path");
          if (!path) return;
          handleImageUpload(path, target);
          return;
        }
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
      setDirty(false);
      renderAll();
      setSaveStatus("saved", "Saved");
    } catch (error) {
      setDirty(true);
      setSaveStatus("error", error.message || "Load failed");
    }
  }

  bindPanelFrameEvents();
  bindTopbarEvents();
  bindSectionsEvents();
  bindControlsEvents();
  bindHistoryEvents();
  bindModalEvents();
  loadEditor();
})();
