import { Hono } from 'hono';
import { upsertUser } from '../db/queries';
import { signJwt } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';

interface Env {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  APP_URL: string;
}

const auth = new Hono<{ Bindings: Env }>();

// 发起 GitHub OAuth
auth.get('/github/login', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = `${c.env.APP_URL}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
  return c.redirect(url);
});

// GitHub OAuth 回调
auth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ success: false, error: '缺少 code 参数' }, 400);
  }

  // 交换 access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json<{ access_token?: string; error_description?: string }>();
  if (!tokenData.access_token) {
    return c.json({ success: false, error: tokenData.error_description ?? '获取 token 失败' }, 400);
  }

  // 获取用户信息
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const ghUser = await userRes.json<{ id: number; login: string; avatar_url: string; name: string | null }>();

  // 写入/更新 DB
  const dbUser = await upsertUser(c.env.DB, ghUser);

  // 签发 JWT
  const payload: JwtPayload = {
    userId: dbUser.id,
    login: dbUser.login,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 天有效
  };
  const token = await signJwt(payload, c.env.JWT_SECRET);

  return c.json({ success: true, token, user: { login: dbUser.login, avatar_url: dbUser.avatar_url } });
});

// 获取当前用户信息
auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: '未登录' }, 401);

  const dbUser = await c.env.DB.prepare(
    'SELECT id, login, avatar_url, name, created_at FROM users WHERE id = ?',
  ).bind(user.userId).first();

  return c.json({ success: true, user: dbUser });
});

export default auth;
