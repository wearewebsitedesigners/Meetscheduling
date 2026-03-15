const { query, withTransaction } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const {
  assertInteger,
  assertBoolean,
  assertIsoDate,
  assertTime,
  assertOptionalString,
} = require("../utils/validation");

function normalizeWeeklySlot(slot) {
  const weekday = assertInteger(slot.weekday, "weekday", { min: 0, max: 6 });
  const startTime = assertTime(slot.startTime, "startTime");
  const endTime = assertTime(slot.endTime, "endTime");
  const isAvailable =
    slot.isAvailable === undefined ? true : assertBoolean(slot.isAvailable, "isAvailable");
  if (startTime >= endTime) {
    throw badRequest("startTime must be before endTime");
  }
  return {
    weekday,
    startTime,
    endTime,
    isAvailable,
  };
}

async function getWeeklyAvailability(workspaceId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        workspace_id,
        weekday,
        start_time,
        end_time,
        is_available,
        created_at,
        updated_at
      FROM user_weekly_availability
      WHERE workspace_id = $1
      ORDER BY weekday ASC, start_time ASC
    `,
    [workspaceId],
    client
  );
  return result.rows;
}

async function replaceWeeklyAvailability(workspaceId, slots, client = null) {
  if (!Array.isArray(slots)) {
    throw badRequest("slots must be an array");
  }
  const normalized = slots.map(normalizeWeeklySlot);

  const executor = async (tx) => {
    await query(
      `
        DELETE FROM user_weekly_availability
        WHERE workspace_id = $1
      `,
      [workspaceId],
      tx
    );

    for (const slot of normalized) {
      await query(
        `
          INSERT INTO user_weekly_availability (
            user_id, workspace_id, weekday, start_time, end_time, is_available
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [workspaceId, workspaceId, slot.weekday, slot.startTime, slot.endTime, slot.isAvailable],
        tx
      );
    }

    return getWeeklyAvailability(workspaceId, tx);
  };

  if (client) return executor(client);
  return withTransaction(executor);
}

function normalizeDateOverride(input) {
  const overrideDate = assertIsoDate(input.overrideDate, "overrideDate");
  const isAvailable =
    input.isAvailable === undefined
      ? false
      : assertBoolean(input.isAvailable, "isAvailable");
  const note = assertOptionalString(input.note, "note", { max: 500 });

  let startTime = null;
  let endTime = null;
  if (isAvailable) {
    startTime = assertTime(input.startTime, "startTime");
    endTime = assertTime(input.endTime, "endTime");
    if (startTime >= endTime) {
      throw badRequest("startTime must be before endTime");
    }
  }

  return {
    overrideDate,
    startTime,
    endTime,
    isAvailable,
    note,
  };
}

async function listDateOverrides(workspaceId, { from = null, to = null } = {}, client = null) {
  const params = [workspaceId];
  const conditions = ["workspace_id = $1"];
  if (from) {
    params.push(assertIsoDate(from, "from"));
    conditions.push(`override_date >= $${params.length}`);
  }
  if (to) {
    params.push(assertIsoDate(to, "to"));
    conditions.push(`override_date <= $${params.length}`);
  }

  const result = await query(
    `
      SELECT
        id,
        user_id,
        workspace_id,
        override_date,
        start_time,
        end_time,
        is_available,
        note,
        created_at,
        updated_at
      FROM user_date_overrides
      WHERE ${conditions.join(" AND ")}
      ORDER BY override_date ASC, start_time ASC NULLS FIRST
    `,
    params,
    client
  );
  return result.rows;
}

async function createDateOverride(workspaceId, payload, client = null) {
  const data = normalizeDateOverride(payload);
  const result = await query(
    `
      INSERT INTO user_date_overrides (
        user_id, workspace_id, override_date, start_time, end_time, is_available, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        user_id,
        workspace_id,
        override_date,
        start_time,
        end_time,
        is_available,
        note,
        created_at,
        updated_at
    `,
    [
      workspaceId,
      workspaceId,
      data.overrideDate,
      data.startTime,
      data.endTime,
      data.isAvailable,
      data.note,
    ],
    client
  );
  return result.rows[0];
}

async function deleteDateOverride(workspaceId, overrideId, client = null) {
  const result = await query(
    `
      DELETE FROM user_date_overrides
      WHERE id = $1 AND workspace_id = $2
    `,
    [overrideId, workspaceId],
    client
  );
  if (!result.rowCount) throw notFound("Override not found");
  return { deleted: true };
}

module.exports = {
  normalizeWeeklySlot,
  getWeeklyAvailability,
  replaceWeeklyAvailability,
  normalizeDateOverride,
  listDateOverrides,
  createDateOverride,
  deleteDateOverride,
};
