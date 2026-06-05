import type { Context, MiddlewareHandler } from 'hono';

// JWT 简单实现（不依赖外部库，用 Web Crypto API）
// Cloudflare Workers 原生支持 crypto.subtle

export interface JwtPayload {
  userId: number;
  login: string;
  exp: number;
}

const ALG = { name: 'HMAC', hash: 'SHA-256' };

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', enc, ALG, false, ['sign', 'verify']);
}

function base64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(ALG, key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${base64Url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const key = await getKey(secret);
    const sig = fromBase64Url(parts[2]);
    const valid = await crypto.subtle.verify(ALG, key, sig, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1]))) as JwtPayload;
    if (payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// 从请求中提取用户信息（注入到 c.set('user', payload)）
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const secret = c.env?.JWT_SECRET as string;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = await verifyJwt(token, secret);
    if (user) {
      c.set('user', user);
    }
  }

  await next();
};

// 要求必须登录
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') as JwtPayload | undefined;
  if (!user) {
    return c.json({ success: false, error: '需要登录' }, 401);
  }
  await next();
};

// 声明环境变量类型
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}
