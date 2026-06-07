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
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'ouro-store/0.1.0',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  // Handle both JSON and URL-encoded responses from GitHub
  const tokenText = await tokenRes.text();
  let tokenData: { access_token?: string; error_description?: string };
  try {
    tokenData = JSON.parse(tokenText);
  } catch {
    // Try URL-encoded format: access_token=xxx&scope=xxx
    try {
      const params = new URLSearchParams(tokenText);
      tokenData = {
        access_token: params.get('access_token') || undefined,
        error_description: params.get('error_description') || params.get('error') || undefined,
      };
    } catch {
      return c.json({ success: false, error: `无法解析 token 响应: status=${tokenRes.status}, body=${JSON.stringify(tokenText)}` }, 400);
    }
  }
  if (!tokenData.access_token) {
    return c.json({ success: false, error: tokenData.error_description ?? `获取 token 失败 (${tokenText.slice(0, 200)})` }, 400);
  }

  // 获取用户信息
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'ouro-store/0.1.0',
    },
  });
  const userText = await userRes.text();
  let ghUser: { id: number; login: string; avatar_url: string; name: string | null };
  try {
    ghUser = JSON.parse(userText);
  } catch {
    return c.json({ success: false, error: `GitHub API 返回非 JSON: status=${userRes.status}, body=${JSON.stringify(userText.slice(0, 500))}` }, 502);
  }

  // 写入/更新 DB
  const dbUser = await upsertUser(c.env.DB, ghUser);

  // 签发 JWT
  const payload: JwtPayload = {
    userId: dbUser.id,
    login: dbUser.login,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 天有效
  };
  const token = await signJwt(payload, c.env.JWT_SECRET);

  // 设置 httpOnly cookie 后跳转首页
  return c.html(
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录成功 — Ouro Store</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #f8f9fa;
      display: flex; justify-content: center; align-items: center; min-height: 100vh;
    }
    .card {
      background: white; border-radius: 12px; padding: 32px; max-width: 400px; width: 90%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08); text-align: center;
    }
    .avatar { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 12px; display: block; }
    h2 { font-size: 18px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 14px; margin-bottom: 20px; }
    .success { color: #22c55e; font-size: 40px; margin-bottom: 8px; }
    .hint { font-size: 12px; color: #999; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="success">✓</div>
    <h2>${dbUser.login}</h2>
    <p class="sub">登录成功，即将返回商店…</p>
    <p class="hint">页面将在 2 秒后自动跳转</p>
  </div>
  <script>
    // 如果是 popup 窗口（有 opener），通过 postMessage 传 token 回父窗口
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: 'store-auth', token: '${token}' }, '*');
      window.close();
    } else {
      setTimeout(function(){location.href='/'},2000);
    }
  </script>
</body>
</html>`,
    200,
    { 'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; Max-Age=${86400 * 7}; SameSite=Lax` },
  );
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
