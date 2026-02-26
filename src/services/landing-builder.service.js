const { query, withTransaction } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const {
  assertString,
  assertOptionalString,
  assertSlug,
  assertInteger,
} = require("../utils/validation");

const HISTORY_LIMIT = 10;

const SECTION_DEFINITIONS = Object.freeze({
  header: {
    category: "essentials",
    label: "Header",
    description: "Navigation with brand, links, and primary CTA.",
    icon: "layout",
    singleton: true,
    defaultSettings: {
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
  },
  hero: {
    category: "essentials",
    label: "Hero",
    description: "High-impact banner with heading, copy, and CTAs.",
    icon: "sparkles",
    singleton: false,
    defaultSettings: {
      badge: "Premium salon experience",
      title: "Where beauty meets precision",
      subtitle:
        "Create unforgettable beauty experiences with services clients can book instantly.",
      primaryButtonLabel: "Book consultation",
      primaryButtonHref: "#services",
      secondaryButtonLabel: "View services",
      secondaryButtonHref: "#services",
      backgroundImageUrl: "",
      align: "left",
    },
  },
  text: {
    category: "essentials",
    label: "Text",
    description: "Rich text block for announcements and brand story.",
    icon: "type",
    singleton: false,
    defaultSettings: {
      title: "About our studio",
      body:
        "We blend modern techniques with personalized care to deliver custom looks for every client.",
      align: "left",
    },
  },
  imageShowcase: {
    category: "essentials",
    label: "Image Showcase",
    description: "Photo gallery section with configurable grid.",
    icon: "image",
    singleton: false,
    defaultSettings: {
      title: "Gallery",
      subtitle: "A glimpse of our latest transformations",
      columnsDesktop: 3,
      columnsMobile: 1,
      images: [
        { url: "", alt: "Style showcase 1" },
        { url: "", alt: "Style showcase 2" },
        { url: "", alt: "Style showcase 3" },
      ],
    },
  },
  servicesMenu: {
    category: "salon",
    label: "Appointments / Services Menu",
    description: "Tabbed or stacked service cards with pricing and booking.",
    icon: "scissors",
    singleton: false,
    defaultSettings: {
      title: "Service Menu",
      subtitle:
        "Indulge in our curated selection of professional beauty treatments.",
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
  },
  stylists: {
    category: "salon",
    label: "Stylists",
    description: "Team profiles with roles and profile images.",
    icon: "users",
    singleton: false,
    defaultSettings: {
      title: "Meet the Stylists",
      subtitle: "Experts who bring your vision to life",
      members: [
        {
          name: "Lead Stylist",
          role: "Color Specialist",
          imageUrl: "",
          bio: "Certified stylist with 10+ years of experience.",
        },
      ],
    },
  },
  reviewsMarquee: {
    category: "salon",
    label: "Reviews",
    description: "Auto-scrolling testimonials with stars and avatars.",
    icon: "message-circle",
    singleton: false,
    defaultSettings: {
      title: "Loved by clients",
      subtitle: "Real stories from happy customers",
      style: "cards",
      speed: 35,
      pauseOnHover: true,
      showStars: true,
      rows: 1,
    },
  },
  contactMap: {
    category: "info",
    label: "Contact & Map",
    description: "Address, contact details, and embedded map.",
    icon: "map-pin",
    singleton: false,
    defaultSettings: {
      title: "Visit us",
      subtitle: "Walk-ins welcome during business hours",
      address: "123 Beauty Street, Your City",
      phone: "+1 (555) 000-1234",
      email: "hello@yourstudio.com",
      mapEmbedUrl: "",
      showForm: true,
    },
  },
  faq: {
    category: "info",
    label: "FAQ",
    description: "Frequently asked questions with collapsible answers.",
    icon: "help-circle",
    singleton: false,
    defaultSettings: {
      title: "Frequently asked questions",
      items: [
        {
          question: "How far in advance should I book?",
          answer: "We recommend booking at least 2-3 days in advance for peak times.",
        },
        {
          question: "Do you accept walk-ins?",
          answer: "Yes, based on stylist availability. Booking online guarantees your slot.",
        },
      ],
    },
  },
  footer: {
    category: "info",
    label: "Footer",
    description: "Footer with legal links and social links.",
    icon: "layout-bottom",
    singleton: true,
    defaultSettings: {
      copyright: "© MeetScheduling",
      tagline: "Built with MeetScheduling",
      links: [
        { label: "Privacy", href: "/privacy-policy" },
        { label: "Terms", href: "/legal" },
      ],
    },
  },
});

const PRESET_DEFINITIONS = Object.freeze({
  luxe: {
    id: "luxe",
    name: "Luxe Glow",
    description: "Elegant gradients, premium spacing, soft animation.",
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
  minimal: {
    id: "minimal",
    name: "Minimal Studio",
    description: "Clean monochrome style with subtle blue accents.",
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
  vivid: {
    id: "vivid",
    name: "Vivid Editorial",
    description: "Bold color contrast and stronger interaction effects.",
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
});

const THEME_FONTS = new Set(["Inter", "DM Sans", "Sora", "System"]);
const BUTTON_STYLES = new Set(["solid", "outline", "gradient"]);
const ANIMATION_STYLES = new Set(["subtle", "medium", "bold"]);

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function safeText(value, fallback = "", max = 5000) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text.slice(0, max);
}

function safeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function normalizeColor(value, fallback = "#1a73e8") {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = String(value).trim();
  const normalized = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return fallback;
  return normalized.toLowerCase();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sectionDefault(type) {
  const def = SECTION_DEFINITIONS[type];
  if (!def) return {};
  return JSON.parse(JSON.stringify(def.defaultSettings));
}

function mapPresetList() {
  return Object.values(PRESET_DEFINITIONS).map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
  }));
}

function sectionLibraryList() {
  return Object.entries(SECTION_DEFINITIONS).map(([type, def]) => ({
    type,
    category: def.category,
    label: def.label,
    description: def.description,
    icon: def.icon,
    singleton: !!def.singleton,
  }));
}

function buildStarterSections({ businessName }) {
  return [
    {
      id: "header-main",
      type: "header",
      enabled: true,
      settings: {
        ...sectionDefault("header"),
        brandName: businessName || "MeetScheduling",
      },
    },
    {
      id: "hero-main",
      type: "hero",
      enabled: true,
      settings: {
        ...sectionDefault("hero"),
        title: `Welcome to ${businessName || "our studio"}`,
      },
    },
    {
      id: "services-main",
      type: "servicesMenu",
      enabled: true,
      settings: sectionDefault("servicesMenu"),
    },
    {
      id: "reviews-main",
      type: "reviewsMarquee",
      enabled: true,
      settings: sectionDefault("reviewsMarquee"),
    },
    {
      id: "contact-main",
      type: "contactMap",
      enabled: true,
      settings: sectionDefault("contactMap"),
    },
    {
      id: "footer-main",
      type: "footer",
      enabled: true,
      settings: {
        ...sectionDefault("footer"),
        copyright: `© ${new Date().getFullYear()} ${businessName || "MeetScheduling"}`,
      },
    },
  ];
}

function buildStarterConfig({ presetId, businessName }) {
  const preset = PRESET_DEFINITIONS[presetId] || PRESET_DEFINITIONS.minimal;
  return {
    theme: JSON.parse(JSON.stringify(preset.theme)),
    sections: buildStarterSections({ businessName }),
  };
}

function normalizeNavLinks(rawLinks, fallbackLinks) {
  const source = Array.isArray(rawLinks) ? rawLinks : Array.isArray(fallbackLinks) ? fallbackLinks : [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = safeText(item.label, "", 50);
      const href = safeText(item.href, "", 200);
      if (!label) return null;
      return { label, href: href || "#" };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeLinks(rawLinks, fallbackLinks) {
  return normalizeNavLinks(rawLinks, fallbackLinks).slice(0, 12);
}

function normalizeFaqItems(rawItems, fallbackItems) {
  const source = Array.isArray(rawItems) ? rawItems : Array.isArray(fallbackItems) ? fallbackItems : [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const question = safeText(item.question, "", 180);
      const answer = safeText(item.answer, "", 1200);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeImages(rawImages, fallbackImages) {
  const source = Array.isArray(rawImages) ? rawImages : Array.isArray(fallbackImages) ? fallbackImages : [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const url = safeText(item.url, "", 2000);
      const alt = safeText(item.alt, "", 180);
      if (!url) return null;
      return { url, alt };
    })
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeStylists(rawMembers, fallbackMembers) {
  const source = Array.isArray(rawMembers)
    ? rawMembers
    : Array.isArray(fallbackMembers)
      ? fallbackMembers
      : [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const name = safeText(item.name, "", 100);
      const role = safeText(item.role, "", 100);
      const imageUrl = safeText(item.imageUrl, "", 2000);
      const bio = safeText(item.bio, "", 500);
      if (!name) return null;
      return { name, role, imageUrl, bio };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeSectionSettings(type, settings, fallbackSettings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const fallback = fallbackSettings && typeof fallbackSettings === "object" ? fallbackSettings : sectionDefault(type);

  if (type === "header") {
    return {
      brandName: safeText(source.brandName, safeText(fallback.brandName, "MeetScheduling", 120), 120),
      logoUrl: safeText(source.logoUrl, safeText(fallback.logoUrl, "", 2000), 2000),
      navLinks: normalizeNavLinks(source.navLinks, fallback.navLinks),
      showSearch: safeBoolean(source.showSearch, safeBoolean(fallback.showSearch, true)),
      searchPlaceholder: safeText(
        source.searchPlaceholder,
        safeText(fallback.searchPlaceholder, "Search services...", 80),
        80
      ),
      ctaLabel: safeText(source.ctaLabel, safeText(fallback.ctaLabel, "Book now", 50), 50),
      ctaHref: safeText(source.ctaHref, safeText(fallback.ctaHref, "#services", 200), 200),
      sticky: safeBoolean(source.sticky, safeBoolean(fallback.sticky, false)),
    };
  }

  if (type === "hero") {
    return {
      badge: safeText(source.badge, safeText(fallback.badge, "", 80), 80),
      title: safeText(source.title, safeText(fallback.title, "", 200), 200),
      subtitle: safeText(source.subtitle, safeText(fallback.subtitle, "", 800), 800),
      primaryButtonLabel: safeText(
        source.primaryButtonLabel,
        safeText(fallback.primaryButtonLabel, "Book consultation", 60),
        60
      ),
      primaryButtonHref: safeText(source.primaryButtonHref, safeText(fallback.primaryButtonHref, "#services", 200), 200),
      secondaryButtonLabel: safeText(
        source.secondaryButtonLabel,
        safeText(fallback.secondaryButtonLabel, "View services", 60),
        60
      ),
      secondaryButtonHref: safeText(source.secondaryButtonHref, safeText(fallback.secondaryButtonHref, "#services", 200), 200),
      backgroundImageUrl: safeText(source.backgroundImageUrl, safeText(fallback.backgroundImageUrl, "", 2000), 2000),
      align: ["left", "center"].includes(safeText(source.align, "", 20))
        ? safeText(source.align, "left", 20)
        : safeText(fallback.align, "left", 20),
    };
  }

  if (type === "text") {
    return {
      title: safeText(source.title, safeText(fallback.title, "Text block", 180), 180),
      body: safeText(source.body, safeText(fallback.body, "", 4000), 4000),
      align: ["left", "center"].includes(safeText(source.align, "", 20))
        ? safeText(source.align, "left", 20)
        : safeText(fallback.align, "left", 20),
    };
  }

  if (type === "imageShowcase") {
    return {
      title: safeText(source.title, safeText(fallback.title, "Gallery", 140), 140),
      subtitle: safeText(source.subtitle, safeText(fallback.subtitle, "", 400), 400),
      columnsDesktop: clamp(source.columnsDesktop, 1, 4, clamp(fallback.columnsDesktop, 1, 4, 3)),
      columnsMobile: clamp(source.columnsMobile, 1, 2, clamp(fallback.columnsMobile, 1, 2, 1)),
      images: normalizeImages(source.images, fallback.images),
    };
  }

  if (type === "servicesMenu") {
    return {
      title: safeText(source.title, safeText(fallback.title, "Service Menu", 140), 140),
      subtitle: safeText(source.subtitle, safeText(fallback.subtitle, "", 400), 400),
      viewMode: ["tabs", "stacked"].includes(safeText(source.viewMode, "", 20))
        ? safeText(source.viewMode, "tabs", 20)
        : safeText(fallback.viewMode, "tabs", 20),
      showSearch: safeBoolean(source.showSearch, safeBoolean(fallback.showSearch, true)),
      showPhotos: safeBoolean(source.showPhotos, safeBoolean(fallback.showPhotos, true)),
      showDuration: safeBoolean(source.showDuration, safeBoolean(fallback.showDuration, true)),
      showPrice: safeBoolean(source.showPrice, safeBoolean(fallback.showPrice, true)),
      cardRadius: clamp(source.cardRadius, 0, 30, clamp(fallback.cardRadius, 0, 30, 14)),
      columnsDesktop: clamp(source.columnsDesktop, 1, 3, clamp(fallback.columnsDesktop, 1, 3, 2)),
      columnsMobile: clamp(source.columnsMobile, 1, 2, clamp(fallback.columnsMobile, 1, 2, 1)),
      categoryIds: Array.isArray(source.categoryIds)
        ? source.categoryIds.map((id) => safeText(id, "", 80)).filter(Boolean).slice(0, 40)
        : Array.isArray(fallback.categoryIds)
          ? fallback.categoryIds.map((id) => safeText(id, "", 80)).filter(Boolean).slice(0, 40)
          : [],
      showViewAll: safeBoolean(source.showViewAll, safeBoolean(fallback.showViewAll, true)),
      viewAllLabel: safeText(source.viewAllLabel, safeText(fallback.viewAllLabel, "View All Services", 80), 80),
      bookButtonLabel: safeText(source.bookButtonLabel, safeText(fallback.bookButtonLabel, "Book", 50), 50),
      bookButtonStyle: ["solid", "outline", "gradient"].includes(safeText(source.bookButtonStyle, "", 20))
        ? safeText(source.bookButtonStyle, "solid", 20)
        : safeText(fallback.bookButtonStyle, "solid", 20),
    };
  }

  if (type === "stylists") {
    return {
      title: safeText(source.title, safeText(fallback.title, "Stylists", 140), 140),
      subtitle: safeText(source.subtitle, safeText(fallback.subtitle, "", 400), 400),
      members: normalizeStylists(source.members, fallback.members),
    };
  }

  if (type === "reviewsMarquee") {
    return {
      title: safeText(source.title, safeText(fallback.title, "Reviews", 140), 140),
      subtitle: safeText(source.subtitle, safeText(fallback.subtitle, "", 400), 400),
      style: ["cards", "marquee", "multi-row"].includes(safeText(source.style, "", 20))
        ? safeText(source.style, "cards", 20)
        : safeText(fallback.style, "cards", 20),
      speed: clamp(source.speed, 10, 80, clamp(fallback.speed, 10, 80, 35)),
      pauseOnHover: safeBoolean(source.pauseOnHover, safeBoolean(fallback.pauseOnHover, true)),
      showStars: safeBoolean(source.showStars, safeBoolean(fallback.showStars, true)),
      rows: clamp(source.rows, 1, 3, clamp(fallback.rows, 1, 3, 1)),
    };
  }

  if (type === "contactMap") {
    return {
      title: safeText(source.title, safeText(fallback.title, "Contact", 140), 140),
      subtitle: safeText(source.subtitle, safeText(fallback.subtitle, "", 400), 400),
      address: safeText(source.address, safeText(fallback.address, "", 300), 300),
      phone: safeText(source.phone, safeText(fallback.phone, "", 80), 80),
      email: safeText(source.email, safeText(fallback.email, "", 180), 180),
      mapEmbedUrl: safeText(source.mapEmbedUrl, safeText(fallback.mapEmbedUrl, "", 2000), 2000),
      showForm: safeBoolean(source.showForm, safeBoolean(fallback.showForm, true)),
    };
  }

  if (type === "faq") {
    return {
      title: safeText(source.title, safeText(fallback.title, "FAQ", 140), 140),
      items: normalizeFaqItems(source.items, fallback.items),
    };
  }

  if (type === "footer") {
    return {
      copyright: safeText(source.copyright, safeText(fallback.copyright, "", 180), 180),
      tagline: safeText(source.tagline, safeText(fallback.tagline, "", 180), 180),
      links: normalizeLinks(source.links, fallback.links),
    };
  }

  return JSON.parse(JSON.stringify(fallback));
}

function normalizeTheme(theme, fallbackTheme) {
  const source = theme && typeof theme === "object" ? theme : {};
  const fallback = fallbackTheme && typeof fallbackTheme === "object"
    ? fallbackTheme
    : PRESET_DEFINITIONS.minimal.theme;

  const fontRaw = safeText(source.font, "", 40);
  const buttonRaw = safeText(source.buttonStyle, "", 20);
  const animationRaw = safeText(source.animationStyle, "", 20);

  return {
    primary: normalizeColor(source.primary, normalizeColor(fallback.primary, "#1a73e8")),
    secondary: normalizeColor(source.secondary, normalizeColor(fallback.secondary, "#0f766e")),
    background: normalizeColor(source.background, normalizeColor(fallback.background, "#f4f7fb")),
    surface: normalizeColor(source.surface, normalizeColor(fallback.surface, "#ffffff")),
    text: normalizeColor(source.text, normalizeColor(fallback.text, "#111827")),
    muted: normalizeColor(source.muted, normalizeColor(fallback.muted, "#5f6b7d")),
    border: normalizeColor(source.border, normalizeColor(fallback.border, "#d8e1ef")),
    font: THEME_FONTS.has(fontRaw) ? fontRaw : safeText(fallback.font, "Inter", 40),
    radius: clamp(source.radius, 0, 28, clamp(fallback.radius, 0, 28, 14)),
    sectionPadding: clamp(source.sectionPadding, 20, 120, clamp(fallback.sectionPadding, 20, 120, 48)),
    buttonStyle: BUTTON_STYLES.has(buttonRaw) ? buttonRaw : safeText(fallback.buttonStyle, "solid", 20),
    shadowStyle: ["none", "minimal", "soft", "medium"].includes(safeText(source.shadowStyle, "", 20))
      ? safeText(source.shadowStyle, "soft", 20)
      : safeText(fallback.shadowStyle, "soft", 20),
    animationsEnabled: safeBoolean(source.animationsEnabled, safeBoolean(fallback.animationsEnabled, true)),
    animationStyle: ANIMATION_STYLES.has(animationRaw)
      ? animationRaw
      : safeText(fallback.animationStyle, "subtle", 20),
  };
}

function normalizeConfig(inputConfig, fallbackConfig) {
  const fallback = fallbackConfig && typeof fallbackConfig === "object"
    ? fallbackConfig
    : buildStarterConfig({ presetId: "minimal", businessName: "MeetScheduling" });
  const input = inputConfig && typeof inputConfig === "object" ? inputConfig : {};

  const theme = normalizeTheme(input.theme, fallback.theme);

  const inputSections = Array.isArray(input.sections) ? input.sections : [];
  const baseSections = Array.isArray(fallback.sections) ? fallback.sections : [];

  const byTypeFallback = new Map();
  baseSections.forEach((item) => {
    if (!item || !item.type) return;
    if (!byTypeFallback.has(item.type)) byTypeFallback.set(item.type, item);
  });

  const normalizedSections = [];
  const usedIds = new Set();

  inputSections.forEach((rawSection) => {
    if (!rawSection || typeof rawSection !== "object") return;
    const type = safeText(rawSection.type, "", 60);
    if (!SECTION_DEFINITIONS[type]) return;

    let id = safeText(rawSection.id, `${type}-${Math.random().toString(36).slice(2, 8)}`, 80);
    if (!id || usedIds.has(id)) {
      id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
    }
    usedIds.add(id);

    const fallbackSection = byTypeFallback.get(type) || {
      settings: sectionDefault(type),
      enabled: true,
    };

    normalizedSections.push({
      id,
      type,
      enabled: rawSection.enabled === undefined
        ? safeBoolean(rawSection.visible, safeBoolean(fallbackSection.enabled, true))
        : safeBoolean(rawSection.enabled, safeBoolean(fallbackSection.enabled, true)),
      settings: normalizeSectionSettings(type, rawSection.settings, fallbackSection.settings),
    });
  });

  if (!normalizedSections.length) {
    return {
      theme,
      sections: baseSections.map((section) => ({
        id: safeText(section.id, `${section.type}-${Math.random().toString(36).slice(2, 8)}`, 80),
        type: section.type,
        enabled: safeBoolean(section.enabled, safeBoolean(section.visible, true)),
        settings: normalizeSectionSettings(section.type, section.settings, section.settings),
      })),
    };
  }

  return { theme, sections: normalizedSections };
}

function mapPageRow(row, userRow = null) {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    publicUrl: `/${row.slug}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    username: userRow ? userRow.username : undefined,
    businessName: userRow ? userRow.display_name : undefined,
    timezone: userRow ? userRow.timezone : undefined,
  };
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    sortOrder: Number(row.sort_order) || 0,
    isActive: !!row.is_active,
    serviceCount: row.service_count === undefined ? undefined : Number(row.service_count) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceRow(row, username = "") {
  const eventSlug = safeText(row.event_type_slug, "", 80);
  const bookUrl = eventSlug && username ? `/${username}/${eventSlug}` : "";
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name || "",
    eventTypeId: row.event_type_id || "",
    eventTypeSlug: eventSlug,
    name: row.name,
    description: row.description || "",
    priceCents: Number(row.price_cents) || 0,
    durationMinutes: Number(row.duration_minutes) || 30,
    imageUrl: row.image_url || "",
    isActive: !!row.is_active,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookUrl,
  };
}

function mapReviewRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    serviceId: row.service_id || "",
    serviceName: row.service_name || "",
    name: row.name,
    rating: Number(row.rating) || 5,
    text: row.text,
    avatarUrl: row.avatar_url || "",
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventTypeRow(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    durationMinutes: Number(row.duration_minutes) || 30,
    locationType: row.location_type || "custom",
  };
}

async function getUser(userId, client = null) {
  const result = await query(
    `
      SELECT id, username, display_name, timezone
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
    client
  );
  const row = result.rows[0];
  if (!row) throw notFound("User not found");
  return row;
}

async function getUserBySlug(slug, client = null) {
  const result = await query(
    `
      SELECT id, username, display_name, timezone
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [slug],
    client
  );
  return result.rows[0] || null;
}

async function listEventTypesForUser(userId, client = null) {
  const result = await query(
    `
      SELECT id, title, slug, duration_minutes, location_type
      FROM event_types
      WHERE user_id = $1
      ORDER BY created_at ASC
    `,
    [userId],
    client
  );
  return result.rows.map(mapEventTypeRow);
}

async function slugExists(slug, exceptPageId = null, client = null) {
  const params = [slug];
  let where = "slug = $1";
  if (exceptPageId) {
    params.push(exceptPageId);
    where += " AND id <> $2";
  }
  const result = await query(
    `
      SELECT 1
      FROM booking_pages
      WHERE ${where}
      LIMIT 1
    `,
    params,
    client
  );
  return Boolean(result.rows[0]);
}

async function createUniqueSlug(baseSlug, exceptPageId = null, client = null) {
  const base = assertSlug(baseSlug, "slug");
  if (!(await slugExists(base, exceptPageId, client))) return base;

  for (let index = 0; index < 40; index += 1) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await slugExists(candidate, exceptPageId, client))) return candidate;
  }
  throw badRequest("Could not create a unique slug. Try another slug.");
}

async function ensurePageVersions(pageId, config, client = null) {
  const normalized = normalizeConfig(config, config);
  await query(
    `
      INSERT INTO booking_page_versions (booking_page_id, status, version_number, config_json)
      VALUES ($1, 'draft', 1, $2::jsonb)
      ON CONFLICT (booking_page_id, status)
      DO NOTHING
    `,
    [pageId, JSON.stringify(normalized)],
    client
  );
  await query(
    `
      INSERT INTO booking_page_versions (booking_page_id, status, version_number, config_json)
      VALUES ($1, 'published', 1, $2::jsonb)
      ON CONFLICT (booking_page_id, status)
      DO NOTHING
    `,
    [pageId, JSON.stringify(normalized)],
    client
  );
}

async function createStarterCatalogIfNeeded(userId, client = null) {
  if (!client) {
    return withTransaction(async (tx) => createStarterCatalogIfNeeded(userId, tx));
  }

  await query(`SELECT pg_advisory_xact_lock(hashtext($1::text))`, [String(userId)], client);

  const categoryCountResult = await query(
    `SELECT COUNT(*)::int AS count FROM service_categories WHERE user_id = $1`,
    [userId],
    client
  );
  const serviceCountResult = await query(
    `SELECT COUNT(*)::int AS count FROM services WHERE user_id = $1`,
    [userId],
    client
  );

  const categoryCount = Number(categoryCountResult.rows[0]?.count || 0);
  const serviceCount = Number(serviceCountResult.rows[0]?.count || 0);

  if (categoryCount > 0 || serviceCount > 0) return;

  const eventTypes = await listEventTypesForUser(userId, client);
  const categoryNames = ["Wigs", "Braids", "Treatments", "Nails"];

  const categoryIds = [];
  for (let index = 0; index < categoryNames.length; index += 1) {
    const created = await query(
      `
        INSERT INTO service_categories (user_id, name, sort_order, is_active)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (user_id, name)
        DO UPDATE SET
          sort_order = EXCLUDED.sort_order,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id
      `,
      [userId, categoryNames[index], index],
      client
    );
    categoryIds.push(created.rows[0].id);
  }

  const samples = [
    {
      categoryIndex: 0,
      name: "Lace Front Install",
      description: "Professional adhesive application and natural styling.",
      priceCents: 15000,
      durationMinutes: 150,
    },
    {
      categoryIndex: 0,
      name: "Full Custom Wig",
      description: "Custom unit tailored to your measurements and finish.",
      priceCents: 25000,
      durationMinutes: 180,
    },
    {
      categoryIndex: 1,
      name: "Knotless Braids",
      description: "Comfortable knotless braids with clean sectioning.",
      priceCents: 18000,
      durationMinutes: 210,
    },
    {
      categoryIndex: 2,
      name: "Deep Conditioning",
      description: "Hydration treatment to restore shine and strength.",
      priceCents: 8500,
      durationMinutes: 90,
    },
  ];

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const fallbackEvent = eventTypes[index % (eventTypes.length || 1)] || null;

    await query(
      `
        INSERT INTO services (
          user_id,
          category_id,
          event_type_id,
          name,
          description,
          price_cents,
          duration_minutes,
          image_url,
          is_active,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, '', TRUE, $8)
      `,
      [
        userId,
        categoryIds[sample.categoryIndex] || null,
        fallbackEvent ? fallbackEvent.id : null,
        sample.name,
        sample.description,
        sample.priceCents,
        sample.durationMinutes,
        index,
      ],
      client
    );
  }

  const reviews = [
    {
      name: "Arielle M.",
      rating: 5,
      text: "Incredible service and perfect styling. Booking was effortless.",
    },
    {
      name: "Nia T.",
      rating: 5,
      text: "The results were exactly what I asked for. Highly recommended.",
    },
    {
      name: "Jasmine R.",
      rating: 4,
      text: "Friendly team, premium experience, and great attention to detail.",
    },
  ];

  for (let index = 0; index < reviews.length; index += 1) {
    const item = reviews[index];
    await query(
      `
        INSERT INTO reviews (user_id, name, rating, text, avatar_url, sort_order)
        VALUES ($1, $2, $3, $4, '', $5)
      `,
      [userId, item.name, item.rating, item.text, index],
      client
    );
  }
}

async function ensureDefaultPageForUser(userId, client = null) {
  const pagesResult = await query(
    `
      SELECT id, user_id, slug, title, created_at, updated_at
      FROM booking_pages
      WHERE user_id = $1
      ORDER BY created_at ASC
    `,
    [userId],
    client
  );

  if (pagesResult.rows.length) {
    return pagesResult.rows[0];
  }

  const user = await getUser(userId, client);
  const baseSlug = slugify(user.username || `${user.display_name}-landing`) || "landing";
  const slug = await createUniqueSlug(baseSlug, null, client);

  const title = `${safeText(user.display_name, "My", 120)} landing page`;
  const inserted = await query(
    `
      INSERT INTO booking_pages (user_id, slug, title)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, slug, title, created_at, updated_at
    `,
    [userId, slug, title],
    client
  );

  const page = inserted.rows[0];
  await createStarterCatalogIfNeeded(userId, client);

  const starter = buildStarterConfig({
    presetId: "luxe",
    businessName: user.display_name,
  });
  await ensurePageVersions(page.id, starter, client);

  return page;
}

async function resolvePageForUser(userId, pageId, client = null) {
  const id = safeText(pageId, "", 80);
  if (!id || id === "default") {
    return ensureDefaultPageForUser(userId, client);
  }

  const result = await query(
    `
      SELECT id, user_id, slug, title, created_at, updated_at
      FROM booking_pages
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [id, userId],
    client
  );
  const row = result.rows[0];
  if (!row) throw notFound("Landing page not found");
  return row;
}

async function loadVersionRows(pageId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        booking_page_id,
        status,
        version_number,
        config_json,
        created_at,
        updated_at
      FROM booking_page_versions
      WHERE booking_page_id = $1
      ORDER BY status ASC
    `,
    [pageId],
    client
  );

  const map = new Map(result.rows.map((row) => [row.status, row]));
  return {
    draft: map.get("draft") || null,
    published: map.get("published") || null,
  };
}

async function loadHistoryRows(pageId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        source_status,
        version_number,
        config_json,
        created_at
      FROM booking_page_version_history
      WHERE booking_page_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [pageId, HISTORY_LIMIT],
    client
  );

  return result.rows.map((row) => ({
    id: row.id,
    sourceStatus: row.source_status,
    versionNumber: Number(row.version_number) || 1,
    config: row.config_json,
    createdAt: row.created_at,
  }));
}

async function trimHistory(pageId, client = null) {
  await query(
    `
      DELETE FROM booking_page_version_history
      WHERE id IN (
        SELECT id
        FROM booking_page_version_history
        WHERE booking_page_id = $1
        ORDER BY created_at DESC
        OFFSET $2
      )
    `,
    [pageId, HISTORY_LIMIT],
    client
  );
}

async function fetchCategoriesForUser(userId, client = null) {
  const result = await query(
    `
      SELECT
        c.id,
        c.user_id,
        c.name,
        c.sort_order,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(s.id)::int AS service_count
      FROM service_categories c
      LEFT JOIN services s ON s.category_id = c.id AND s.is_active = TRUE
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.created_at ASC
    `,
    [userId],
    client
  );
  return result.rows.map(mapCategoryRow);
}

async function fetchServicesForUser(userId, username = "", client = null) {
  const result = await query(
    `
      SELECT
        s.id,
        s.user_id,
        s.category_id,
        c.name AS category_name,
        s.event_type_id,
        et.slug AS event_type_slug,
        s.name,
        s.description,
        s.price_cents,
        s.duration_minutes,
        s.image_url,
        s.is_active,
        s.sort_order,
        s.created_at,
        s.updated_at
      FROM services s
      LEFT JOIN service_categories c ON c.id = s.category_id
      LEFT JOIN event_types et ON et.id = s.event_type_id
      WHERE s.user_id = $1
      ORDER BY s.sort_order ASC, s.created_at ASC
    `,
    [userId],
    client
  );
  return result.rows.map((row) => mapServiceRow(row, username));
}

async function fetchReviewsForUser(userId, client = null) {
  const result = await query(
    `
      SELECT
        r.id,
        r.user_id,
        r.service_id,
        s.name AS service_name,
        r.name,
        r.rating,
        r.text,
        r.avatar_url,
        r.sort_order,
        r.created_at,
        r.updated_at
      FROM reviews r
      LEFT JOIN services s ON s.id = r.service_id
      WHERE r.user_id = $1
      ORDER BY r.sort_order ASC, r.created_at DESC
    `,
    [userId],
    client
  );
  return result.rows.map(mapReviewRow);
}

function ensureCategorySelection(config, categories) {
  const normalized = normalizeConfig(config, config);
  const categoryIds = categories.map((item) => item.id);

  normalized.sections = normalized.sections.map((section) => {
    if (section.type !== "servicesMenu") return section;
    const selected = Array.isArray(section.settings.categoryIds)
      ? section.settings.categoryIds.filter((id) => categoryIds.includes(id))
      : [];

    return {
      ...section,
      settings: {
        ...section.settings,
        categoryIds: selected.length ? selected : categoryIds,
      },
    };
  });

  return normalized;
}

function buildBundlePayload({ page, user, draftConfig, publishedConfig, history, categories, services, reviews, eventTypes, saveState }) {
  return {
    page: {
      ...mapPageRow(page, user),
      username: user.username,
      businessName: user.display_name,
      timezone: user.timezone,
      shareUrl: `/${page.slug}`,
      bookUrl: `/book/${page.slug}`,
      editorUrl: `/dashboard/landing-page/${page.id}/editor`,
    },
    draftConfig,
    publishedConfig,
    history,
    categories,
    services,
    reviews,
    eventTypes,
    presets: mapPresetList(),
    sectionLibrary: sectionLibraryList(),
    saveState,
  };
}

async function listPagesForUser(userId) {
  return withTransaction(async (client) => {
    const user = await getUser(userId, client);
    await ensureDefaultPageForUser(userId, client);
    const result = await query(
      `
        SELECT id, user_id, slug, title, created_at, updated_at
        FROM booking_pages
        WHERE user_id = $1
        ORDER BY created_at ASC
      `,
      [userId],
      client
    );

    return result.rows.map((row) => ({
      ...mapPageRow(row, user),
      editorUrl: `/dashboard/landing-page/${row.id}/editor`,
      shareUrl: `/${row.slug}`,
      bookUrl: `/book/${row.slug}`,
    }));
  });
}

async function createPageForUser(userId, payload = {}) {
  return withTransaction(async (client) => {
    const user = await getUser(userId, client);
    const title = assertOptionalString(payload.title, "title", { max: 160 }) || "Landing page";
    const preset = safeText(payload.preset, "luxe", 40);

    const requestedSlug = assertOptionalString(payload.slug, "slug", { max: 80 });
    const baseSlug = requestedSlug
      ? assertSlug(requestedSlug, "slug")
      : slugify(title) || slugify(`${user.username}-landing`) || "landing";
    const slug = await createUniqueSlug(baseSlug, null, client);

    const inserted = await query(
      `
        INSERT INTO booking_pages (user_id, slug, title)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, slug, title, created_at, updated_at
      `,
      [userId, slug, title],
      client
    );

    const page = inserted.rows[0];
    await createStarterCatalogIfNeeded(userId, client);

    const config = buildStarterConfig({
      presetId: PRESET_DEFINITIONS[preset] ? preset : "luxe",
      businessName: user.display_name,
    });
    await ensurePageVersions(page.id, config, client);

    return {
      page: {
        ...mapPageRow(page, user),
        editorUrl: `/dashboard/landing-page/${page.id}/editor`,
        shareUrl: `/${page.slug}`,
        bookUrl: `/book/${page.slug}`,
      },
    };
  });
}

async function getPageDraftByIdForUser(userId, pageId) {
  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUser(userId, client);
    await createStarterCatalogIfNeeded(userId, client);

    const categories = await fetchCategoriesForUser(userId, client);
    const services = await fetchServicesForUser(userId, user.username, client);
    const reviews = await fetchReviewsForUser(userId, client);
    const eventTypes = await listEventTypesForUser(userId, client);

    const fallback = buildStarterConfig({
      presetId: "luxe",
      businessName: user.display_name,
    });

    const versions = await loadVersionRows(page.id, client);
    await ensurePageVersions(page.id, fallback, client);

    const draftConfig = ensureCategorySelection(
      normalizeConfig(versions.draft?.config_json, fallback),
      categories
    );
    const publishedConfig = ensureCategorySelection(
      normalizeConfig(versions.published?.config_json, fallback),
      categories
    );

    const history = await loadHistoryRows(page.id, client);

    return buildBundlePayload({
      page,
      user,
      draftConfig,
      publishedConfig,
      history,
      categories,
      services,
      reviews,
      eventTypes,
      saveState: "saved",
    });
  });
}

async function updatePageDraftByIdForUser(userId, pageId, payload = {}) {
  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUser(userId, client);

    const versions = await loadVersionRows(page.id, client);
    const fallback = buildStarterConfig({
      presetId: "luxe",
      businessName: user.display_name,
    });

    let nextTitle = page.title;
    let nextSlug = page.slug;

    const requestedTitle = assertOptionalString(payload.title, "title", { max: 160 });
    if (requestedTitle) {
      nextTitle = requestedTitle;
    }

    const requestedSlug = assertOptionalString(payload.slug, "slug", { max: 80 });
    if (requestedSlug) {
      const normalizedRequestedSlug = assertSlug(requestedSlug, "slug");
      nextSlug = await createUniqueSlug(normalizedRequestedSlug, page.id, client);
    }

    if (nextTitle !== page.title || nextSlug !== page.slug) {
      const updatedPage = await query(
        `
          UPDATE booking_pages
          SET title = $1, slug = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING id, user_id, slug, title, created_at, updated_at
        `,
        [nextTitle, nextSlug, page.id],
        client
      );
      page.id = updatedPage.rows[0].id;
      page.user_id = updatedPage.rows[0].user_id;
      page.slug = updatedPage.rows[0].slug;
      page.title = updatedPage.rows[0].title;
      page.created_at = updatedPage.rows[0].created_at;
      page.updated_at = updatedPage.rows[0].updated_at;
    }

    await createStarterCatalogIfNeeded(userId, client);

    const categories = await fetchCategoriesForUser(userId, client);
    const services = await fetchServicesForUser(userId, user.username, client);
    const reviews = await fetchReviewsForUser(userId, client);
    const eventTypes = await listEventTypesForUser(userId, client);

    const currentDraftConfig = normalizeConfig(versions.draft?.config_json, fallback);
    const payloadConfig =
      payload && typeof payload === "object" && payload.config && typeof payload.config === "object"
        ? payload.config
        : payload;

    const nextConfig = ensureCategorySelection(
      normalizeConfig(payloadConfig, currentDraftConfig),
      categories
    );
    const nextVersionNumber = (Number(versions.draft?.version_number) || 1) + 1;

    await query(
      `
        UPDATE booking_page_versions
        SET
          config_json = $1::jsonb,
          version_number = $2,
          updated_at = NOW()
        WHERE booking_page_id = $3
          AND status = 'draft'
      `,
      [JSON.stringify(nextConfig), nextVersionNumber, page.id],
      client
    );

    await query(
      `
        INSERT INTO booking_page_version_history (
          booking_page_id,
          source_status,
          version_number,
          config_json
        )
        VALUES ($1, 'draft', $2, $3::jsonb)
      `,
      [page.id, nextVersionNumber, JSON.stringify(nextConfig)],
      client
    );

    await trimHistory(page.id, client);

    const history = await loadHistoryRows(page.id, client);

    return buildBundlePayload({
      page,
      user,
      draftConfig: nextConfig,
      publishedConfig: normalizeConfig(versions.published?.config_json, fallback),
      history,
      categories,
      services,
      reviews,
      eventTypes,
      saveState: "saved",
    });
  });
}

async function publishPageByIdForUser(userId, pageId) {
  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUser(userId, client);

    await createStarterCatalogIfNeeded(userId, client);

    const categories = await fetchCategoriesForUser(userId, client);
    const services = await fetchServicesForUser(userId, user.username, client);
    const reviews = await fetchReviewsForUser(userId, client);
    const eventTypes = await listEventTypesForUser(userId, client);

    const versions = await loadVersionRows(page.id, client);
    const fallback = buildStarterConfig({
      presetId: "luxe",
      businessName: user.display_name,
    });

    const nextConfig = ensureCategorySelection(
      normalizeConfig(versions.draft?.config_json, fallback),
      categories
    );
    const nextVersionNumber = (Number(versions.published?.version_number) || 1) + 1;

    await query(
      `
        INSERT INTO booking_page_versions (
          booking_page_id,
          status,
          version_number,
          config_json,
          created_at,
          updated_at
        )
        VALUES ($1, 'published', $2, $3::jsonb, NOW(), NOW())
        ON CONFLICT (booking_page_id, status)
        DO UPDATE SET
          version_number = EXCLUDED.version_number,
          config_json = EXCLUDED.config_json,
          updated_at = NOW()
      `,
      [page.id, nextVersionNumber, JSON.stringify(nextConfig)],
      client
    );

    await query(
      `
        INSERT INTO booking_page_version_history (
          booking_page_id,
          source_status,
          version_number,
          config_json
        )
        VALUES ($1, 'published', $2, $3::jsonb)
      `,
      [page.id, nextVersionNumber, JSON.stringify(nextConfig)],
      client
    );

    await trimHistory(page.id, client);
    const history = await loadHistoryRows(page.id, client);

    return buildBundlePayload({
      page,
      user,
      draftConfig: nextConfig,
      publishedConfig: nextConfig,
      history,
      categories,
      services,
      reviews,
      eventTypes,
      saveState: "published",
    });
  });
}

async function restorePageVersionByHistoryIdForUser(userId, pageId, historyId) {
  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUser(userId, client);

    const historyRowResult = await query(
      `
        SELECT id, config_json
        FROM booking_page_version_history
        WHERE id = $1
          AND booking_page_id = $2
        LIMIT 1
      `,
      [historyId, page.id],
      client
    );
    const historyRow = historyRowResult.rows[0];
    if (!historyRow) throw notFound("Version history entry not found");

    await createStarterCatalogIfNeeded(userId, client);

    const categories = await fetchCategoriesForUser(userId, client);
    const services = await fetchServicesForUser(userId, user.username, client);
    const reviews = await fetchReviewsForUser(userId, client);
    const eventTypes = await listEventTypesForUser(userId, client);

    const versions = await loadVersionRows(page.id, client);
    const fallback = buildStarterConfig({
      presetId: "luxe",
      businessName: user.display_name,
    });

    const restoredConfig = ensureCategorySelection(
      normalizeConfig(historyRow.config_json, fallback),
      categories
    );
    const nextVersionNumber = (Number(versions.draft?.version_number) || 1) + 1;

    await query(
      `
        UPDATE booking_page_versions
        SET
          config_json = $1::jsonb,
          version_number = $2,
          updated_at = NOW()
        WHERE booking_page_id = $3
          AND status = 'draft'
      `,
      [JSON.stringify(restoredConfig), nextVersionNumber, page.id],
      client
    );

    await query(
      `
        INSERT INTO booking_page_version_history (
          booking_page_id,
          source_status,
          version_number,
          config_json
        )
        VALUES ($1, 'draft', $2, $3::jsonb)
      `,
      [page.id, nextVersionNumber, JSON.stringify(restoredConfig)],
      client
    );

    await trimHistory(page.id, client);
    const history = await loadHistoryRows(page.id, client);

    return buildBundlePayload({
      page,
      user,
      draftConfig: restoredConfig,
      publishedConfig: normalizeConfig(versions.published?.config_json, fallback),
      history,
      categories,
      services,
      reviews,
      eventTypes,
      saveState: "restored",
    });
  });
}

async function findPageBySlugOrUsername(slug, client = null) {
  const bySlug = await query(
    `
      SELECT
        bp.id,
        bp.user_id,
        bp.slug,
        bp.title,
        bp.created_at,
        bp.updated_at,
        u.username,
        u.display_name,
        u.timezone
      FROM booking_pages bp
      JOIN users u ON u.id = bp.user_id
      WHERE bp.slug = $1
      ORDER BY bp.updated_at DESC
      LIMIT 1
    `,
    [slug],
    client
  );

  if (bySlug.rows[0]) return bySlug.rows[0];

  const user = await getUserBySlug(slug, client);
  if (!user) return null;

  const byUsername = await query(
    `
      SELECT
        bp.id,
        bp.user_id,
        bp.slug,
        bp.title,
        bp.created_at,
        bp.updated_at,
        $2::text AS username,
        $3::text AS display_name,
        $4::text AS timezone
      FROM booking_pages bp
      WHERE bp.user_id = $1
      ORDER BY bp.updated_at DESC
      LIMIT 1
    `,
    [user.id, user.username, user.display_name, user.timezone],
    client
  );

  return byUsername.rows[0] || null;
}

async function getPublishedPageBySlug(slugValue) {
  const slug = assertSlug(slugValue, "slug");

  return withTransaction(async (client) => {
    const page = await findPageBySlugOrUsername(slug, client);
    if (!page) throw notFound("Published landing page not found");

    const versionResult = await query(
      `
        SELECT config_json
        FROM booking_page_versions
        WHERE booking_page_id = $1
          AND status = 'published'
        LIMIT 1
      `,
      [page.id],
      client
    );
    if (!versionResult.rows[0]) throw notFound("Published landing page not found");

    await createStarterCatalogIfNeeded(page.user_id, client);

    const categories = await fetchCategoriesForUser(page.user_id, client);
    const services = (await fetchServicesForUser(page.user_id, page.username, client)).filter(
      (item) => item.isActive
    );
    const reviews = await fetchReviewsForUser(page.user_id, client);

    const fallback = buildStarterConfig({
      presetId: "luxe",
      businessName: page.display_name,
    });

    const config = ensureCategorySelection(
      normalizeConfig(versionResult.rows[0].config_json, fallback),
      categories
    );

    return {
      page: {
        id: page.id,
        userId: page.user_id,
        slug: page.slug,
        title: page.title,
        username: page.username,
        businessName: page.display_name,
        timezone: page.timezone,
        shareUrl: `/${page.slug}`,
        bookUrl: `/book/${page.slug}`,
        createdAt: page.created_at,
        updatedAt: page.updated_at,
      },
      config,
      categories,
      services,
      reviews,
      generatedAt: new Date().toISOString(),
    };
  });
}

async function assertCategoryOwnership(userId, categoryId, client = null) {
  const safeCategoryId = assertString(categoryId, "categoryId", { min: 6, max: 80 });
  const result = await query(
    `
      SELECT id
      FROM service_categories
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [safeCategoryId, userId],
    client
  );
  if (!result.rows[0]) throw badRequest("categoryId is invalid");
  return safeCategoryId;
}

async function assertServiceOwnership(userId, serviceId, client = null) {
  const safeServiceId = assertString(serviceId, "serviceId", { min: 6, max: 80 });
  const result = await query(
    `
      SELECT id
      FROM services
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [safeServiceId, userId],
    client
  );
  if (!result.rows[0]) throw badRequest("serviceId is invalid");
  return safeServiceId;
}

async function assertReviewOwnership(userId, reviewId, client = null) {
  const safeReviewId = assertString(reviewId, "reviewId", { min: 6, max: 80 });
  const result = await query(
    `
      SELECT id
      FROM reviews
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [safeReviewId, userId],
    client
  );
  if (!result.rows[0]) throw badRequest("reviewId is invalid");
  return safeReviewId;
}

async function assertEventTypeOwnership(userId, eventTypeId, client = null) {
  if (!eventTypeId) return null;
  const safeEventTypeId = assertString(eventTypeId, "eventTypeId", { min: 6, max: 80 });
  const result = await query(
    `
      SELECT id
      FROM event_types
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [safeEventTypeId, userId],
    client
  );
  if (!result.rows[0]) throw badRequest("eventTypeId is invalid");
  return safeEventTypeId;
}

function parsePriceCents(value, field = "priceCents") {
  if (value === undefined || value === null || value === "") return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 999999 && Number.isInteger(value)) return Math.max(0, value);
    return Math.max(0, Math.round(value * 100));
  }

  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) && !/^\d+$/.test(normalized)) {
    throw badRequest(`${field} is invalid`);
  }

  if (normalized.includes(".")) {
    return Math.max(0, Math.round(Number(normalized) * 100));
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw badRequest(`${field} is invalid`);
  return Math.max(0, Math.round(parsed));
}

async function listCategoriesForUser(userId) {
  await createStarterCatalogIfNeeded(userId);
  return fetchCategoriesForUser(userId);
}

async function createCategoryForUser(userId, payload = {}) {
  return withTransaction(async (client) => {
    const name = assertString(payload.name, "name", { min: 2, max: 80 });
    const sortOrder = payload.sortOrder === undefined
      ? 0
      : assertInteger(payload.sortOrder, "sortOrder", { min: 0, max: 9999 });

    const inserted = await query(
      `
        INSERT INTO service_categories (user_id, name, sort_order, is_active)
        VALUES ($1, $2, $3, TRUE)
        RETURNING id, user_id, name, sort_order, is_active, created_at, updated_at
      `,
      [userId, name, sortOrder],
      client
    );

    return mapCategoryRow(inserted.rows[0]);
  });
}

async function updateCategoryForUser(userId, categoryId, payload = {}) {
  return withTransaction(async (client) => {
    const safeCategoryId = await assertCategoryOwnership(userId, categoryId, client);

    const currentResult = await query(
      `
        SELECT id, user_id, name, sort_order, is_active, created_at, updated_at
        FROM service_categories
        WHERE id = $1
        LIMIT 1
      `,
      [safeCategoryId],
      client
    );
    const current = currentResult.rows[0];

    const nextName = payload.name === undefined
      ? current.name
      : assertString(payload.name, "name", { min: 2, max: 80 });
    const nextSortOrder = payload.sortOrder === undefined
      ? Number(current.sort_order) || 0
      : assertInteger(payload.sortOrder, "sortOrder", { min: 0, max: 9999 });
    const nextIsActive = payload.isActive === undefined
      ? !!current.is_active
      : Boolean(payload.isActive);

    const updated = await query(
      `
        UPDATE service_categories
        SET
          name = $1,
          sort_order = $2,
          is_active = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING id, user_id, name, sort_order, is_active, created_at, updated_at
      `,
      [nextName, nextSortOrder, nextIsActive, safeCategoryId],
      client
    );

    return mapCategoryRow(updated.rows[0]);
  });
}

async function deleteCategoryForUser(userId, categoryId) {
  return withTransaction(async (client) => {
    const safeCategoryId = await assertCategoryOwnership(userId, categoryId, client);
    await query(
      `
        DELETE FROM service_categories
        WHERE id = $1
      `,
      [safeCategoryId],
      client
    );
    return { deleted: true };
  });
}

async function listServicesForUser(userId) {
  const user = await getUser(userId);
  await createStarterCatalogIfNeeded(userId);
  return fetchServicesForUser(userId, user.username);
}

async function createServiceForUser(userId, payload = {}) {
  return withTransaction(async (client) => {
    const user = await getUser(userId, client);

    const name = assertString(payload.name, "name", { min: 2, max: 120 });
    const description = assertOptionalString(payload.description, "description", { max: 2000 });
    const priceCents = parsePriceCents(payload.priceCents ?? payload.price, "priceCents");
    const durationMinutes = payload.durationMinutes === undefined
      ? 30
      : assertInteger(payload.durationMinutes, "durationMinutes", { min: 5, max: 1440 });
    const imageUrl = assertOptionalString(payload.imageUrl, "imageUrl", { max: 2000 });
    const sortOrder = payload.sortOrder === undefined
      ? 0
      : assertInteger(payload.sortOrder, "sortOrder", { min: 0, max: 9999 });

    const categoryId = payload.categoryId
      ? await assertCategoryOwnership(userId, payload.categoryId, client)
      : null;
    const eventTypeId = payload.eventTypeId
      ? await assertEventTypeOwnership(userId, payload.eventTypeId, client)
      : null;

    const inserted = await query(
      `
        INSERT INTO services (
          user_id,
          category_id,
          event_type_id,
          name,
          description,
          price_cents,
          duration_minutes,
          image_url,
          is_active,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
        RETURNING
          id,
          user_id,
          category_id,
          event_type_id,
          name,
          description,
          price_cents,
          duration_minutes,
          image_url,
          is_active,
          sort_order,
          created_at,
          updated_at
      `,
      [
        userId,
        categoryId,
        eventTypeId,
        name,
        description,
        priceCents,
        durationMinutes,
        imageUrl,
        sortOrder,
      ],
      client
    );

    const row = inserted.rows[0];

    const hydrated = await query(
      `
        SELECT
          s.id,
          s.user_id,
          s.category_id,
          c.name AS category_name,
          s.event_type_id,
          et.slug AS event_type_slug,
          s.name,
          s.description,
          s.price_cents,
          s.duration_minutes,
          s.image_url,
          s.is_active,
          s.sort_order,
          s.created_at,
          s.updated_at
        FROM services s
        LEFT JOIN service_categories c ON c.id = s.category_id
        LEFT JOIN event_types et ON et.id = s.event_type_id
        WHERE s.id = $1
        LIMIT 1
      `,
      [row.id],
      client
    );

    return mapServiceRow(hydrated.rows[0], user.username);
  });
}

async function updateServiceForUser(userId, serviceId, payload = {}) {
  return withTransaction(async (client) => {
    const safeServiceId = await assertServiceOwnership(userId, serviceId, client);
    const user = await getUser(userId, client);

    const currentResult = await query(
      `
        SELECT
          id,
          user_id,
          category_id,
          event_type_id,
          name,
          description,
          price_cents,
          duration_minutes,
          image_url,
          is_active,
          sort_order,
          created_at,
          updated_at
        FROM services
        WHERE id = $1
        LIMIT 1
      `,
      [safeServiceId],
      client
    );
    const current = currentResult.rows[0];

    const categoryId = payload.categoryId === undefined
      ? current.category_id
      : payload.categoryId
        ? await assertCategoryOwnership(userId, payload.categoryId, client)
        : null;
    const eventTypeId = payload.eventTypeId === undefined
      ? current.event_type_id
      : payload.eventTypeId
        ? await assertEventTypeOwnership(userId, payload.eventTypeId, client)
        : null;

    const next = {
      name: payload.name === undefined
        ? current.name
        : assertString(payload.name, "name", { min: 2, max: 120 }),
      description: payload.description === undefined
        ? current.description
        : assertOptionalString(payload.description, "description", { max: 2000 }),
      priceCents: payload.priceCents === undefined && payload.price === undefined
        ? Number(current.price_cents) || 0
        : parsePriceCents(payload.priceCents ?? payload.price, "priceCents"),
      durationMinutes: payload.durationMinutes === undefined
        ? Number(current.duration_minutes) || 30
        : assertInteger(payload.durationMinutes, "durationMinutes", { min: 5, max: 1440 }),
      imageUrl: payload.imageUrl === undefined
        ? current.image_url || ""
        : assertOptionalString(payload.imageUrl, "imageUrl", { max: 2000 }),
      isActive: payload.isActive === undefined
        ? !!current.is_active
        : Boolean(payload.isActive),
      sortOrder: payload.sortOrder === undefined
        ? Number(current.sort_order) || 0
        : assertInteger(payload.sortOrder, "sortOrder", { min: 0, max: 9999 }),
    };

    await query(
      `
        UPDATE services
        SET
          category_id = $1,
          event_type_id = $2,
          name = $3,
          description = $4,
          price_cents = $5,
          duration_minutes = $6,
          image_url = $7,
          is_active = $8,
          sort_order = $9,
          updated_at = NOW()
        WHERE id = $10
      `,
      [
        categoryId,
        eventTypeId,
        next.name,
        next.description,
        next.priceCents,
        next.durationMinutes,
        next.imageUrl,
        next.isActive,
        next.sortOrder,
        safeServiceId,
      ],
      client
    );

    const hydrated = await query(
      `
        SELECT
          s.id,
          s.user_id,
          s.category_id,
          c.name AS category_name,
          s.event_type_id,
          et.slug AS event_type_slug,
          s.name,
          s.description,
          s.price_cents,
          s.duration_minutes,
          s.image_url,
          s.is_active,
          s.sort_order,
          s.created_at,
          s.updated_at
        FROM services s
        LEFT JOIN service_categories c ON c.id = s.category_id
        LEFT JOIN event_types et ON et.id = s.event_type_id
        WHERE s.id = $1
        LIMIT 1
      `,
      [safeServiceId],
      client
    );

    return mapServiceRow(hydrated.rows[0], user.username);
  });
}

async function deleteServiceForUser(userId, serviceId) {
  return withTransaction(async (client) => {
    const safeServiceId = await assertServiceOwnership(userId, serviceId, client);
    await query(
      `
        DELETE FROM services
        WHERE id = $1
      `,
      [safeServiceId],
      client
    );
    return { deleted: true };
  });
}

async function listReviewsForUser(userId) {
  await createStarterCatalogIfNeeded(userId);
  return fetchReviewsForUser(userId);
}

async function createReviewForUser(userId, payload = {}) {
  return withTransaction(async (client) => {
    const name = assertString(payload.name, "name", { min: 2, max: 120 });
    const rating = assertInteger(payload.rating ?? 5, "rating", { min: 1, max: 5 });
    const text = assertString(payload.text, "text", { min: 2, max: 3000 });
    const avatarUrl = assertOptionalString(payload.avatarUrl, "avatarUrl", { max: 2000 });
    const sortOrder = payload.sortOrder === undefined
      ? 0
      : assertInteger(payload.sortOrder, "sortOrder", { min: 0, max: 9999 });
    const serviceId = payload.serviceId
      ? await assertServiceOwnership(userId, payload.serviceId, client)
      : null;

    const inserted = await query(
      `
        INSERT INTO reviews (
          user_id,
          service_id,
          name,
          rating,
          text,
          avatar_url,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          user_id,
          service_id,
          name,
          rating,
          text,
          avatar_url,
          sort_order,
          created_at,
          updated_at
      `,
      [userId, serviceId, name, rating, text, avatarUrl, sortOrder],
      client
    );

    const hydrated = await query(
      `
        SELECT
          r.id,
          r.user_id,
          r.service_id,
          s.name AS service_name,
          r.name,
          r.rating,
          r.text,
          r.avatar_url,
          r.sort_order,
          r.created_at,
          r.updated_at
        FROM reviews r
        LEFT JOIN services s ON s.id = r.service_id
        WHERE r.id = $1
        LIMIT 1
      `,
      [inserted.rows[0].id],
      client
    );

    return mapReviewRow(hydrated.rows[0]);
  });
}

async function updateReviewForUser(userId, reviewId, payload = {}) {
  return withTransaction(async (client) => {
    const safeReviewId = await assertReviewOwnership(userId, reviewId, client);

    const currentResult = await query(
      `
        SELECT
          id,
          user_id,
          service_id,
          name,
          rating,
          text,
          avatar_url,
          sort_order,
          created_at,
          updated_at
        FROM reviews
        WHERE id = $1
        LIMIT 1
      `,
      [safeReviewId],
      client
    );
    const current = currentResult.rows[0];

    const nextServiceId = payload.serviceId === undefined
      ? current.service_id
      : payload.serviceId
        ? await assertServiceOwnership(userId, payload.serviceId, client)
        : null;

    const next = {
      name: payload.name === undefined
        ? current.name
        : assertString(payload.name, "name", { min: 2, max: 120 }),
      rating: payload.rating === undefined
        ? Number(current.rating) || 5
        : assertInteger(payload.rating, "rating", { min: 1, max: 5 }),
      text: payload.text === undefined
        ? current.text
        : assertString(payload.text, "text", { min: 2, max: 3000 }),
      avatarUrl: payload.avatarUrl === undefined
        ? current.avatar_url || ""
        : assertOptionalString(payload.avatarUrl, "avatarUrl", { max: 2000 }),
      sortOrder: payload.sortOrder === undefined
        ? Number(current.sort_order) || 0
        : assertInteger(payload.sortOrder, "sortOrder", { min: 0, max: 9999 }),
    };

    await query(
      `
        UPDATE reviews
        SET
          service_id = $1,
          name = $2,
          rating = $3,
          text = $4,
          avatar_url = $5,
          sort_order = $6,
          updated_at = NOW()
        WHERE id = $7
      `,
      [
        nextServiceId,
        next.name,
        next.rating,
        next.text,
        next.avatarUrl,
        next.sortOrder,
        safeReviewId,
      ],
      client
    );

    const hydrated = await query(
      `
        SELECT
          r.id,
          r.user_id,
          r.service_id,
          s.name AS service_name,
          r.name,
          r.rating,
          r.text,
          r.avatar_url,
          r.sort_order,
          r.created_at,
          r.updated_at
        FROM reviews r
        LEFT JOIN services s ON s.id = r.service_id
        WHERE r.id = $1
        LIMIT 1
      `,
      [safeReviewId],
      client
    );

    return mapReviewRow(hydrated.rows[0]);
  });
}

async function deleteReviewForUser(userId, reviewId) {
  return withTransaction(async (client) => {
    const safeReviewId = await assertReviewOwnership(userId, reviewId, client);
    await query(
      `
        DELETE FROM reviews
        WHERE id = $1
      `,
      [safeReviewId],
      client
    );
    return { deleted: true };
  });
}

module.exports = {
  sectionLibraryList,
  mapPresetList,
  buildStarterConfig,
  normalizeConfig,
  listPagesForUser,
  createPageForUser,
  getPageDraftByIdForUser,
  updatePageDraftByIdForUser,
  publishPageByIdForUser,
  restorePageVersionByHistoryIdForUser,
  getPublishedPageBySlug,
  listCategoriesForUser,
  createCategoryForUser,
  updateCategoryForUser,
  deleteCategoryForUser,
  listServicesForUser,
  createServiceForUser,
  updateServiceForUser,
  deleteServiceForUser,
  listReviewsForUser,
  createReviewForUser,
  updateReviewForUser,
  deleteReviewForUser,
};
