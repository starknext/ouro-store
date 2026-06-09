import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { createPublishedSkill } from '../db/queries';
import { uploadBundle } from '../db/storage';
import type { JwtPayload } from '../middleware/auth';
import type { PublishRequest, SkillManifest } from '../models/skill';

interface Env {
  DB: D1Database;
  SKILL_BUNDLES: R2Bucket;
}

const publish = new Hono<{ Bindings: Env }>();

publish.post('/', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const body = await c.req.json<PublishRequest>();

  // 基本校验
  if (!body.name || !body.version || !body.bundle) {
    return c.json({ success: false, error: 'name, version, bundle 是必需的' }, 400);
  }

  if (!/^[a-z0-9_-]+$/.test(body.name)) {
    return c.json({ success: false, error: 'name 只能包含小写字母、数字、横线和下划线' }, 400);
  }

  // 校验 bundle 格式
  let bundleData: ArrayBuffer;
  try {
    const binary = atob(body.bundle);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    bundleData = bytes.buffer;
  } catch {
    return c.json({ success: false, error: 'bundle 不是有效的 base64 编码' }, 400);
  }

  // 检查 bundle 大小限制（Cloudflare Workers 免费版限制请求体 10MB，这里限制 5MB）
  if (bundleData.byteLength > 5 * 1024 * 1024) {
    return c.json({ success: false, error: 'bundle 文件不能超过 5MB' }, 400);
  }

  // 构造 manifest
  const manifest: SkillManifest = {
    name: body.name,
    version: body.version,
    changelog: body.changelog ?? '',
    type: 'function',
    short_description: body.shortDescription ?? '',
    description: body.description ?? '',
    author: user.login,
    tags: body.tags ?? [],
    functions: body.functions ?? [],
    dependencies: body.dependencies ?? {},
    compat: { 'ouro-min-version': body.compat_ouro_min ?? '1.0.0' },
  };

  // 上传到 R2
  const { r2Key, contentHash, fileSize } = await uploadBundle(
    c.env.SKILL_BUNDLES,
    body.name,
    body.version,
    bundleData,
  );

  // 写入 DB
  const { id } = await createPublishedSkill(
    c.env.DB,
    user.userId,
    manifest,
    r2Key,
    contentHash,
    fileSize,
  );

  return c.json({
    success: true,
    skill: {
      id,
      name: manifest.name,
      version: manifest.version,
      downloads: 0,
    },
  }, 201);
});

export default publish;
