const { DateTime } = require("luxon");
const { query, withTransaction } = require("../db/pool");
const { generatePublicSlots, assertDate, assertZone } = require("./slots.service");
const { createPublicBooking } = require("./bookings.service");
const { badRequest, notFound } = require("../utils/http-error");
const {
  assertOptionalString,
  assertSlug,
  assertString,
  assertEmail,
} = require("../utils/validation");

const HISTORY_LIMIT = 10;
const ALLOWED_SECTION_TYPES = new Set([
  "header",
  "hero",
  "serviceList",
  "bookingWidget",
  "detailsForm",
  "confirmation",
  "policies",
  "footer",
]);

function shortId(prefix = "sec") {
  const seed = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${seed}`;
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function normalizeHexColor(value, fallback = "#1a73e8") {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = String(value).trim();
  const next = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-f]{6}$/i.test(next)) return fallback;
  return next.toLowerCase();
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function safeText(value, fallback = "", max = 5000) {
  if (value === undefined || value === null) return fallback;
  const str = String(value).trim();
  if (!str) return fallback;
  return str.slice(0, max);
}

function mapServiceRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    slug: row.slug,
    durationMinutes: Number(row.duration_minutes) || 30,
    locationType: row.location_type || "google_meet",
    bufferBeforeMin: Number(row.buffer_before_min) || 0,
    bufferAfterMin: Number(row.buffer_after_min) || 0,
    maxBookingsPerDay: Number(row.max_bookings_per_day) || 0,
  };
}

function defaultTheme(brandColor = "#1a73e8") {
  return {
    brandColor,
    surfaceColor: "#ffffff",
    backgroundColor: "#f4f7fb",
    textColor: "#0f1f3c",
    mutedColor: "#5d7396",
    borderColor: "#d8e1ef",
    fontFamily: "Inter",
    radius: 14,
    spacing: 16,
    buttonStyle: "solid",
  };
}

function defaultSections({ businessName, services }) {
  const selectedServiceIds = services.map((item) => item.id);
  return [
    {
      id: "header",
      type: "header",
      visible: true,
      settings: {
        logoUrl: "/assets/scheduling-logo.svg",
        businessName: businessName || "MeetScheduling",
        showNav: false,
      },
    },
    {
      id: "hero",
      type: "hero",
      visible: true,
      settings: {
        badge: "Online scheduling",
        title: `Book time with ${businessName || "our team"}`,
        description:
          "Choose a service, pick a time that works for you, and get instant confirmation.",
      },
    },
    {
      id: "services",
      type: "serviceList",
      visible: true,
      settings: {
        title: "Choose appointment type",
        description: "Select the service you want to book",
        layout: "cards",
        selectedServiceIds,
        showDuration: true,
      },
    },
    {
      id: "booking",
      type: "bookingWidget",
      visible: true,
      settings: {
        title: "Select a date and time",
        showTimezone: true,
        showNextAvailable: true,
        layout: "split",
        dateRangeDays: 60,
        maxAdvanceDays: 60,
        minNoticeMinutes: 0,
      },
    },
    {
      id: "details",
      type: "detailsForm",
      visible: true,
      settings: {
        title: "Enter your details",
        description: "We'll send your confirmation and calendar invite instantly.",
        phoneEnabled: true,
        phoneRequired: false,
        customQuestions: [],
      },
    },
    {
      id: "confirmation",
      type: "confirmation",
      visible: true,
      settings: {
        title: "You're scheduled",
        subtitle: "A confirmation email has been sent.",
        showAddToCalendar: true,
      },
    },
    {
      id: "policies",
      type: "policies",
      visible: true,
      settings: {
        title: "Policies",
        cancellationPolicy:
          "Please cancel or reschedule at least 24 hours before your appointment time.",
        reschedulePolicy:
          "Rescheduling is allowed up to 2 hours before the meeting starts.",
      },
    },
    {
      id: "footer",
      type: "footer",
      visible: true,
      settings: {
        copyright: `© ${new Date().getFullYear()} ${businessName || "MeetScheduling"}`,
        secondaryText: "Secure scheduling powered by MeetScheduling.",
      },
    },
  ];
}

function createDefaultConfig({ businessName, services, brandColor }) {
  return {
    theme: defaultTheme(brandColor || "#1a73e8"),
    sections: defaultSections({ businessName, services }),
  };
}

function normalizeQuestion(item, index) {
  if (!item || typeof item !== "object") {
    return {
      id: shortId("q"),
      label: `Question ${index + 1}`,
      required: false,
      type: "text",
      placeholder: "",
    };
  }
  return {
    id: safeText(item.id, shortId("q"), 80),
    label: safeText(item.label, `Question ${index + 1}`, 140),
    required: normalizeBoolean(item.required, false),
    type: ["text", "textarea"].includes(String(item.type || "").trim())
      ? String(item.type).trim()
      : "text",
    placeholder: safeText(item.placeholder, "", 200),
  };
}

function normalizeSectionSettings(type, value = {}, fallback = {}) {
  const source = value && typeof value === "object" ? value : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};

  switch (type) {
    case "header":
      return {
        logoUrl: safeText(source.logoUrl, base.logoUrl || "", 1000),
        businessName: safeText(source.businessName, base.businessName || "MeetScheduling", 120),
        showNav: normalizeBoolean(source.showNav, normalizeBoolean(base.showNav, false)),
      };
    case "hero":
      return {
        badge: safeText(source.badge, base.badge || "", 80),
        title: safeText(source.title, base.title || "", 180),
        description: safeText(source.description, base.description || "", 600),
      };
    case "serviceList":
      return {
        title: safeText(source.title, base.title || "Choose appointment type", 140),
        description: safeText(source.description, base.description || "", 300),
        layout: ["cards", "list"].includes(String(source.layout || "").trim())
          ? String(source.layout).trim()
          : base.layout || "cards",
        selectedServiceIds: Array.isArray(source.selectedServiceIds)
          ? source.selectedServiceIds
              .map((item) => safeText(item, "", 80))
              .filter(Boolean)
              .slice(0, 30)
          : Array.isArray(base.selectedServiceIds)
            ? base.selectedServiceIds
            : [],
        showDuration: normalizeBoolean(source.showDuration, normalizeBoolean(base.showDuration, true)),
      };
    case "bookingWidget":
      return {
        title: safeText(source.title, base.title || "Select a date and time", 140),
        showTimezone: normalizeBoolean(source.showTimezone, normalizeBoolean(base.showTimezone, true)),
        showNextAvailable: normalizeBoolean(
          source.showNextAvailable,
          normalizeBoolean(base.showNextAvailable, true)
        ),
        layout: ["split", "stacked"].includes(String(source.layout || "").trim())
          ? String(source.layout).trim()
          : base.layout || "split",
        dateRangeDays: clamp(source.dateRangeDays, 14, 180, clamp(base.dateRangeDays, 14, 180, 60)),
        maxAdvanceDays: clamp(
          source.maxAdvanceDays,
          14,
          365,
          clamp(source.dateRangeDays, 14, 365, clamp(base.maxAdvanceDays, 14, 365, 60))
        ),
        minNoticeMinutes: clamp(
          source.minNoticeMinutes,
          0,
          10080,
          clamp(base.minNoticeMinutes, 0, 10080, 0)
        ),
      };
    case "detailsForm":
      return {
        title: safeText(source.title, base.title || "Enter your details", 140),
        description: safeText(source.description, base.description || "", 300),
        phoneEnabled: normalizeBoolean(source.phoneEnabled, normalizeBoolean(base.phoneEnabled, true)),
        phoneRequired: normalizeBoolean(source.phoneRequired, normalizeBoolean(base.phoneRequired, false)),
        customQuestions: Array.isArray(source.customQuestions)
          ? source.customQuestions.slice(0, 10).map(normalizeQuestion)
          : Array.isArray(base.customQuestions)
            ? base.customQuestions.slice(0, 10).map(normalizeQuestion)
            : [],
      };
    case "confirmation":
      return {
        title: safeText(source.title, base.title || "You're scheduled", 140),
        subtitle: safeText(source.subtitle, base.subtitle || "", 300),
        showAddToCalendar: normalizeBoolean(
          source.showAddToCalendar,
          normalizeBoolean(base.showAddToCalendar, true)
        ),
      };
    case "policies":
      return {
        title: safeText(source.title, base.title || "Policies", 120),
        cancellationPolicy: safeText(source.cancellationPolicy, base.cancellationPolicy || "", 1000),
        reschedulePolicy: safeText(source.reschedulePolicy, base.reschedulePolicy || "", 1000),
      };
    case "footer":
      return {
        copyright: safeText(source.copyright, base.copyright || "", 180),
        secondaryText: safeText(source.secondaryText, base.secondaryText || "", 260),
      };
    default:
      return {};
  }
}

function normalizeConfig(inputConfig, fallbackConfig) {
  const fallback = fallbackConfig && typeof fallbackConfig === "object"
    ? fallbackConfig
    : createDefaultConfig({ businessName: "MeetScheduling", services: [] });
  const input = inputConfig && typeof inputConfig === "object" ? inputConfig : {};
  const inputTheme = input.theme && typeof input.theme === "object" ? input.theme : {};
  const baseTheme = fallback.theme && typeof fallback.theme === "object" ? fallback.theme : defaultTheme();

  const theme = {
    brandColor: normalizeHexColor(inputTheme.brandColor, normalizeHexColor(baseTheme.brandColor)),
    surfaceColor: normalizeHexColor(inputTheme.surfaceColor, normalizeHexColor(baseTheme.surfaceColor, "#ffffff")),
    backgroundColor: normalizeHexColor(
      inputTheme.backgroundColor,
      normalizeHexColor(baseTheme.backgroundColor, "#f4f7fb")
    ),
    textColor: normalizeHexColor(inputTheme.textColor, normalizeHexColor(baseTheme.textColor, "#0f1f3c")),
    mutedColor: normalizeHexColor(inputTheme.mutedColor, normalizeHexColor(baseTheme.mutedColor, "#5d7396")),
    borderColor: normalizeHexColor(inputTheme.borderColor, normalizeHexColor(baseTheme.borderColor, "#d8e1ef")),
    fontFamily: ["Inter", "DM Sans", "Sora", "System"].includes(
      safeText(inputTheme.fontFamily, "", 40)
    )
      ? safeText(inputTheme.fontFamily, "Inter", 40)
      : safeText(baseTheme.fontFamily, "Inter", 40),
    radius: clamp(inputTheme.radius, 0, 24, clamp(baseTheme.radius, 0, 24, 14)),
    spacing: clamp(inputTheme.spacing, 8, 32, clamp(baseTheme.spacing, 8, 32, 16)),
    buttonStyle: ["solid", "outline", "soft"].includes(safeText(inputTheme.buttonStyle, "", 20))
      ? safeText(inputTheme.buttonStyle, "solid", 20)
      : safeText(baseTheme.buttonStyle, "solid", 20),
  };

  const baseSections = Array.isArray(fallback.sections) ? fallback.sections : [];
  const incomingSections = Array.isArray(input.sections) ? input.sections : baseSections;
  const normalizedSections = [];
  const usedIds = new Set();

  incomingSections.forEach((section) => {
    if (!section || typeof section !== "object") return;
    const type = safeText(section.type, "", 60);
    if (!ALLOWED_SECTION_TYPES.has(type)) return;
    let id = safeText(section.id, shortId(type), 80);
    if (!id || usedIds.has(id)) id = shortId(type);
    usedIds.add(id);

    const fallbackSection = baseSections.find((item) => item && item.type === type) || {};
    normalizedSections.push({
      id,
      type,
      visible: section.visible === undefined
        ? normalizeBoolean(fallbackSection.visible, true)
        : normalizeBoolean(section.visible, true),
      settings: normalizeSectionSettings(type, section.settings, fallbackSection.settings),
    });
  });

  if (!normalizedSections.length) {
    return {
      theme,
      sections: baseSections.map((item) => ({
        id: safeText(item.id, shortId(item.type || "sec"), 80),
        type: item.type,
        visible: normalizeBoolean(item.visible, true),
        settings: normalizeSectionSettings(item.type, item.settings, item.settings),
      })),
    };
  }

  return { theme, sections: normalizedSections };
}

function toHistoryPayload(row) {
  return {
    id: row.id,
    sourceStatus: row.source_status,
    versionNumber: Number(row.version_number) || 1,
    createdAt: row.created_at,
    config: row.config_json,
  };
}

async function getUserForPageBuilder(userId, client = null) {
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

async function listServicesForUser(userId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        title,
        description,
        slug,
        duration_minutes,
        location_type,
        buffer_before_min,
        buffer_after_min,
        max_bookings_per_day
      FROM event_types
      WHERE user_id = $1
        AND is_active = TRUE
      ORDER BY created_at ASC
    `,
    [userId],
    client
  );
  return result.rows.map(mapServiceRow);
}

async function slugExists(slug, client = null) {
  const result = await query(
    `
      SELECT 1
      FROM booking_pages
      WHERE slug = $1
      LIMIT 1
    `,
    [slug],
    client
  );
  return Boolean(result.rows[0]);
}

async function createUniquePageSlug(baseSlug, client = null) {
  const base = assertSlug(baseSlug, "page slug");
  if (!(await slugExists(base, client))) return base;

  for (let index = 0; index < 30; index += 1) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await slugExists(candidate, client))) return candidate;
  }
  throw badRequest("Could not generate a unique page slug");
}

async function ensureBookingPageForUser(userId, client = null) {
  const user = await getUserForPageBuilder(userId, client);
  const services = await listServicesForUser(userId, client);

  let pageResult = await query(
    `
      SELECT id, user_id, slug, title, created_at, updated_at
      FROM booking_pages
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
    client
  );

  let page = pageResult.rows[0];
  if (!page) {
    const slug = await createUniquePageSlug(`${user.username}-book`, client);
    const created = await query(
      `
        INSERT INTO booking_pages (user_id, slug, title)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, slug, title, created_at, updated_at
      `,
      [userId, slug, `${user.display_name} booking page`],
      client
    );
    page = created.rows[0];
  }

  const defaultConfig = createDefaultConfig({
    businessName: user.display_name,
    services,
    brandColor: "#1a73e8",
  });

  await query(
    `
      INSERT INTO booking_page_versions (
        booking_page_id,
        status,
        version_number,
        config_json
      )
      VALUES ($1, 'draft', 1, $2::jsonb)
      ON CONFLICT (booking_page_id, status) DO NOTHING
    `,
    [page.id, JSON.stringify(defaultConfig)],
    client
  );

  await query(
    `
      INSERT INTO booking_page_versions (
        booking_page_id,
        status,
        version_number,
        config_json
      )
      VALUES ($1, 'published', 1, $2::jsonb)
      ON CONFLICT (booking_page_id, status) DO NOTHING
    `,
    [page.id, JSON.stringify(defaultConfig)],
    client
  );

  return {
    page,
    user,
    services,
  };
}

async function resolvePageForUser(userId, pageId, client = null) {
  const normalizedPageId = String(pageId || "").trim();
  if (!normalizedPageId || normalizedPageId === "default") {
    const ensured = await ensureBookingPageForUser(userId, client);
    return ensured.page;
  }

  const result = await query(
    `
      SELECT id, user_id, slug, title, created_at, updated_at
      FROM booking_pages
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [normalizedPageId, userId],
    client
  );
  const row = result.rows[0];
  if (!row) throw notFound("Page not found");
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
  const byStatus = new Map(result.rows.map((row) => [row.status, row]));
  return {
    draft: byStatus.get("draft") || null,
    published: byStatus.get("published") || null,
  };
}

async function loadHistory(pageId, limit = HISTORY_LIMIT, client = null) {
  const safeLimit = clamp(limit, 1, 50, HISTORY_LIMIT);
  const result = await query(
    `
      SELECT
        id,
        booking_page_id,
        source_status,
        version_number,
        config_json,
        created_at
      FROM booking_page_version_history
      WHERE booking_page_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [pageId, safeLimit],
    client
  );
  return result.rows.map(toHistoryPayload);
}

async function trimHistory(pageId, limit = HISTORY_LIMIT, client = null) {
  const safeLimit = clamp(limit, 1, 100, HISTORY_LIMIT);
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
    [pageId, safeLimit],
    client
  );
}

function buildPagePayload(page, user) {
  return {
    id: page.id,
    userId: page.user_id,
    slug: page.slug,
    title: page.title,
    username: user.username,
    businessName: user.display_name,
    timezone: user.timezone,
    createdAt: page.created_at,
    updatedAt: page.updated_at,
  };
}

function ensureServiceSelection(config, services) {
  const normalized = normalizeConfig(config, config);
  const serviceSection = normalized.sections.find((item) => item.type === "serviceList");
  if (!serviceSection) return normalized;

  const validIds = new Set(services.map((item) => item.id));
  const selected = Array.isArray(serviceSection.settings.selectedServiceIds)
    ? serviceSection.settings.selectedServiceIds.filter((id) => validIds.has(id))
    : [];
  serviceSection.settings.selectedServiceIds = selected.length
    ? selected
    : services.map((item) => item.id);
  return normalized;
}

function extractBookingRules(config) {
  const bookingSection = Array.isArray(config?.sections)
    ? config.sections.find((section) => section && section.type === "bookingWidget")
    : null;
  const settings = bookingSection && bookingSection.settings ? bookingSection.settings : {};

  const dateRangeDays = clamp(settings.dateRangeDays, 14, 365, 60);
  const maxAdvanceDays = clamp(settings.maxAdvanceDays, 14, 365, dateRangeDays);
  const minNoticeMinutes = clamp(settings.minNoticeMinutes, 0, 10080, 0);

  return {
    dateRangeDays,
    maxAdvanceDays,
    minNoticeMinutes,
  };
}

async function listPagesForUser(userId) {
  const ensured = await withTransaction(async (client) => ensureBookingPageForUser(userId, client));
  const user = ensured.user;
  const result = await query(
    `
      SELECT id, user_id, slug, title, created_at, updated_at
      FROM booking_pages
      WHERE user_id = $1
      ORDER BY created_at ASC
    `,
    [userId]
  );
  return result.rows.map((row) => buildPagePayload(row, user));
}

async function getPageDraftByIdForUser(userId, pageId) {
  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUserForPageBuilder(userId, client);
    const services = await listServicesForUser(userId, client);
    const versions = await loadVersionRows(page.id, client);

    const fallbackConfig = createDefaultConfig({
      businessName: user.display_name,
      services,
    });
    const draftConfig = ensureServiceSelection(
      normalizeConfig(versions.draft?.config_json, fallbackConfig),
      services
    );
    const publishedConfig = ensureServiceSelection(
      normalizeConfig(versions.published?.config_json, fallbackConfig),
      services
    );
    const history = await loadHistory(page.id, HISTORY_LIMIT, client);

    return {
      page: buildPagePayload(page, user),
      draftConfig,
      publishedConfig,
      services,
      history,
      saveState: "saved",
    };
  });
}

async function updatePageDraftByIdForUser(userId, pageId, payload = {}) {
  const configPayload =
    payload && typeof payload === "object" && payload.config && typeof payload.config === "object"
      ? payload.config
      : payload;

  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUserForPageBuilder(userId, client);
    const services = await listServicesForUser(userId, client);
    const versions = await loadVersionRows(page.id, client);
    const fallbackConfig = createDefaultConfig({
      businessName: user.display_name,
      services,
    });
    const currentDraft = normalizeConfig(versions.draft?.config_json, fallbackConfig);
    const nextConfig = ensureServiceSelection(normalizeConfig(configPayload, currentDraft), services);
    const nextVersionNumber = (Number(versions.draft?.version_number) || 1) + 1;

    const updated = await query(
      `
        UPDATE booking_page_versions
        SET
          config_json = $1::jsonb,
          version_number = $2,
          updated_at = NOW()
        WHERE booking_page_id = $3
          AND status = 'draft'
        RETURNING
          id,
          booking_page_id,
          status,
          version_number,
          config_json,
          created_at,
          updated_at
      `,
      [JSON.stringify(nextConfig), nextVersionNumber, page.id],
      client
    );
    const draft = updated.rows[0];
    if (!draft) throw notFound("Draft page version not found");

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
      [page.id, draft.version_number, JSON.stringify(nextConfig)],
      client
    );
    await trimHistory(page.id, HISTORY_LIMIT, client);

    const publishedConfig = normalizeConfig(versions.published?.config_json, fallbackConfig);
    const history = await loadHistory(page.id, HISTORY_LIMIT, client);

    return {
      page: buildPagePayload(page, user),
      draftConfig: nextConfig,
      publishedConfig,
      services,
      history,
      saveState: "saved",
    };
  });
}

async function publishPageByIdForUser(userId, pageId) {
  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUserForPageBuilder(userId, client);
    const services = await listServicesForUser(userId, client);
    const versions = await loadVersionRows(page.id, client);
    if (!versions.draft) throw notFound("Draft version not found");

    const fallbackConfig = createDefaultConfig({
      businessName: user.display_name,
      services,
    });
    const nextConfig = ensureServiceSelection(
      normalizeConfig(versions.draft.config_json, fallbackConfig),
      services
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
    await trimHistory(page.id, HISTORY_LIMIT, client);

    const refreshed = await loadVersionRows(page.id, client);
    const history = await loadHistory(page.id, HISTORY_LIMIT, client);

    return {
      page: buildPagePayload(page, user),
      draftConfig: normalizeConfig(refreshed.draft?.config_json, nextConfig),
      publishedConfig: normalizeConfig(refreshed.published?.config_json, nextConfig),
      services,
      history,
      saveState: "published",
    };
  });
}

async function restorePageVersionByHistoryIdForUser(userId, pageId, historyId) {
  return withTransaction(async (client) => {
    const page = await resolvePageForUser(userId, pageId, client);
    const user = await getUserForPageBuilder(userId, client);
    const services = await listServicesForUser(userId, client);
    const historyResult = await query(
      `
        SELECT
          id,
          booking_page_id,
          source_status,
          version_number,
          config_json,
          created_at
        FROM booking_page_version_history
        WHERE id = $1
          AND booking_page_id = $2
        LIMIT 1
      `,
      [historyId, page.id],
      client
    );
    const historyRow = historyResult.rows[0];
    if (!historyRow) throw notFound("Version history entry not found");

    const versions = await loadVersionRows(page.id, client);
    const fallbackConfig = createDefaultConfig({
      businessName: user.display_name,
      services,
    });
    const restoredConfig = ensureServiceSelection(
      normalizeConfig(historyRow.config_json, fallbackConfig),
      services
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
    await trimHistory(page.id, HISTORY_LIMIT, client);

    const refreshed = await loadVersionRows(page.id, client);
    const history = await loadHistory(page.id, HISTORY_LIMIT, client);

    return {
      page: buildPagePayload(page, user),
      draftConfig: normalizeConfig(refreshed.draft?.config_json, restoredConfig),
      publishedConfig: normalizeConfig(refreshed.published?.config_json, restoredConfig),
      services,
      history,
      saveState: "restored",
    };
  });
}

async function getPublishedPageBySlug(slug) {
  const safeSlug = assertSlug(slug, "slug");
  const pageResult = await query(
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
        u.timezone,
        v.config_json
      FROM booking_pages bp
      JOIN users u ON u.id = bp.user_id
      JOIN booking_page_versions v ON v.booking_page_id = bp.id AND v.status = 'published'
      WHERE bp.slug = $1
      LIMIT 1
    `,
    [safeSlug]
  );

  const page = pageResult.rows[0];
  if (!page) throw notFound("Published page not found");

  const services = await listServicesForUser(page.user_id);
  const fallbackConfig = createDefaultConfig({
    businessName: page.display_name,
    services,
  });
  const config = ensureServiceSelection(normalizeConfig(page.config_json, fallbackConfig), services);

  return {
    page: {
      id: page.id,
      userId: page.user_id,
      slug: page.slug,
      title: page.title,
      username: page.username,
      businessName: page.display_name,
      timezone: page.timezone,
      createdAt: page.created_at,
      updatedAt: page.updated_at,
    },
    config,
    services,
  };
}

function buildCustomAnswerNotes(rawAnswers) {
  if (!rawAnswers) return "";
  if (!Array.isArray(rawAnswers)) return "";
  const lines = rawAnswers
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const label = safeText(item.label, "Question", 120);
      const answer = safeText(item.answer, "", 2000);
      if (!answer) return "";
      return `${label}: ${answer}`;
    })
    .filter(Boolean);
  return lines.join("\n");
}

async function getPublicAvailability({
  pageSlug,
  serviceId,
  date,
  timezone,
  staffId,
}) {
  const safeDate = assertDate(date, "date");
  const safeTimezone = assertZone(timezone || "UTC", "timezone");
  const published = await getPublishedPageBySlug(pageSlug);
  const services = published.services;
  if (!services.length) {
    throw badRequest("No active services are available on this page");
  }

  const selected = services.find((item) => item.id === serviceId) || services[0];
  if (!selected) throw badRequest("serviceId is invalid");
  const bookingRules = extractBookingRules(published.config);

  const availability = await generatePublicSlots({
    username: published.page.username,
    slug: selected.slug,
    visitorDate: safeDate,
    visitorTimezone: safeTimezone,
  });

  const nowUtc = DateTime.utc();
  const earliestStart = nowUtc.plus({ minutes: bookingRules.minNoticeMinutes });
  const latestStart = nowUtc.plus({ days: bookingRules.maxAdvanceDays + 1 });
  const rawSlots = Array.isArray(availability.slots) ? availability.slots : [];
  availability.slots = rawSlots.filter((slot) => {
    const startsAtUtc = DateTime.fromISO(String(slot.startAtUtc || ""), { zone: "utc" });
    if (!startsAtUtc.isValid) return false;
    if (startsAtUtc < earliestStart) return false;
    if (startsAtUtc > latestStart) return false;
    return true;
  });

  let nextAvailable = null;
  if (!availability.slots.length && bookingRules.maxAdvanceDays > 0) {
    const from = DateTime.fromISO(safeDate, { zone: safeTimezone }).plus({ days: 1 });
    const nowVisitorDay = DateTime.now().setZone(safeTimezone).startOf("day");
    const maxVisitorDay = nowVisitorDay.plus({ days: bookingRules.maxAdvanceDays });

    for (let offset = 0; offset < bookingRules.maxAdvanceDays; offset += 1) {
      const probeDate = from.plus({ days: offset }).toFormat("yyyy-LL-dd");
      if (DateTime.fromISO(probeDate, { zone: safeTimezone }) > maxVisitorDay) break;

      const probe = await generatePublicSlots({
        username: published.page.username,
        slug: selected.slug,
        visitorDate: probeDate,
        visitorTimezone: safeTimezone,
      });
      const filteredProbeSlots = Array.isArray(probe.slots)
        ? probe.slots.filter((slot) => {
            const startsAtUtc = DateTime.fromISO(String(slot.startAtUtc || ""), { zone: "utc" });
            if (!startsAtUtc.isValid) return false;
            if (startsAtUtc < earliestStart) return false;
            if (startsAtUtc > latestStart) return false;
            return true;
          })
        : [];

      if (filteredProbeSlots.length) {
        nextAvailable = {
          date: probeDate,
          firstSlot: filteredProbeSlots[0],
        };
        break;
      }
    }
  }

  return {
    page: published.page,
    config: published.config,
    bookingRules,
    services,
    selectedServiceId: selected.id,
    staffId: safeText(staffId, "", 80),
    availability,
    nextAvailable,
  };
}

async function createBookingFromPublicPage(payload = {}) {
  const pageSlug = assertSlug(payload.pageSlug || payload.slug, "pageSlug");
  const serviceId = assertString(payload.serviceId, "serviceId", { min: 6, max: 80 });
  const visitorDate = assertDate(payload.date || payload.visitorDate, "date");
  const visitorTimezone = assertZone(payload.timezone || "UTC", "timezone");
  const inviteeName = assertString(payload.name, "name", { min: 2, max: 120 });
  const inviteeEmail = assertEmail(payload.email, "email");
  const phone = assertOptionalString(payload.phone, "phone", { max: 60 });
  const notes = assertOptionalString(payload.notes, "notes", { max: 4000 });
  const answers = buildCustomAnswerNotes(payload.answers);

  const published = await getPublishedPageBySlug(pageSlug);
  const selected = published.services.find((item) => item.id === serviceId);
  if (!selected) throw badRequest("serviceId is invalid for this page");
  const bookingRules = extractBookingRules(published.config);

  const bookingStartUtc = DateTime.fromISO(String(payload.startAtUtc || ""), { zone: "utc" });
  if (bookingStartUtc.isValid) {
    const minNoticeLimit = DateTime.utc().plus({ minutes: bookingRules.minNoticeMinutes });
    if (bookingStartUtc < minNoticeLimit) {
      throw badRequest("Selected slot does not meet minimum notice requirement");
    }
    const maxAdvanceLimit = DateTime.utc().plus({ days: bookingRules.maxAdvanceDays + 1 });
    if (bookingStartUtc > maxAdvanceLimit) {
      throw badRequest("Selected slot is outside the maximum booking window");
    }
  }

  const mergedNotes = [notes, phone ? `Phone: ${phone}` : "", answers]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);

  const booking = await createPublicBooking({
    username: published.page.username,
    slug: selected.slug,
    visitorDate,
    visitorTimezone,
    startAtUtc: payload.startAtUtc,
    slotToken: payload.slotToken,
    inviteeName,
    inviteeEmail,
    notes: mergedNotes,
  });

  return {
    ...booking,
    page: published.page,
    service: selected,
  };
}

module.exports = {
  createDefaultConfig,
  normalizeConfig,
  listPagesForUser,
  getPageDraftByIdForUser,
  updatePageDraftByIdForUser,
  publishPageByIdForUser,
  restorePageVersionByHistoryIdForUser,
  getPublishedPageBySlug,
  getPublicAvailability,
  createBookingFromPublicPage,
};
