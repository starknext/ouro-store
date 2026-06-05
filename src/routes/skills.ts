import { Hono } from 'hono';
import { searchSkills, getSkillDetail, getSkillVersions, getSkillRatings, upsertRating, incrementDownloads } from '../db/queries';
import { requireAuth } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import type { RateRequest } from '../models/skill';

interface Env {
  DB: D1Database;
  SKILL_BUNDLES: R2Bucket;
}

const skills = new Hono<{ Bindings: Env }>();

// 搜索 / 列表
skills.get('/', async (c) => {
  const q = c.req.query('q') ?? '';
  const tag = c.req.query('tag');
  const sort = (c.req.query('sort') ?? 'downloads') as 'downloads' | 'created' | 'rating';
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const result = await searchSkills(c.env.DB, q, tag, sort, limit, offset);
  return c.json({ success: true, ...result });
});

// 详情
skills.get('/:name', async (c) => {
  const name = c.req.param('name');
  const skill = await getSkillDetail(c.env.DB, name);
  if (!skill) return c.json({ success: false, error: 'Skill 不存在' }, 404);

  return c.json({ success: true, skill });
});

// 版本列表
skills.get('/:name/versions', async (c) => {
  const name = c.req.param('name');
  const skill = await getSkillDetail(c.env.DB, name);
  if (!skill) return c.json({ success: false, error: 'Skill 不存在' }, 404);

  const versions = await getSkillVersions(c.env.DB, skill.id);
  return c.json({ success: true, versions });
});

// 下载（增加下载计数并返回包体）
skills.get('/:name/download', async (c) => {
  const name = c.req.param('name');
  const version = c.req.query('version');
  const skill = await getSkillDetail(c.env.DB, name);
  if (!skill) return c.json({ success: false, error: 'Skill 不存在' }, 404);

  if (version) {
    const { getVersionR2Key } = await import('../db/queries');
    const r2Key = await getVersionR2Key(c.env.DB, skill.id, version);
    if (!r2Key) return c.json({ success: false, error: '版本不存在' }, 404);

    await incrementDownloads(c.env.DB, name);
    const obj = await c.env.SKILL_BUNDLES.get(r2Key);
    if (!obj) return c.json({ success: false, error: '包文件丢失' }, 404);

    return c.newResponse(obj.body, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${name}@${version}.skill.tar.gz"`,
      },
    });
  }

  // 下载最新版
  const { getVersionR2Key } = await import('../db/queries');
  const r2Key = await getVersionR2Key(c.env.DB, skill.id, skill.latest_version);
  if (!r2Key) return c.json({ success: false, error: '包文件丢失' }, 404);

  await incrementDownloads(c.env.DB, name);
  const obj = await c.env.SKILL_BUNDLES.get(r2Key);
  if (!obj) return c.json({ success: false, error: '包文件丢失' }, 404);

  return c.newResponse(obj.body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${name}@${skill.latest_version}.skill.tar.gz"`,
    },
  });
});

// 评价列表
skills.get('/:name/ratings', async (c) => {
  const name = c.req.param('name');
  const skill = await getSkillDetail(c.env.DB, name);
  if (!skill) return c.json({ success: false, error: 'Skill 不存在' }, 404);

  const ratings = await getSkillRatings(c.env.DB, skill.id);
  return c.json({ success: true, ratings });
});

// 提交/更新评价
skills.post('/:name/ratings', requireAuth, async (c) => {
  const name = c.req.param('name');
  const user = c.get('user') as JwtPayload;
  const body = await c.req.json<RateRequest>();

  if (!body.score || body.score < 1 || body.score > 5) {
    return c.json({ success: false, error: '评分必须在 1-5 之间' }, 400);
  }

  const skill = await getSkillDetail(c.env.DB, name);
  if (!skill) return c.json({ success: false, error: 'Skill 不存在' }, 404);

  await upsertRating(c.env.DB, skill.id, user.userId, body.score, body.comment ?? '');
  return c.json({ success: true });
});

export default skills;
