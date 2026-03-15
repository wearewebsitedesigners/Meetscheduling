const { query, withTransaction } = require("../db/pool");
const env = require("../config/env");
const { getDomainProvider } = require("./domains/provider");
const { verifyDnsConfiguration } = require("./dns-verification.service");
const { badRequest, conflict, notFound } = require("../utils/http-error");
const {
  assertOptionalString,
  assertString,
} = require("../utils/validation");
const {
  buildDnsInstructions,
  normalizeDomain,
  normalizeHostHeader,
} = require("../utils/domain-utils");

function selectDomainColumns(prefix = "d") {
  return `
    ${prefix}.id,
    ${prefix}.user_id,
    ${prefix}.workspace_id,
    ${prefix}.domain,
    ${prefix}.normalized_domain,
    ${prefix}.target_type,
    ${prefix}.landing_page_id,
    ${prefix}.event_type_id,
    ${prefix}.status,
    ${prefix}.ssl_status,
    ${prefix}.verification_method,
    ${prefix}.dns_name,
    ${prefix}.dns_target,
    ${prefix}.provider,
    ${prefix}.verified_at,
    ${prefix}.created_at,
    ${prefix}.updated_at
  `;
}

function normalizeTargetType(value) {
  const next = assertString(value, "targetType", { min: 7, max: 20 })
    .trim()
    .toLowerCase();
  if (!["landing_page", "booking_page"].includes(next)) {
    throw badRequest("targetType must be landing_page or booking_page");
  }
  return next;
}

function deriveDnsSettings(domain) {
  const normalizedDomain = normalizeDomain(domain);
  const labels = normalizedDomain.split(".");
  const useARecord = labels.length === 2 && Array.isArray(env.domains.aRecordTargets) && env.domains.aRecordTargets.length > 0;
  const verificationMethod = useARecord ? "a_record" : "cname";
  const dnsInstructions = buildDnsInstructions(
    normalizedDomain,
    verificationMethod,
    useARecord ? env.domains.aRecordTargets[0] : env.domains.cnameTarget
  );

  return {
    normalizedDomain,
    verificationMethod,
    dnsName: dnsInstructions.name,
    dnsTarget: dnsInstructions.value,
  };
}

function mapDomainRow(row) {
  const dnsInstructions = buildDnsInstructions(
    row.normalized_domain,
    row.verification_method,
    row.dns_target
  );

  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    domain: row.domain,
    normalizedDomain: row.normalized_domain,
    targetType: row.target_type,
    landingPageId: row.landing_page_id || "",
    eventTypeId: row.event_type_id || "",
    status: row.status,
    sslStatus: row.ssl_status,
    verificationMethod: row.verification_method,
    dnsName: row.dns_name,
    dnsTarget: row.dns_target,
    dnsInstructions,
    provider: row.provider,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    connectedPage: {
      id: row.landing_page_id || row.event_type_id || "",
      title: row.landing_page_title || row.event_type_title || "Unassigned",
      slug: row.landing_page_slug || row.event_type_slug || "",
      type: row.target_type,
      username: row.username || "",
      shareUrl:
        row.target_type === "booking_page" && row.username && row.event_type_slug
          ? `/${row.username}/${row.event_type_slug}`
          : row.landing_page_slug
            ? `/${row.landing_page_slug}`
            : "",
    },
  };
}

async function getWorkspaceUser(workspaceId, client = null) {
  const result = await query(
    `
      SELECT id, username, display_name
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [workspaceId],
    client
  );
  const row = result.rows[0];
  if (!row) throw notFound("Workspace owner not found");
  return row;
}

async function assertLandingPageOwnership(workspaceId, landingPageId, client = null) {
  const safeId = assertString(landingPageId, "landingPageId", { min: 6, max: 80 });
  const result = await query(
    `
      SELECT id, title, slug
      FROM booking_pages
      WHERE id = $1
        AND workspace_id = $2
      LIMIT 1
    `,
    [safeId, workspaceId],
    client
  );
  const row = result.rows[0];
  if (!row) throw badRequest("landingPageId is invalid");
  return row;
}

async function assertEventTypeOwnership(workspaceId, eventTypeId, client = null) {
  const safeId = assertString(eventTypeId, "eventTypeId", { min: 6, max: 80 });
  const result = await query(
    `
      SELECT id, title, slug, is_active
      FROM event_types
      WHERE id = $1
        AND workspace_id = $2
      LIMIT 1
    `,
    [safeId, workspaceId],
    client
  );
  const row = result.rows[0];
  if (!row) throw badRequest("eventTypeId is invalid");
  return row;
}

async function getDomainRowForWorkspace(workspaceId, domainId, client = null) {
  const safeId = assertString(domainId, "domainId", { min: 6, max: 80 });
  const result = await query(
    `
      SELECT
${selectDomainColumns("d")},
        bp.title AS landing_page_title,
        bp.slug AS landing_page_slug,
        et.title AS event_type_title,
        et.slug AS event_type_slug,
        u.username
      FROM domains d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN booking_pages bp ON bp.id = d.landing_page_id
      LEFT JOIN event_types et ON et.id = d.event_type_id
      WHERE d.id = $1
        AND d.workspace_id = $2
      LIMIT 1
    `,
    [safeId, workspaceId],
    client
  );
  const row = result.rows[0];
  if (!row) throw notFound("Domain not found");
  return row;
}

function normalizeDomainPayload(payload = {}, { partial = false } = {}) {
  const next = {};

  if (!partial || payload.domain !== undefined) {
    next.domain = normalizeDomain(payload.domain);
  }

  if (!partial || payload.targetType !== undefined) {
    next.targetType = normalizeTargetType(payload.targetType);
  }

  if (!partial || payload.landingPageId !== undefined) {
    next.landingPageId = payload.landingPageId ? assertString(payload.landingPageId, "landingPageId", { min: 6, max: 80 }) : "";
  }

  if (!partial || payload.eventTypeId !== undefined) {
    next.eventTypeId = payload.eventTypeId ? assertString(payload.eventTypeId, "eventTypeId", { min: 6, max: 80 }) : "";
  }

  return next;
}

function validateTargetSelection(next) {
  if (next.targetType === "landing_page" && !next.landingPageId) {
    throw badRequest("landingPageId is required for landing page domains");
  }
  if (next.targetType === "booking_page" && !next.eventTypeId) {
    throw badRequest("eventTypeId is required for booking page domains");
  }
  if (next.targetType === "landing_page" && next.eventTypeId) {
    throw badRequest("booking page target cannot be set for landing page domains");
  }
  if (next.targetType === "booking_page" && next.landingPageId) {
    throw badRequest("landing page target cannot be set for booking page domains");
  }
}

async function listDomainsForUser(workspaceId) {
  const result = await query(
    `
      SELECT
${selectDomainColumns("d")},
        bp.title AS landing_page_title,
        bp.slug AS landing_page_slug,
        et.title AS event_type_title,
        et.slug AS event_type_slug,
        u.username
      FROM domains d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN booking_pages bp ON bp.id = d.landing_page_id
      LEFT JOIN event_types et ON et.id = d.event_type_id
      WHERE d.workspace_id = $1
      ORDER BY d.created_at DESC
    `,
    [workspaceId]
  );
  return result.rows.map(mapDomainRow);
}

async function listDomainTargetOptionsForUser(workspaceId) {
  const owner = await getWorkspaceUser(workspaceId);
  const [landingPagesResult, bookingPagesResult] = await Promise.all([
    query(
      `
        SELECT id, title, slug, created_at, updated_at
        FROM booking_pages
        WHERE workspace_id = $1
        ORDER BY updated_at DESC, created_at DESC
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT id, title, slug, is_active, created_at, updated_at
        FROM event_types
        WHERE workspace_id = $1
        ORDER BY updated_at DESC, created_at DESC
      `,
      [workspaceId]
    ),
  ]);

  return {
    landingPages: landingPagesResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      shareUrl: row.slug ? `/${row.slug}` : "",
      updatedAt: row.updated_at,
    })),
    bookingPages: bookingPagesResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      active: Boolean(row.is_active),
      shareUrl: owner.username && row.slug ? `/${owner.username}/${row.slug}` : "",
      updatedAt: row.updated_at,
    })),
  };
}

async function getDomainForUser(workspaceId, domainId) {
  const row = await getDomainRowForWorkspace(workspaceId, domainId);
  return mapDomainRow(row);
}

async function createDomainForUser(workspaceId, actorUserId, payload = {}) {
  const input = normalizeDomainPayload(payload, { partial: false });
  validateTargetSelection(input);
  const dns = deriveDnsSettings(input.domain);
  const provider = getDomainProvider();

  return withTransaction(async (client) => {
    const owner = await getWorkspaceUser(workspaceId, client);

    if (input.targetType === "landing_page") {
      await assertLandingPageOwnership(workspaceId, input.landingPageId, client);
    } else {
      await assertEventTypeOwnership(workspaceId, input.eventTypeId, client);
    }

    try {
      const result = await query(
        `
          INSERT INTO domains (
            user_id,
            workspace_id,
            domain,
            normalized_domain,
            target_type,
            landing_page_id,
            event_type_id,
            status,
            ssl_status,
            verification_method,
            dns_name,
            dns_target,
            provider
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,'pending','pending',$8,$9,$10,$11)
          RETURNING *
        `,
        [
          owner.id || actorUserId,
          workspaceId,
          input.domain,
          dns.normalizedDomain,
          input.targetType,
          input.targetType === "landing_page" ? input.landingPageId : null,
          input.targetType === "booking_page" ? input.eventTypeId : null,
          dns.verificationMethod,
          dns.dnsName,
          dns.dnsTarget,
          String(env.domains.provider || "local").trim().toLowerCase(),
        ],
        client
      );

      await provider.addDomain(result.rows[0]);
      const row = await getDomainRowForWorkspace(workspaceId, result.rows[0].id, client);
      return mapDomainRow(row);
    } catch (error) {
      if (String(error?.code || "") === "23505") {
        throw conflict("This domain is already connected");
      }
      throw error;
    }
  });
}

async function verifyDomainForUser(workspaceId, domainId) {
  const provider = getDomainProvider();
  const row = await getDomainRowForWorkspace(workspaceId, domainId);

  await query(
    `
      UPDATE domains
      SET status = 'verifying', updated_at = NOW()
      WHERE id = $1 AND workspace_id = $2
    `,
    [row.id, workspaceId]
  );

  try {
    const verification = await verifyDnsConfiguration(row);
    let nextStatus = verification.status || (verification.valid ? "verified" : "dns_invalid");
    let sslStatus = verification.sslStatus || "pending";

    if (verification.valid) {
      const ssl = await provider.getSslStatus(row);
      nextStatus = ssl.status || nextStatus;
      sslStatus = ssl.sslStatus || sslStatus;
    }

    const result = await query(
      `
        UPDATE domains
        SET
          status = $1,
          ssl_status = $2,
          verified_at = CASE WHEN $3 THEN COALESCE(verified_at, NOW()) ELSE NULL END,
          updated_at = NOW()
        WHERE id = $4 AND workspace_id = $5
        RETURNING *
      `,
      [nextStatus, sslStatus, Boolean(verification.valid), row.id, workspaceId]
    );
    const refreshed = await getDomainRowForWorkspace(workspaceId, result.rows[0].id);
    return {
      domain: mapDomainRow(refreshed),
      verification,
    };
  } catch (error) {
    await query(
      `
        UPDATE domains
        SET status = 'failed', ssl_status = 'failed', updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2
      `,
      [row.id, workspaceId]
    );
    throw error;
  }
}

async function updateDomainForUser(workspaceId, domainId, payload = {}) {
  const existing = await getDomainRowForWorkspace(workspaceId, domainId);
  const input = normalizeDomainPayload(payload, { partial: true });

  const next = {
    domain: input.domain || existing.domain,
    targetType: input.targetType || existing.target_type,
    landingPageId:
      input.landingPageId !== undefined ? input.landingPageId : existing.landing_page_id || "",
    eventTypeId:
      input.eventTypeId !== undefined ? input.eventTypeId : existing.event_type_id || "",
  };

  validateTargetSelection(next);
  const dns = deriveDnsSettings(next.domain);

  return withTransaction(async (client) => {
    const previousNormalizedDomain = existing.normalized_domain;

    if (next.targetType === "landing_page") {
      await assertLandingPageOwnership(workspaceId, next.landingPageId, client);
    } else {
      await assertEventTypeOwnership(workspaceId, next.eventTypeId, client);
    }

    try {
      await query(
        `
          UPDATE domains
          SET
            domain = $1,
            normalized_domain = $2,
            target_type = $3,
            landing_page_id = $4,
            event_type_id = $5,
            status = CASE WHEN normalized_domain = $2 THEN status ELSE 'pending' END,
            ssl_status = CASE WHEN normalized_domain = $2 THEN ssl_status ELSE 'pending' END,
            verification_method = $6,
            dns_name = $7,
            dns_target = $8,
            verified_at = CASE WHEN normalized_domain = $2 THEN verified_at ELSE NULL END,
            updated_at = NOW()
          WHERE id = $9 AND workspace_id = $10
        `,
        [
          next.domain,
          dns.normalizedDomain,
          next.targetType,
          next.targetType === "landing_page" ? next.landingPageId : null,
          next.targetType === "booking_page" ? next.eventTypeId : null,
          dns.verificationMethod,
          dns.dnsName,
          dns.dnsTarget,
          existing.id,
          workspaceId,
        ],
        client
      );
    } catch (error) {
      if (String(error?.code || "") === "23505") {
        throw conflict("This domain is already connected");
      }
      throw error;
    }

    const row = await getDomainRowForWorkspace(workspaceId, existing.id, client);
    if (previousNormalizedDomain !== row.normalized_domain) {
      await provider.removeDomain(existing).catch(() => null);
    }
    await provider.addDomain(row).catch(() => null);
    return mapDomainRow(row);
  });
}

async function deleteDomainForUser(workspaceId, domainId) {
  const existing = await getDomainRowForWorkspace(workspaceId, domainId);
  const provider = getDomainProvider();
  await provider.removeDomain(existing).catch(() => null);
  const result = await query(
    `
      DELETE FROM domains
      WHERE id = $1
        AND workspace_id = $2
      RETURNING id
    `,
    [existing.id, workspaceId]
  );
  if (!result.rows[0]) throw notFound("Domain not found");
  return { deleted: true, id: existing.id };
}

async function findDomainByNormalizedHost(host, { activeOnly = false } = {}) {
  const normalizedHost = normalizeHostHeader(host);
  if (!normalizedHost) return null;

  const params = [normalizedHost];
  let where = "d.normalized_domain = $1";
  if (activeOnly) {
    params.push(["active", "verified", "ssl_pending"]);
    where += " AND d.status = ANY($2::text[])";
  }

  const result = await query(
    `
      SELECT
${selectDomainColumns("d")},
        bp.title AS landing_page_title,
        bp.slug AS landing_page_slug,
        et.title AS event_type_title,
        et.slug AS event_type_slug,
        u.username
      FROM domains d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN booking_pages bp ON bp.id = d.landing_page_id
      LEFT JOIN event_types et ON et.id = d.event_type_id
      WHERE ${where}
      LIMIT 1
    `,
    params
  );
  const row = result.rows[0];
  if (!row) return null;
  return mapDomainRow(row);
}

module.exports = {
  createDomainForUser,
  deleteDomainForUser,
  findDomainByNormalizedHost,
  getDomainForUser,
  listDomainsForUser,
  listDomainTargetOptionsForUser,
  updateDomainForUser,
  verifyDomainForUser,
};
