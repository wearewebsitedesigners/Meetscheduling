const path = require("path");
const { query } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const { assertInteger, assertOptionalString, assertString } = require("../utils/validation");
const { uploadImageForUser } = require("./upload.service");

function mapFolderRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentFolderId: row.parent_folder_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFileRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    folderId: row.folder_id,
    uploadedByUserId: row.uploaded_by_user_id,
    originalName: row.original_name,
    displayName: row.display_name,
    storageKey: row.storage_key,
    publicUrl: row.public_url,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    widthPx: row.width_px,
    heightPx: row.height_px,
    metadata: row.metadata_json || {},
    isDeleted: !!row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGalleryRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    fileAssetId: row.file_asset_id,
    title: row.title,
    description: row.description || "",
    altText: row.alt_text || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    sortOrder: Number(row.sort_order || 0),
    isPublished: !!row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    file: row.file_id
      ? {
        id: row.file_id,
        url: row.public_url,
        displayName: row.file_display_name,
        mimeType: row.mime_type,
      }
      : null,
  };
}

async function ensureFolder(workspaceId, folderId) {
  if (!folderId) return null;
  const result = await query(
    `
      SELECT id
      FROM file_folders
      WHERE workspace_id = $1
        AND id = $2
      LIMIT 1
    `,
    [workspaceId, folderId]
  );
  if (!result.rows[0]) throw notFound("Folder not found");
  return result.rows[0].id;
}

async function listFiles(workspaceId, { folderId = "", search = "", includeDeleted = false } = {}) {
  const safeSearch = assertOptionalString(search, "search", { max: 200 });
  const safeIncludeDeleted = !!includeDeleted;

  const foldersPromise = query(
    `
      SELECT
        id,
        workspace_id,
        parent_folder_id,
        name,
        created_at,
        updated_at
      FROM file_folders
      WHERE workspace_id = $1
      ORDER BY name ASC
    `,
    [workspaceId]
  );

  const params = [workspaceId];
  const fileConditions = ["workspace_id = $1"];

  if (folderId) {
    params.push(folderId);
    fileConditions.push(`folder_id = $${params.length}`);
  }

  if (!safeIncludeDeleted) {
    fileConditions.push("is_deleted = FALSE");
  }

  if (safeSearch) {
    params.push(`%${safeSearch}%`);
    const idx = params.length;
    fileConditions.push(`(display_name ILIKE $${idx} OR original_name ILIKE $${idx})`);
  }

  const filesPromise = query(
    `
      SELECT
        id,
        workspace_id,
        folder_id,
        uploaded_by_user_id,
        original_name,
        display_name,
        storage_key,
        public_url,
        mime_type,
        size_bytes,
        width_px,
        height_px,
        metadata_json,
        is_deleted,
        created_at,
        updated_at
      FROM file_assets
      WHERE ${fileConditions.join(" AND ")}
      ORDER BY updated_at DESC
    `,
    params
  );

  const [foldersResult, filesResult] = await Promise.all([foldersPromise, filesPromise]);

  return {
    folders: foldersResult.rows.map(mapFolderRow),
    files: filesResult.rows.map(mapFileRow),
  };
}

async function createFolder(workspaceId, userId, payload = {}) {
  const name = assertString(payload.name, "name", { min: 1, max: 140 });
  const parentFolderId = payload.parentFolderId
    ? await ensureFolder(workspaceId, payload.parentFolderId)
    : null;

  const result = await query(
    `
      INSERT INTO file_folders (
        workspace_id,
        parent_folder_id,
        name,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,NOW(),NOW())
      RETURNING
        id,
        workspace_id,
        parent_folder_id,
        name,
        created_at,
        updated_at
    `,
    [workspaceId, parentFolderId, name, userId]
  );

  return mapFolderRow(result.rows[0]);
}

function inferStorageKeyFromUrl(url) {
  const clean = String(url || "").split("?")[0];
  return clean.replace(/^\/+/, "");
}

async function uploadFile(workspaceId, userId, payload = {}) {
  const folderId = payload.folderId ? await ensureFolder(workspaceId, payload.folderId) : null;
  const fileName = assertOptionalString(payload.fileName, "fileName", { max: 220 });

  const uploaded = await uploadImageForUser(userId, payload);
  const originalName = fileName || path.basename(uploaded.url);
  const displayName = originalName;

  const result = await query(
    `
      INSERT INTO file_assets (
        workspace_id,
        folder_id,
        uploaded_by_user_id,
        original_name,
        display_name,
        storage_key,
        public_url,
        mime_type,
        size_bytes,
        metadata_json,
        is_deleted,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,FALSE,NOW(),NOW())
      RETURNING
        id,
        workspace_id,
        folder_id,
        uploaded_by_user_id,
        original_name,
        display_name,
        storage_key,
        public_url,
        mime_type,
        size_bytes,
        width_px,
        height_px,
        metadata_json,
        is_deleted,
        created_at,
        updated_at
    `,
    [
      workspaceId,
      folderId,
      userId,
      originalName,
      displayName,
      inferStorageKeyFromUrl(uploaded.url),
      uploaded.url,
      uploaded.contentType,
      uploaded.bytes,
      JSON.stringify({ source: "uploads", bytes: uploaded.bytes }),
    ]
  );

  return mapFileRow(result.rows[0]);
}

async function updateFile(workspaceId, fileId, payload = {}) {
  const currentResult = await query(
    `
      SELECT
        id,
        workspace_id,
        folder_id,
        uploaded_by_user_id,
        original_name,
        display_name,
        storage_key,
        public_url,
        mime_type,
        size_bytes,
        width_px,
        height_px,
        metadata_json,
        is_deleted,
        created_at,
        updated_at
      FROM file_assets
      WHERE workspace_id = $1
        AND id = $2
      LIMIT 1
    `,
    [workspaceId, fileId]
  );

  const current = currentResult.rows[0];
  if (!current) throw notFound("File not found");

  const displayName =
    payload.displayName === undefined
      ? current.display_name
      : assertString(payload.displayName, "displayName", { min: 1, max: 220 });

  const folderId =
    payload.folderId === undefined
      ? current.folder_id
      : payload.folderId
        ? await ensureFolder(workspaceId, payload.folderId)
        : null;

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? payload.metadata
      : current.metadata_json || {};

  const result = await query(
    `
      UPDATE file_assets
      SET
        display_name = $1,
        folder_id = $2,
        metadata_json = $3::jsonb,
        updated_at = NOW()
      WHERE workspace_id = $4
        AND id = $5
      RETURNING
        id,
        workspace_id,
        folder_id,
        uploaded_by_user_id,
        original_name,
        display_name,
        storage_key,
        public_url,
        mime_type,
        size_bytes,
        width_px,
        height_px,
        metadata_json,
        is_deleted,
        created_at,
        updated_at
    `,
    [displayName, folderId, JSON.stringify(metadata), workspaceId, fileId]
  );

  return mapFileRow(result.rows[0]);
}

async function deleteFile(workspaceId, fileId) {
  const result = await query(
    `
      UPDATE file_assets
      SET
        is_deleted = TRUE,
        updated_at = NOW()
      WHERE workspace_id = $1
        AND id = $2
        AND is_deleted = FALSE
      RETURNING id
    `,
    [workspaceId, fileId]
  );

  if (!result.rows[0]) throw notFound("File not found");
  return { deleted: true, id: result.rows[0].id };
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null) return [];
  if (!Array.isArray(tags)) throw badRequest("tags must be an array");
  const unique = new Set();
  tags.forEach((tag) => {
    const text = assertString(tag, "tag", { min: 1, max: 60 });
    unique.add(text);
  });
  return Array.from(unique);
}

async function listGalleryItems(workspaceId, { limit = 100 } = {}) {
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 300 });

  const result = await query(
    `
      SELECT
        g.id,
        g.workspace_id,
        g.file_asset_id,
        g.title,
        g.description,
        g.alt_text,
        g.tags,
        g.sort_order,
        g.is_published,
        g.created_at,
        g.updated_at,
        f.id AS file_id,
        f.public_url,
        f.display_name AS file_display_name,
        f.mime_type
      FROM gallery_items g
      LEFT JOIN file_assets f ON f.id = g.file_asset_id
      WHERE g.workspace_id = $1
      ORDER BY g.sort_order ASC, g.created_at DESC
      LIMIT $2
    `,
    [workspaceId, safeLimit]
  );

  return result.rows.map(mapGalleryRow);
}

async function createGalleryItem(workspaceId, userId, payload = {}) {
  const title = assertString(payload.title, "title", { min: 2, max: 180 });
  const description = assertOptionalString(payload.description, "description", { max: 2000 });
  const altText = assertOptionalString(payload.altText, "altText", { max: 300 });
  const sortOrder = payload.sortOrder
    ? assertInteger(payload.sortOrder, "sortOrder", { min: -9999, max: 9999 })
    : 0;
  const tags = normalizeTags(payload.tags);

  const fileAssetId = payload.fileAssetId
    ? assertString(payload.fileAssetId, "fileAssetId", { min: 8, max: 80 })
    : null;

  if (fileAssetId) {
    const fileCheck = await query(
      `
        SELECT id
        FROM file_assets
        WHERE id = $1
          AND workspace_id = $2
          AND is_deleted = FALSE
        LIMIT 1
      `,
      [fileAssetId, workspaceId]
    );

    if (!fileCheck.rows[0]) {
      throw notFound("fileAssetId not found in workspace");
    }
  }

  const result = await query(
    `
      INSERT INTO gallery_items (
        workspace_id,
        file_asset_id,
        title,
        description,
        alt_text,
        tags,
        sort_order,
        is_published,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
      RETURNING
        id,
        workspace_id,
        file_asset_id,
        title,
        description,
        alt_text,
        tags,
        sort_order,
        is_published,
        created_at,
        updated_at,
        NULL::UUID AS file_id,
        NULL::TEXT AS public_url,
        NULL::TEXT AS file_display_name,
        NULL::TEXT AS mime_type
    `,
    [
      workspaceId,
      fileAssetId,
      title,
      description,
      altText,
      tags,
      sortOrder,
      payload.isPublished === undefined ? true : !!payload.isPublished,
      userId,
    ]
  );

  return mapGalleryRow(result.rows[0]);
}

async function deleteGalleryItem(workspaceId, galleryItemId) {
  const result = await query(
    `
      DELETE FROM gallery_items
      WHERE workspace_id = $1
        AND id = $2
      RETURNING id
    `,
    [workspaceId, galleryItemId]
  );

  if (!result.rows[0]) throw notFound("Gallery item not found");
  return { deleted: true, id: result.rows[0].id };
}

module.exports = {
  listFiles,
  createFolder,
  uploadFile,
  updateFile,
  deleteFile,
  listGalleryItems,
  createGalleryItem,
  deleteGalleryItem,
};
