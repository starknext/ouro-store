import type {
  DbPublishedSkill,
  DbUser,
  DbSkillVersion,
  DbSkillRating,
  PublishedSkill,
  SkillVersion,
  SkillRating,
  SkillManifest,
} from '../models/skill';

// ── D1 类型声明 ──

interface D1Result<T> {
  results: T[];
  success: boolean;
}

// ── Users ──

export async function upsertUser(db: D1Database, ghUser: {
  id: number; login: string; avatar_url: string; name: string | null;
}): Promise<DbUser> {
  const existing = await db.prepare(
    'SELECT * FROM users WHERE github_id = ?',
  ).bind(ghUser.id).first<DbUser>();

  if (existing) {
    await db.prepare(
      `UPDATE users SET login = ?, avatar_url = ?, name = ?, updated_at = datetime('now')
       WHERE github_id = ?`,
    ).bind(ghUser.login, ghUser.avatar_url, ghUser.name, ghUser.id).run();
    return { ...existing, login: ghUser.login, avatar_url: ghUser.avatar_url, name: ghUser.name };
  }

  const res = await db.prepare(
    'INSERT INTO users (github_id, login, avatar_url, name) VALUES (?, ?, ?, ?)',
  ).bind(ghUser.id, ghUser.login, ghUser.avatar_url, ghUser.name).run();
  return { id: res.meta.last_row_id as number, github_id: ghUser.id, login: ghUser.login, avatar_url: ghUser.avatar_url, name: ghUser.name };
}

export async function getUserById(db: D1Database, id: number): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DbUser>();
}

export async function getUserByGithubId(db: D1Database, githubId: number): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE github_id = ?').bind(githubId).first<DbUser>();
}

// ── Published Skills ──

function rowToSkill(row: DbPublishedSkill, ratingAvg: number | null, ratingCount: number): PublishedSkill {
  return {
    id: row.id,
    name: row.name,
    latest_version: row.latest_version,
    description: row.description,
    author: { login: '', avatar_url: '' },
    tags: JSON.parse(row.tags),
    functions: JSON.parse(row.functions),
    home_url: row.home_url,
    compat_ouro_min: row.compat_ouro_min,
    downloads: row.downloads,
    rating_avg: ratingAvg,
    rating_count: ratingCount,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SKILL_WITH_RATING = `
  SELECT s.*,
    ROUND(AVG(r.score), 1) as rating_avg,
    COUNT(r.id) as rating_count
  FROM published_skills s
  LEFT JOIN skill_ratings r ON r.skill_id = s.id
`;

const SKILL_GROUP = 'GROUP BY s.id';

export async function searchSkills(
  db: D1Database,
  query: string,
  tag?: string,
  sort: 'downloads' | 'created' | 'rating' = 'downloads',
  limit = 20,
  offset = 0,
): Promise<{ skills: PublishedSkill[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query) {
    conditions.push('(s.name LIKE ? OR s.description LIKE ?)');
    params.push(`%${query}%`, `%${query}%`);
  }
  if (tag) {
    conditions.push('s.tags LIKE ?');
    params.push(`%"${tag}"%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = sort === 'rating' ? 'rating_avg DESC NULLS LAST' :
    sort === 'created' ? 's.created_at DESC' : 's.downloads DESC';

  const rows = await db.prepare(
    `${SKILL_WITH_RATING} ${where} ${SKILL_GROUP} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
  ).bind(...params, limit, offset).all<DbPublishedSkill & { rating_avg: number | null; rating_count: number }>();

  const totalRow = await db.prepare(
    `SELECT COUNT(*) as cnt FROM published_skills s ${where}`,
  ).bind(...params).first<{ cnt: number }>();

  const skills = rows.results.map(r => rowToSkill(r, r.rating_avg, r.rating_count));

  // 批量填充作者信息
  if (skills.length > 0) {
    const authorIds = [...new Set(rows.results.map(r => (r as unknown as DbPublishedSkill).author_id))];
    const authors = await db.prepare(
      `SELECT id, login, avatar_url FROM users WHERE id IN (${authorIds.map(() => '?').join(',')})`,
    ).bind(...authorIds).all<{ id: number; login: string; avatar_url: string }>();

    const authorMap = new Map(authors.results.map(a => [a.id, a]));
    for (const skill of skills) {
      const row = rows.results.find(r => r.name === skill.name);
      if (row) {
        const author = authorMap.get((row as unknown as DbPublishedSkill).author_id);
        if (author) skill.author = { login: author.login, avatar_url: author.avatar_url };
      }
    }
  }

  return { skills, total: totalRow?.cnt ?? 0 };
}

export async function getSkillDetail(db: D1Database, name: string): Promise<PublishedSkill | null> {
  const row = await db.prepare(
    `${SKILL_WITH_RATING} WHERE s.name = ? ${SKILL_GROUP}`,
  ).bind(name).first<DbPublishedSkill & { rating_avg: number | null; rating_count: number }>();

  if (!row) return null;

  const skill = rowToSkill(row, row.rating_avg, row.rating_count);
  const author = await getUserById(db, (row as unknown as DbPublishedSkill).author_id);
  if (author) skill.author = { login: author.login, avatar_url: author.avatar_url };

  return skill;
}

export async function createPublishedSkill(
  db: D1Database,
  userId: number,
  manifest: SkillManifest,
  r2Key: string,
  contentHash: string,
  fileSize: number,
): Promise<{ id: number }> {
  const exists = await db.prepare(
    'SELECT id FROM published_skills WHERE name = ?',
  ).bind(manifest.name).first<{ id: number }>();

  if (exists) {
    // 更新已有 skill
    await db.prepare(
      `UPDATE published_skills SET
        latest_version = ?, description = ?, tags = ?, functions = ?,
        compat_ouro_min = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(
      manifest.version,
      manifest.description,
      JSON.stringify(manifest.tags),
      JSON.stringify(manifest.functions),
      manifest.compat['ouro-min-version'] ?? '1.0.0',
      exists.id,
    ).run();

    await db.prepare(
      'INSERT INTO skill_versions (skill_id, version, changelog, r2_key, content_hash, file_size) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      exists.id, manifest.version, '', r2Key, contentHash, fileSize,
    ).run();

    return { id: exists.id };
  }

  const res = await db.prepare(
    `INSERT INTO published_skills
      (name, latest_version, description, author_id, tags, functions, compat_ouro_min)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    manifest.name,
    manifest.version,
    manifest.description,
    userId,
    JSON.stringify(manifest.tags),
    JSON.stringify(manifest.functions),
    manifest.compat['ouro-min-version'] ?? '1.0.0',
  ).run();

  const skillId = res.meta.last_row_id as number;

  await db.prepare(
    'INSERT INTO skill_versions (skill_id, version, changelog, r2_key, content_hash, file_size) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(
    skillId, manifest.version, '', r2Key, contentHash, fileSize,
  ).run();

  return { id: skillId };
}

export async function incrementDownloads(db: D1Database, name: string): Promise<void> {
  await db.prepare(
    'UPDATE published_skills SET downloads = downloads + 1 WHERE name = ?',
  ).bind(name).run();
}

// ── Versions ──

export async function getSkillVersions(db: D1Database, skillId: number): Promise<SkillVersion[]> {
  const rows = await db.prepare(
    'SELECT id, version, changelog, content_hash, file_size, created_at FROM skill_versions WHERE skill_id = ? ORDER BY created_at DESC',
  ).bind(skillId).all<DbSkillVersion>();

  return rows.results.map(r => ({
    id: r.id,
    version: r.version,
    changelog: r.changelog,
    content_hash: r.content_hash,
    file_size: r.file_size,
    created_at: r.created_at,
  }));
}

export async function getVersionR2Key(
  db: D1Database, skillId: number, version: string,
): Promise<string | null> {
  const row = await db.prepare(
    'SELECT r2_key FROM skill_versions WHERE skill_id = ? AND version = ?',
  ).bind(skillId, version).first<{ r2_key: string }>();

  return row?.r2_key ?? null;
}

// ── Ratings ──

export async function getSkillRatings(db: D1Database, skillId: number): Promise<SkillRating[]> {
  const rows = await db.prepare(
    `SELECT r.score, r.comment, r.created_at, u.login, u.avatar_url
     FROM skill_ratings r
     JOIN users u ON u.id = r.user_id
     WHERE r.skill_id = ?
     ORDER BY r.created_at DESC`,
  ).bind(skillId).all<{ score: number; comment: string; created_at: string; login: string; avatar_url: string }>();

  return rows.results.map(r => ({
    score: r.score,
    comment: r.comment,
    user: { login: r.login, avatar_url: r.avatar_url },
    created_at: r.created_at,
  }));
}

export async function upsertRating(
  db: D1Database, skillId: number, userId: number, score: number, comment: string,
): Promise<void> {
  await db.prepare(
    `INSERT INTO skill_ratings (skill_id, user_id, score, comment)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(skill_id, user_id) DO UPDATE SET score = excluded.score, comment = excluded.comment`,
  ).bind(skillId, userId, score, comment).run();
}
