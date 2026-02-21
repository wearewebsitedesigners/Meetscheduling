const { query } = require("../db/pool");
const { conflict, notFound } = require("../utils/http-error");
const {
  assertString,
  assertOptionalString,
  assertSlug,
  assertInteger,
  assertBoolean,
  normalizeLocationType,
} = require("../utils/validation");

function normalizeEventTypeInput(input, { partial = false } = {}) {
  const result = {};

  function maybe(field, resolver) {
    if (partial && input[field] === undefined) return;
    result[field] = resolver(input[field]);
  }

  maybe("title", (value) => assertString(value, "title", { min: 2, max: 120 }));
  maybe("description", (value) => assertOptionalString(value, "description", { max: 2000 }));
  maybe("durationMinutes", (value) => assertInteger(value, "durationMinutes", { min: 5, max: 240 }));
  maybe("slug", (value) => assertSlug(value, "slug"));
  maybe("locationType", (value) => normalizeLocationType(value));
  maybe("customLocation", (value) => assertOptionalString(value, "customLocation", { max: 500 }));
  maybe("bufferBeforeMin", (value) => assertInteger(value, "bufferBeforeMin", { min: 0, max: 240 }));
  maybe("bufferAfterMin", (value) => assertInteger(value, "bufferAfterMin", { min: 0, max: 240 }));
  maybe("maxBookingsPerDay", (value) => assertInteger(value, "maxBookingsPerDay", { min: 0, max: 500 }));

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

async function listEventTypesByUser(userId, { includeInactive = true } = {}, client = null) {
  const conditions = ["user_id = $1"];
  const params = [userId];
  if (!includeInactive) {
    conditions.push("is_active = TRUE");
  }
  const result = await query(
    `
      SELECT
        id,
        user_id,
        title,
        description,
        duration_minutes,
        slug,
        location_type,
        custom_location,
        buffer_before_min,
        buffer_after_min,
        max_bookings_per_day,
        is_active,
        created_at,
        updated_at
      FROM event_types
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC
    `,
    params,
    client
  );
  return result.rows;
}

async function countEventTypesByUser(userId, client = null) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM event_types
      WHERE user_id = $1
    `,
    [userId],
    client
  );
  return result.rows[0]?.count || 0;
}

async function getEventTypeByIdForUser(userId, eventTypeId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        title,
        description,
        duration_minutes,
        slug,
        location_type,
        custom_location,
        buffer_before_min,
        buffer_after_min,
        max_bookings_per_day,
        is_active,
        created_at,
        updated_at
      FROM event_types
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [eventTypeId, userId],
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
        et.id,
        et.user_id,
        et.title,
        et.description,
        et.duration_minutes,
        et.slug,
        et.location_type,
        et.custom_location,
        et.buffer_before_min,
        et.buffer_after_min,
        et.max_bookings_per_day,
        et.is_active,
        et.created_at,
        et.updated_at,
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

async function createEventType(userId, payload, client = null) {
  const input = normalizeEventTypeInput(payload, { partial: false });
  try {
    const result = await query(
      `
        INSERT INTO event_types (
          user_id,
          title,
          description,
          duration_minutes,
          slug,
          location_type,
          custom_location,
          buffer_before_min,
          buffer_after_min,
          max_bookings_per_day,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)
        RETURNING
          id,
          user_id,
          title,
          description,
          duration_minutes,
          slug,
          location_type,
          custom_location,
          buffer_before_min,
          buffer_after_min,
          max_bookings_per_day,
          is_active,
          created_at,
          updated_at
      `,
      [
        userId,
        input.title,
        input.description,
        input.durationMinutes,
        input.slug,
        input.locationType,
        input.locationType === "custom" ? input.customLocation : null,
        input.bufferBeforeMin,
        input.bufferAfterMin,
        input.maxBookingsPerDay,
      ],
      client
    );
    return result.rows[0];
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("Slug already exists for this user");
    }
    throw error;
  }
}

async function updateEventType(userId, eventTypeId, payload, client = null) {
  const existing = await getEventTypeByIdForUser(userId, eventTypeId, client);
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
          updated_at = NOW()
        WHERE id = $10 AND user_id = $11
        RETURNING
          id,
          user_id,
          title,
          description,
          duration_minutes,
          slug,
          location_type,
          custom_location,
          buffer_before_min,
          buffer_after_min,
          max_bookings_per_day,
          is_active,
          created_at,
          updated_at
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
        eventTypeId,
        userId,
      ],
      client
    );
    return result.rows[0];
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("Slug already exists for this user");
    }
    throw error;
  }
}

async function setEventTypeActive(userId, eventTypeId, isActive, client = null) {
  const active = assertBoolean(isActive, "isActive");
  const result = await query(
    `
      UPDATE event_types
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING
        id,
        user_id,
        title,
        description,
        duration_minutes,
        slug,
        location_type,
        custom_location,
        buffer_before_min,
        buffer_after_min,
        max_bookings_per_day,
        is_active,
        created_at,
        updated_at
    `,
    [active, eventTypeId, userId],
    client
  );
  if (!result.rows[0]) throw notFound("Event type not found");
  return result.rows[0];
}

async function deleteEventType(userId, eventTypeId, client = null) {
  const result = await query(
    `
      DELETE FROM event_types
      WHERE id = $1 AND user_id = $2
    `,
    [eventTypeId, userId],
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

