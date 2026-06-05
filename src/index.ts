import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import skillsRoutes from './routes/skills';
import publishRoutes from './routes/publish';

interface Env {
  DB: D1Database;
  SKILL_BUNDLES: R2Bucket;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  APP_URL: string;
  ENV: string;
}

const app = new Hono<{ Bindings: Env }>();

// ── 全局中间件 ──

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use('*', authMiddleware);

// ── API 路由 ──

app.route('/api/auth', authRoutes);
app.route('/api/skills', skillsRoutes);
app.route('/api/publish', publishRoutes);

// ── 健康检查 ──

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    service: 'ouro-store',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 静态页面（可选：商店前端） ──
// 未来可以挂 Cloudflare Pages 或直接在 Workers 里 serve 前端

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ouro Skill Store</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 80px auto; padding: 0 20px; text-align: center; }
    h1 { font-size: 2em; margin-bottom: 8px; }
    p { color: #666; line-height: 1.6; }
    .endpoints { text-align: left; background: #f5f5f5; padding: 16px 24px; border-radius: 8px; margin-top: 32px; }
    code { font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>🛒 Ouro Skill Store</h1>
  <p>Skills 统一分发平台。搜索、发布、安装 AI 智能体的 Skill 插件。</p>
  <div class="endpoints">
    <p><strong>API 端点:</strong></p>
    <p><code>GET  /api/health</code> — 健康检查</p>
    <p><code>GET  /api/skills?q=&tag=&sort=</code> — 搜索 Skills</p>
    <p><code>GET  /api/skills/:name</code> — Skill 详情</p>
    <p><code>GET  /api/skills/:name/download</code> — 下载包</p>
    <p><code>POST /api/publish</code> — 发布 Skill（需登录）</p>
    <p><code>GET  /api/auth/github/login</code> — GitHub 登录</p>
  </div>
</body>
</html>`);
});

// ── 错误处理 ──

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
});

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

export default app;
