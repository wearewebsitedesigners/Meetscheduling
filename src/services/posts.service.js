const { query, withTransaction } = require("../db/pool");
const { badRequest, conflict, notFound } = require("../utils/http-error");
const { assertInteger, assertOptionalString, assertString } = require("../utils/validation");
const { slugify } = require("../utils/slug");

const POST_STATUSES = new Set(["draft", "published", "archived"]);

function normalizeStatus(value, fallback = "draft") {
  const status = String(value || fallback)
    .trim()
    .toLowerCase();
  if (!POST_STATUSES.has(status)) throw badRequest("status is invalid");
  return status;
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null) return [];
  if (!Array.isArray(tags)) throw badRequest("tags must be an array");
  const unique = new Set();
  tags.forEach((tag) => {
    const value = assertString(tag, "tag", { min: 1, max: 40 });
    unique.add(value);
  });
  return Array.from(unique);
}

function mapPostRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    authorUserId: row.author_user_id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || "",
    content: row.content || "",
    coverImageUrl: row.cover_image_url || "",
    status: row.status,
    publishedAt: row.published_at,
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadPostTags(workspaceId, postIds, client = null) {
  if (!postIds.length) return new Map();
  const result = await query(
    `
      SELECT
        l.post_id,
        t.name
      FROM post_tag_links l
      JOIN post_tags t ON t.id = l.tag_id
      WHERE l.workspace_id = $1
        AND l.post_id = ANY($2::uuid[])
      ORDER BY t.name ASC
    `,
    [workspaceId, postIds],
    client
  );

  const map = new Map();
  result.rows.forEach((row) => {
    if (!map.has(row.post_id)) map.set(row.post_id, []);
    map.get(row.post_id).push(row.name);
  });
  return map;
}

async function applyPostTags(client, workspaceId, postId, tags) {
  await query(
    `
      DELETE FROM post_tag_links
      WHERE workspace_id = $1
        AND post_id = $2
    `,
    [workspaceId, postId],
    client
  );

  if (!tags.length) return;

  for (const tagName of tags) {
    const name = assertString(tagName, "tag", { min: 1, max: 40 });
    const slug = slugify(name);
    if (!slug) continue;

    const insertedTag = await query(
      `
        INSERT INTO post_tags (workspace_id, name, slug, created_at)
        VALUES ($1,$2,$3,NOW())
        ON CONFLICT (workspace_id, slug)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `,
      [workspaceId, name, slug],
      client
    );

    const tagId = insertedTag.rows[0].id;

    await query(
      `
        INSERT INTO post_tag_links (post_id, tag_id, workspace_id, created_at)
        VALUES ($1,$2,$3,NOW())
        ON CONFLICT (post_id, tag_id) DO NOTHING
      `,
      [postId, tagId, workspaceId],
      client
    );
  }
}

async function listPosts(workspaceId, { status = "all", search = "", limit = 100 } = {}) {
  const safeStatus = String(status || "all")
    .trim()
    .toLowerCase();
  if (safeStatus !== "all" && !POST_STATUSES.has(safeStatus)) {
    throw badRequest("status is invalid");
  }

  const safeSearch = assertOptionalString(search, "search", { max: 200 });
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 300 });

  const params = [workspaceId];
  const conditions = ["workspace_id = $1"];

  if (safeStatus !== "all") {
    params.push(safeStatus);
    conditions.push(`status = $${params.length}`);
  }

  if (safeSearch) {
    params.push(`%${safeSearch}%`);
    const idx = params.length;
    conditions.push(`(title ILIKE $${idx} OR excerpt ILIKE $${idx} OR content ILIKE $${idx})`);
  }

  params.push(safeLimit);

  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        author_user_id,
        slug,
        title,
        excerpt,
        content,
        cover_image_url,
        status,
        published_at,
        seo_title,
        seo_description,
        created_at,
        updated_at
      FROM posts
      WHERE ${conditions.join(" AND ")}
      ORDER BY updated_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  const postIds = result.rows.map((row) => row.id);
  const tagsMap = await loadPostTags(workspaceId, postIds);

  return result.rows.map((row) => {
    const tags = tagsMap.get(row.id) || [];
    return mapPostRow({ ...row, tags });
  });
}

async function createPost(workspaceId, userId, payload = {}) {
  const title = assertString(payload.title, "title", { min: 3, max: 220 });
  const slugInput = assertOptionalString(payload.slug, "slug", { max: 220 });
  const slug = slugify(slugInput || title);
  if (!slug) throw badRequest("slug is invalid");

  const excerpt = assertOptionalString(payload.excerpt, "excerpt", { max: 600 });
  const content = assertOptionalString(payload.content, "content", { max: 500000 });
  const coverImageUrl = assertOptionalString(payload.coverImageUrl, "coverImageUrl", {
    max: 1000,
  });
  const seoTitle = assertOptionalString(payload.seoTitle, "seoTitle", { max: 180 });
  const seoDescription = assertOptionalString(payload.seoDescription, "seoDescription", {
    max: 300,
  });
  const status = normalizeStatus(payload.status || "draft");
  const tags = normalizeTags(payload.tags);
  const publishedAt =
    status === "published"
      ? payload.publishedAt
        ? new Date(payload.publishedAt)
        : new Date()
      : null;

  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    throw badRequest("publishedAt is invalid");
  }

  return withTransaction(async (client) => {
    try {
      const result = await query(
        `
          INSERT INTO posts (
            workspace_id,
            author_user_id,
            slug,
            title,
            excerpt,
            content,
            cover_image_url,
            status,
            published_at,
            seo_title,
            seo_description,
            created_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
          RETURNING
            id,
            workspace_id,
            author_user_id,
            slug,
            title,
            excerpt,
            content,
            cover_image_url,
            status,
            published_at,
            seo_title,
            seo_description,
            created_at,
            updated_at
        `,
        [
          workspaceId,
          userId,
          slug,
          title,
          excerpt,
          content,
          coverImageUrl,
          status,
          publishedAt ? publishedAt.toISOString() : null,
          seoTitle,
          seoDescription,
        ],
        client
      );

      const post = result.rows[0];
      await applyPostTags(client, workspaceId, post.id, tags);

      await query(
        `
          INSERT INTO post_revisions (
            post_id,
            workspace_id,
            editor_user_id,
            title,
            content,
            excerpt,
            created_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,NOW())
        `,
        [post.id, workspaceId, userId, title, content, excerpt],
        client
      );

      const withTags = await loadPostTags(workspaceId, [post.id], client);
      return mapPostRow({ ...post, tags: withTags.get(post.id) || [] });
    } catch (error) {
      if (error && error.code === "23505") {
        throw conflict("Post with this slug already exists");
      }
      throw error;
    }
  });
}

async function getPost(workspaceId, postId) {
  const idOrSlug = assertString(postId, "id", { min: 2, max: 220 });

  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        author_user_id,
        slug,
        title,
        excerpt,
        content,
        cover_image_url,
        status,
        published_at,
        seo_title,
        seo_description,
        created_at,
        updated_at
      FROM posts
      WHERE workspace_id = $1
        AND (id::text = $2 OR slug = $2)
      LIMIT 1
    `,
    [workspaceId, idOrSlug]
  );

  const row = result.rows[0];
  if (!row) throw notFound("Post not found");

  const tagsMap = await loadPostTags(workspaceId, [row.id]);
  return mapPostRow({ ...row, tags: tagsMap.get(row.id) || [] });
}

async function updatePost(workspaceId, userId, postId, payload = {}) {
  return withTransaction(async (client) => {
    const current = await getPost(workspaceId, postId);

    const title =
      payload.title === undefined
        ? current.title
        : assertString(payload.title, "title", { min: 3, max: 220 });

    const slug =
      payload.slug === undefined
        ? current.slug
        : slugify(assertString(payload.slug, "slug", { min: 2, max: 220 }));

    if (!slug) throw badRequest("slug is invalid");

    const excerpt =
      payload.excerpt === undefined
        ? current.excerpt
        : assertOptionalString(payload.excerpt, "excerpt", { max: 600 });

    const content =
      payload.content === undefined
        ? current.content
        : assertOptionalString(payload.content, "content", { max: 500000 });

    const coverImageUrl =
      payload.coverImageUrl === undefined
        ? current.coverImageUrl
        : assertOptionalString(payload.coverImageUrl, "coverImageUrl", { max: 1000 });

    const seoTitle =
      payload.seoTitle === undefined
        ? current.seoTitle
        : assertOptionalString(payload.seoTitle, "seoTitle", { max: 180 });

    const seoDescription =
      payload.seoDescription === undefined
        ? current.seoDescription
        : assertOptionalString(payload.seoDescription, "seoDescription", { max: 300 });

    const status =
      payload.status === undefined ? current.status : normalizeStatus(payload.status, current.status);

    const publishedAt =
      status === "published"
        ? payload.publishedAt
          ? new Date(payload.publishedAt)
          : current.publishedAt || new Date()
        : null;

    if (publishedAt && Number.isNaN(new Date(publishedAt).getTime())) {
      throw badRequest("publishedAt is invalid");
    }

    const tags = payload.tags === undefined ? current.tags : normalizeTags(payload.tags);

    try {
      const result = await query(
        `
          UPDATE posts
          SET
            title = $1,
            slug = $2,
            excerpt = $3,
            content = $4,
            cover_image_url = $5,
            status = $6,
            published_at = $7,
            seo_title = $8,
            seo_description = $9,
            updated_at = NOW()
          WHERE workspace_id = $10
            AND id = $11
          RETURNING
            id,
            workspace_id,
            author_user_id,
            slug,
            title,
            excerpt,
            content,
            cover_image_url,
            status,
            published_at,
            seo_title,
            seo_description,
            created_at,
            updated_at
        `,
        [
          title,
          slug,
          excerpt,
          content,
          coverImageUrl,
          status,
          publishedAt ? new Date(publishedAt).toISOString() : null,
          seoTitle,
          seoDescription,
          workspaceId,
          current.id,
        ],
        client
      );

      if (!result.rows[0]) throw notFound("Post not found");

      await applyPostTags(client, workspaceId, current.id, tags);

      await query(
        `
          INSERT INTO post_revisions (
            post_id,
            workspace_id,
            editor_user_id,
            title,
            content,
            excerpt,
            created_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,NOW())
        `,
        [current.id, workspaceId, userId, title, content, excerpt],
        client
      );

      const tagsMap = await loadPostTags(workspaceId, [current.id], client);
      return mapPostRow({ ...result.rows[0], tags: tagsMap.get(current.id) || [] });
    } catch (error) {
      if (error && error.code === "23505") {
        throw conflict("Post with this slug already exists");
      }
      throw error;
    }
  });
}

async function deletePost(workspaceId, postId) {
  const current = await getPost(workspaceId, postId);

  const result = await query(
    `
      DELETE FROM posts
      WHERE workspace_id = $1
        AND id = $2
    `,
    [workspaceId, current.id]
  );

  if (!result.rowCount) throw notFound("Post not found");
  return { deleted: true, id: current.id };
}

module.exports = {
  listPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
};
