const { query } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const {
  assertEmail,
  assertOptionalString,
  assertString,
} = require("../utils/validation");

const LEAD_STATUSES = new Set(["new", "contacted", "won", "closed"]);

function normalizeColor(value) {
  if (value === undefined || value === null || value === "") return "#1a73e8";
  const raw = assertString(value, "primaryColor", { min: 4, max: 16 });
  const normalized = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
    throw badRequest("primaryColor must be a valid 6-digit hex color");
  }
  return normalized.toLowerCase();
}

function normalizeLandingServices(value) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw badRequest("services must be an array");
  if (value.length > 8) throw badRequest("services can contain at most 8 items");
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw badRequest(`services[${index}] must be an object`);
    }
    return {
      title: assertString(item.title, `services[${index}].title`, { min: 2, max: 100 }),
      description: assertOptionalString(item.description, `services[${index}].description`, {
        max: 300,
      }),
    };
  });
}

function normalizeLandingGallery(value) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw badRequest("gallery must be an array");
  if (value.length > 8) throw badRequest("gallery can contain at most 8 items");
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw badRequest(`gallery[${index}] must be an object`);
    }
    const url = assertString(item.url, `gallery[${index}].url`, { min: 3, max: 1000 });
    const alt = assertOptionalString(item.alt, `gallery[${index}].alt`, { max: 160 });
    return { url, alt };
  });
}

function normalizeStoredServices(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim(),
    }))
    .filter((item) => item.title);
}

function normalizeStoredGallery(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      url: String(item.url || "").trim(),
      alt: String(item.alt || "").trim(),
    }))
    .filter((item) => item.url);
}

function mapEventType(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    slug: row.slug,
    durationMinutes: row.duration_minutes,
    locationType: row.location_type,
  };
}

function mapLead(row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventTypeId: row.event_type_id,
    eventTypeTitle: row.event_type_title || "",
    name: row.name,
    email: row.email,
    company: row.company || "",
    phone: row.phone || "",
    query: row.query || "",
    sourceUrl: row.source_url || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureLandingPageRow(userId) {
  await query(
    `
      INSERT INTO user_landing_pages (
        user_id,
        headline,
        subheadline,
        about_text,
        cta_label
      )
      SELECT
        u.id,
        CONCAT('Book time with ', u.display_name),
        'Turn website visitors into booked meetings',
        'Share your services, highlight event types, and let prospects contact you instantly.',
        'Book a meeting'
      FROM users u
      WHERE u.id = $1
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId]
  );
}

async function listEventTypesForUser(userId) {
  const result = await query(
    `
      SELECT
        id,
        title,
        description,
        slug,
        duration_minutes,
        location_type
      FROM event_types
      WHERE user_id = $1
        AND is_active = TRUE
      ORDER BY created_at ASC
    `,
    [userId]
  );
  return result.rows.map(mapEventType);
}

async function getLandingPageRowByUserId(userId) {
  await ensureLandingPageRow(userId);
  const result = await query(
    `
      SELECT
        u.id AS user_id,
        u.username,
        u.display_name,
        u.timezone,
        lp.headline,
        lp.subheadline,
        lp.about_text,
        lp.cta_label,
        lp.profile_image_url,
        lp.cover_image_url,
        lp.primary_color,
        lp.services,
        lp.gallery,
        lp.featured_event_type_id,
        lp.contact_form_enabled,
        lp.is_published,
        lp.created_at,
        lp.updated_at
      FROM users u
      LEFT JOIN user_landing_pages lp ON lp.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = result.rows[0];
  if (!row) throw notFound("User not found");
  return row;
}

function mapLandingRowToPayload(row, eventTypes) {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    timezone: row.timezone,
    headline: row.headline || "",
    subheadline: row.subheadline || "",
    aboutText: row.about_text || "",
    ctaLabel: row.cta_label || "Book a meeting",
    profileImageUrl: row.profile_image_url || "",
    coverImageUrl: row.cover_image_url || "",
    primaryColor: row.primary_color || "#1a73e8",
    services: normalizeStoredServices(row.services),
    gallery: normalizeStoredGallery(row.gallery),
    featuredEventTypeId: row.featured_event_type_id || "",
    contactFormEnabled: !!row.contact_form_enabled,
    isPublished: !!row.is_published,
    eventTypes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getLandingPageForUser(userId) {
  const row = await getLandingPageRowByUserId(userId);
  const eventTypes = await listEventTypesForUser(userId);
  return mapLandingRowToPayload(row, eventTypes);
}

async function resolveFeaturedEventType(userId, featuredEventTypeId) {
  if (featuredEventTypeId === undefined) return undefined;
  if (featuredEventTypeId === null || featuredEventTypeId === "") return null;
  const safeId = assertString(featuredEventTypeId, "featuredEventTypeId", {
    min: 6,
    max: 80,
  });
  const result = await query(
    `
      SELECT id
      FROM event_types
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [safeId, userId]
  );
  if (!result.rows[0]) {
    throw badRequest("featuredEventTypeId is invalid");
  }
  return safeId;
}

async function updateLandingPageForUser(userId, payload = {}) {
  const current = await getLandingPageRowByUserId(userId);
  const services = normalizeLandingServices(payload.services);
  const gallery = normalizeLandingGallery(payload.gallery);
  const featuredEventTypeId = await resolveFeaturedEventType(userId, payload.featuredEventTypeId);

  const next = {
    headline:
      payload.headline === undefined
        ? current.headline
        : assertOptionalString(payload.headline, "headline", { max: 160 }),
    subheadline:
      payload.subheadline === undefined
        ? current.subheadline
        : assertOptionalString(payload.subheadline, "subheadline", { max: 260 }),
    aboutText:
      payload.aboutText === undefined
        ? current.about_text
        : assertOptionalString(payload.aboutText, "aboutText", { max: 5000 }),
    ctaLabel:
      payload.ctaLabel === undefined
        ? current.cta_label
        : assertOptionalString(payload.ctaLabel, "ctaLabel", { max: 80 }) || "Book a meeting",
    profileImageUrl:
      payload.profileImageUrl === undefined
        ? current.profile_image_url
        : assertOptionalString(payload.profileImageUrl, "profileImageUrl", { max: 1000 }),
    coverImageUrl:
      payload.coverImageUrl === undefined
        ? current.cover_image_url
        : assertOptionalString(payload.coverImageUrl, "coverImageUrl", { max: 1000 }),
    primaryColor:
      payload.primaryColor === undefined
        ? normalizeColor(current.primary_color)
        : normalizeColor(payload.primaryColor),
    services: services === undefined ? current.services : services,
    gallery: gallery === undefined ? current.gallery : gallery,
    featuredEventTypeId:
      featuredEventTypeId === undefined
        ? current.featured_event_type_id
        : featuredEventTypeId,
    contactFormEnabled:
      payload.contactFormEnabled === undefined
        ? !!current.contact_form_enabled
        : !!payload.contactFormEnabled,
    isPublished:
      payload.isPublished === undefined ? !!current.is_published : !!payload.isPublished,
  };

  await query(
    `
      UPDATE user_landing_pages
      SET
        headline = $1,
        subheadline = $2,
        about_text = $3,
        cta_label = $4,
        profile_image_url = $5,
        cover_image_url = $6,
        primary_color = $7,
        services = $8::jsonb,
        gallery = $9::jsonb,
        featured_event_type_id = $10,
        contact_form_enabled = $11,
        is_published = $12,
        updated_at = NOW()
      WHERE user_id = $13
    `,
    [
      next.headline,
      next.subheadline,
      next.aboutText,
      next.ctaLabel,
      next.profileImageUrl,
      next.coverImageUrl,
      next.primaryColor,
      JSON.stringify(next.services || []),
      JSON.stringify(next.gallery || []),
      next.featuredEventTypeId,
      next.contactFormEnabled,
      next.isPublished,
      userId,
    ]
  );

  return getLandingPageForUser(userId);
}

async function listLandingPageLeadsForUser(userId, { status = "all", limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 100));
  const safeStatus = String(status || "all")
    .trim()
    .toLowerCase();
  if (safeStatus !== "all" && !LEAD_STATUSES.has(safeStatus)) {
    throw badRequest("status filter is invalid");
  }

  const params = [userId];
  let statusClause = "";
  if (safeStatus !== "all") {
    params.push(safeStatus);
    statusClause = `AND l.status = $${params.length}`;
  }
  params.push(safeLimit);

  const result = await query(
    `
      SELECT
        l.id,
        l.user_id,
        l.event_type_id,
        l.name,
        l.email,
        l.company,
        l.phone,
        l.query,
        l.source_url,
        l.status,
        l.created_at,
        l.updated_at,
        e.title AS event_type_title
      FROM landing_page_leads l
      LEFT JOIN event_types e ON e.id = l.event_type_id
      WHERE l.user_id = $1
      ${statusClause}
      ORDER BY l.created_at DESC
      LIMIT $${params.length}
    `,
    params
  );
  return result.rows.map(mapLead);
}

async function updateLandingLeadStatusForUser(userId, leadId, status) {
  const safeStatus = String(status || "")
    .trim()
    .toLowerCase();
  if (!LEAD_STATUSES.has(safeStatus)) {
    throw badRequest("status must be new, contacted, won, or closed");
  }

  const result = await query(
    `
      UPDATE landing_page_leads
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
        AND user_id = $3
      RETURNING
        id,
        user_id,
        event_type_id,
        name,
        email,
        company,
        phone,
        query,
        source_url,
        status,
        created_at,
        updated_at
    `,
    [safeStatus, leadId, userId]
  );
  const row = result.rows[0];
  if (!row) throw notFound("Lead not found");
  return mapLead(row);
}

async function createLandingLeadForUsername(username, payload = {}, meta = {}) {
  const safeUsername = assertString(username, "username", { min: 2, max: 80 }).toLowerCase();
  const userResult = await query(
    `
      SELECT
        u.id,
        u.username,
        u.display_name,
        COALESCE(lp.contact_form_enabled, TRUE) AS contact_form_enabled,
        COALESCE(lp.is_published, TRUE) AS is_published
      FROM users u
      LEFT JOIN user_landing_pages lp ON lp.user_id = u.id
      WHERE u.username = $1
      LIMIT 1
    `,
    [safeUsername]
  );
  const user = userResult.rows[0];
  if (!user || !user.is_published) {
    throw notFound("Landing page not found");
  }
  if (!user.contact_form_enabled) {
    throw badRequest("Contact form is disabled for this landing page");
  }

  const name = assertString(payload.name, "name", { min: 2, max: 120 });
  const email = assertEmail(payload.email, "email");
  const company = assertOptionalString(payload.company, "company", { max: 160 });
  const phone = assertOptionalString(payload.phone, "phone", { max: 60 });
  const queryText = assertString(payload.query, "query", { min: 5, max: 5000 });

  let eventTypeId = null;
  if (payload.eventTypeId !== undefined && payload.eventTypeId !== null && payload.eventTypeId !== "") {
    const requestedEventTypeId = assertString(payload.eventTypeId, "eventTypeId", {
      min: 6,
      max: 80,
    });
    const eventResult = await query(
      `
        SELECT id
        FROM event_types
        WHERE id = $1
          AND user_id = $2
          AND is_active = TRUE
        LIMIT 1
      `,
      [requestedEventTypeId, user.id]
    );
    if (!eventResult.rows[0]) {
      throw badRequest("eventTypeId is invalid");
    }
    eventTypeId = requestedEventTypeId;
  }

  const sourceUrl = assertOptionalString(meta.sourceUrl, "sourceUrl", { max: 2000 });

  const result = await query(
    `
      INSERT INTO landing_page_leads (
        user_id,
        event_type_id,
        name,
        email,
        company,
        phone,
        query,
        source_url
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING
        id,
        user_id,
        event_type_id,
        name,
        email,
        company,
        phone,
        query,
        source_url,
        status,
        created_at,
        updated_at
    `,
    [user.id, eventTypeId, name, email, company, phone, queryText, sourceUrl]
  );

  await query(
    `
      INSERT INTO contacts (
        user_id,
        name,
        email,
        company,
        type,
        tags,
        notes,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'Lead',
        ARRAY['Landing'],
        left($5, 5000),
        NOW()
      )
      ON CONFLICT (user_id, email)
      DO UPDATE SET
        name = EXCLUDED.name,
        company = CASE
          WHEN EXCLUDED.company <> '' THEN EXCLUDED.company
          ELSE contacts.company
        END,
        tags = (
          SELECT ARRAY(
            SELECT DISTINCT tag
            FROM unnest(COALESCE(contacts.tags, '{}') || COALESCE(EXCLUDED.tags, '{}')) AS tag
          )
        ),
        notes = left(
          trim(
            BOTH E'\n' FROM
              CASE
                WHEN contacts.notes = '' THEN EXCLUDED.notes
                ELSE contacts.notes || E'\n' || EXCLUDED.notes
              END
          ),
          5000
        ),
        updated_at = NOW()
    `,
    [user.id, name, email, company, `Landing page query: ${queryText}`]
  );

  return mapLead(result.rows[0]);
}

async function getPublicLandingPageByUsername(username) {
  const safeUsername = assertString(username, "username", { min: 2, max: 80 }).toLowerCase();
  const result = await query(
    `
      SELECT
        u.id AS user_id,
        u.username,
        u.display_name,
        u.timezone,
        lp.headline,
        lp.subheadline,
        lp.about_text,
        lp.cta_label,
        lp.profile_image_url,
        lp.cover_image_url,
        lp.primary_color,
        lp.services,
        lp.gallery,
        lp.featured_event_type_id,
        COALESCE(lp.contact_form_enabled, TRUE) AS contact_form_enabled,
        COALESCE(lp.is_published, TRUE) AS is_published
      FROM users u
      LEFT JOIN user_landing_pages lp ON lp.user_id = u.id
      WHERE u.username = $1
      LIMIT 1
    `,
    [safeUsername]
  );
  const row = result.rows[0];
  if (!row || !row.is_published) {
    throw notFound("Landing page not found");
  }

  const eventTypes = await listEventTypesForUser(row.user_id);
  const featured =
    eventTypes.find((item) => item.id === row.featured_event_type_id) || eventTypes[0] || null;

  return {
    username: row.username,
    displayName: row.display_name,
    timezone: row.timezone,
    headline: row.headline || `Meet ${row.display_name}`,
    subheadline:
      row.subheadline || "Share your services and let clients book instantly.",
    aboutText:
      row.about_text ||
      "Use this page to explain what you offer and help visitors choose the right appointment type.",
    ctaLabel: row.cta_label || "Book a meeting",
    profileImageUrl: row.profile_image_url || "",
    coverImageUrl: row.cover_image_url || "",
    primaryColor: row.primary_color || "#1a73e8",
    services: normalizeStoredServices(row.services),
    gallery: normalizeStoredGallery(row.gallery),
    contactFormEnabled: !!row.contact_form_enabled,
    featuredEventType: featured,
    eventTypes,
  };
}

module.exports = {
  getLandingPageForUser,
  updateLandingPageForUser,
  listLandingPageLeadsForUser,
  updateLandingLeadStatusForUser,
  createLandingLeadForUsername,
  getPublicLandingPageByUsername,
};
