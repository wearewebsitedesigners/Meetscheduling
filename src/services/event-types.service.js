const { query } = require("../db/pool");
const { conflict, notFound } = require("../utils/http-error");
const {
  assertString,
  assertOptionalString,
  assertSlug,
  assertInteger,
  assertBoolean,
  assertHexColor,
  assertNavigationUrl,
  normalizeLocationType,
} = require("../utils/validation");

function buildEventTypeSelect(prefix = "") {
  const table = prefix ? `${prefix}.` : "";
  return `
    ${table}id,
    ${table}user_id,
    ${table}workspace_id,
    ${table}title,
    ${table}description,
    ${table}duration_minutes,
    ${table}slug,
    ${table}location_type,
    ${table}custom_location,
    ${table}buffer_before_min,
    ${table}buffer_after_min,
    ${table}max_bookings_per_day,
    ${table}color,
    ${table}notice_minimum_hours,
    ${table}is_active,
    ${table}brand_logo_url,
    ${table}brand_tagline,
    ${table}sidebar_message,
    ${table}created_at,
    ${table}updated_at
  `;
}

function normalizeEventTypeInput(input, { partial = false } = {}) {
  const result = {};

  function maybe(field, resolver) {
    if (partial && input[field] === undefined) return;
    result[field] = resolver(input[field]);
  }

  maybe("title", (value) => assertString(value, "title", { min: 2, max: 120 }));
  maybe("description", (value) =>
    assertOptionalString(value, "description", { max: 2000 })
  );
  maybe("durationMinutes", (value) =>
    assertInteger(value, "durationMinutes", { min: 5, max: 240 })
  );
  maybe("slug", (value) => assertSlug(value, "slug"));
  maybe("locationType", (value) => normalizeLocationType(value));
  maybe("customLocation", (value) =>
    value ? assertNavigationUrl(value, "customLocation", { max: 500 }) : ""
  );
  maybe("bufferBeforeMin", (value) =>
    assertInteger(value, "bufferBeforeMin", { min: 0, max: 240 })
  );
  maybe("bufferAfterMin", (value) =>
    assertInteger(value, "bufferAfterMin", { min: 0, max: 240 })
  );
  maybe("maxBookingsPerDay", (value) =>
    assertInteger(value, "maxBookingsPerDay", { min: 0, max: 500 })
  );
  maybe("noticeMinimumHours", (value) =>
    assertInteger(value, "noticeMinimumHours", { min: 0, max: 720 })
  );
  maybe("color", (value) => assertHexColor(value, "color"));
  maybe("brandLogoUrl", (value) => assertOptionalString(value, "brandLogoUrl", { max: 1000 }));
  maybe("brandTagline", (value) => assertOptionalString(value, "brandTagline", { max: 200 }));
  maybe("sidebarMessage", (value) => assertOptionalString(value, "sidebarMessage", { max: 1000 }));

  if (!partial) {
    const customLocationRequired =
      result.locationType === "custom" && !String(result.customLocation || "").trim();
    if (customLocationRequired) {
      throw conflict("customLocation is required when locationType is custom");
    }
  } else if (
    result.locationType === "custom" &&
    input.customLocation !== undefined &&
    !String(result.customLocation || "").trim()
  ) {
    throw conflict("customLocation is required when locationType is custom");
  }

  return result;
}

async function listEventTypesByUser(workspaceId, { includeInactive = true } = {}, client = null) {
  const conditions = ["workspace_id = $1"];
  const params = [workspaceId];
  if (!includeInactive) {
    conditions.push("is_active = TRUE");
  }

  const result = await query(
    `
      SELECT
${buildEventTypeSelect()}
      FROM event_types
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC
    `,
    params,
    client
  );
  return result.rows;
}

async function countEventTypesByUser(workspaceId, client = null) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM event_types
      WHERE workspace_id = $1
    `,
    [workspaceId],
    client
  );
  return result.rows[0]?.count || 0;
}

async function getEventTypeByIdForUser(workspaceId, eventTypeId, client = null) {
  const result = await query(
    `
      SELECT
${buildEventTypeSelect()}
      FROM event_types
      WHERE id = $1 AND workspace_id = $2
      LIMIT 1
    `,
    [eventTypeId, workspaceId],
    client
  );
  const row = result.rows[0];
  if (!row) throw notFound("Event type not found");
  return row;
}

async function getPublicEventTypeByUsernameAndSlug(username, slug, client = null) {
  const result = await query(
    `
      SELECT
${buildEventTypeSelect("et")},
        u.username,
        u.display_name,
        u.timezone,
        u.plan
      FROM event_types et
      JOIN users u ON u.id = et.user_id
      WHERE u.username = $1 AND et.slug = $2 AND et.is_active = TRUE
      LIMIT 1
    `,
    [username, slug],
    client
  );
  const row = result.rows[0];
  if (!row) throw notFound("Event type not found");
  return row;
}

async function createEventType(workspaceId, payload, client = null) {
  const input = normalizeEventTypeInput(payload, { partial: false });
  try {
    const result = await query(
      `
        INSERT INTO event_types (
          user_id,
          workspace_id,
          title,
          description,
          duration_minutes,
          slug,
          location_type,
          custom_location,
          buffer_before_min,
          buffer_after_min,
          max_bookings_per_day,
          color,
          notice_minimum_hours,
          is_active,
          brand_logo_url,
          brand_tagline,
          sidebar_message
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,$14,$15,$16)
        RETURNING
${buildEventTypeSelect()}
      `,
      [
        workspaceId,
        workspaceId,
        input.title,
        input.description,
        input.durationMinutes,
        input.slug,
        input.locationType,
        input.locationType === "custom" ? input.customLocation : null,
        input.bufferBeforeMin ?? 0,
        input.bufferAfterMin ?? 0,
        input.maxBookingsPerDay ?? 0,
        input.color || "#2563eb",
        input.noticeMinimumHours ?? 0,
        input.brandLogoUrl || null,
        input.brandTagline || null,
        input.sidebarMessage || null,
      ],
      client
    );
    return result.rows[0];
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("Slug already exists for this workspace");
    }
    throw error;
  }
}

async function updateEventType(workspaceId, eventTypeId, payload, client = null) {
  const existing = await getEventTypeByIdForUser(workspaceId, eventTypeId, client);
  const input = normalizeEventTypeInput(payload, { partial: true });

  const next = {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    durationMinutes: input.durationMinutes ?? existing.duration_minutes,
    slug: input.slug ?? existing.slug,
    locationType: input.locationType ?? existing.location_type,
    customLocation:
      input.customLocation !== undefined
        ? input.customLocation
        : existing.custom_location || "",
    bufferBeforeMin: input.bufferBeforeMin ?? existing.buffer_before_min,
    bufferAfterMin: input.bufferAfterMin ?? existing.buffer_after_min,
    maxBookingsPerDay: input.maxBookingsPerDay ?? existing.max_bookings_per_day,
    color: input.color ?? existing.color ?? "#2563eb",
    noticeMinimumHours:
      input.noticeMinimumHours ?? existing.notice_minimum_hours ?? 0,
    brandLogoUrl: input.brandLogoUrl !== undefined ? input.brandLogoUrl : (existing.brand_logo_url || null),
    brandTagline: input.brandTagline !== undefined ? input.brandTagline : (existing.brand_tagline || null),
    sidebarMessage: input.sidebarMessage !== undefined ? input.sidebarMessage : (existing.sidebar_message || null),
  };

  if (next.locationType === "custom" && !String(next.customLocation || "").trim()) {
    throw conflict("customLocation is required when locationType is custom");
  }

  try {
    const result = await query(
      `
        UPDATE event_types
        SET
          title = $1,
          description = $2,
          duration_minutes = $3,
          slug = $4,
          location_type = $5,
          custom_location = $6,
          buffer_before_min = $7,
          buffer_after_min = $8,
          max_bookings_per_day = $9,
          color = $10,
          notice_minimum_hours = $11,
          brand_logo_url = $12,
          brand_tagline = $13,
          sidebar_message = $14,
          updated_at = NOW()
        WHERE id = $15 AND workspace_id = $16
        RETURNING
${buildEventTypeSelect()}
      `,
      [
        next.title,
        next.description,
        next.durationMinutes,
        next.slug,
        next.locationType,
        next.locationType === "custom" ? next.customLocation : null,
        next.bufferBeforeMin,
        next.bufferAfterMin,
        next.maxBookingsPerDay,
        next.color,
        next.noticeMinimumHours,
        next.brandLogoUrl || null,
        next.brandTagline || null,
        next.sidebarMessage || null,
        eventTypeId,
        workspaceId,
      ],
      client
    );
    return result.rows[0];
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("Slug already exists for this workspace");
    }
    throw error;
  }
}

async function setEventTypeActive(workspaceId, eventTypeId, isActive, client = null) {
  const active = assertBoolean(isActive, "isActive");
  const result = await query(
    `
      UPDATE event_types
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND workspace_id = $3
      RETURNING
${buildEventTypeSelect()}
    `,
    [active, eventTypeId, workspaceId],
    client
  );
  if (!result.rows[0]) throw notFound("Event type not found");
  return result.rows[0];
}

async function deleteEventType(workspaceId, eventTypeId, client = null) {
  const result = await query(
    `
      DELETE FROM event_types
      WHERE id = $1 AND workspace_id = $2
    `,
    [eventTypeId, workspaceId],
    client
  );
  if (!result.rowCount) throw notFound("Event type not found");
  return { deleted: true };
}

module.exports = {
  normalizeEventTypeInput,
  listEventTypesByUser,
  countEventTypesByUser,
  getEventTypeByIdForUser,
  getPublicEventTypeByUsernameAndSlug,
  createEventType,
  updateEventType,
  setEventTypeActive,
  deleteEventType,
};
