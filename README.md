# Ouro Skill Store

Skills 统一分发平台。基于 Hono + Cloudflare Workers。

## 架构

```
Workers (Hono) ── D1 (SQLite) ── 元数据
               ── R2          ── .skill 包文件
```

## 快速开始

```bash
# 安装依赖
bun install

# 本地开发（需要先创建 D1 数据库）
bunx wrangler d1 create ouro-store-db         # 首次：创建数据库
bunx wrangler d1 migrations apply ouro-store-db --local  # 执行迁移
cp .env.example .dev.vars                      # 填写 GitHub OAuth 配置
bun run dev                                    # 启动 http://localhost:8788
```

## 部署

```bash
# 设置环境变量
bunx wrangler secret put JWT_SECRET
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
bunx wrangler secret put APP_URL

# 创建 R2 桶
bunx wrangler r2 bucket create ouro-skill-bundles

# 部署
bun run deploy
```

## API 端点

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/skills?q=&tag=&sort=` | 搜索 Skills |
| GET | `/api/skills/:name` | Skill 详情 |
| GET | `/api/skills/:name/versions` | 版本列表 |
| GET | `/api/skills/:name/download?version=` | 下载包 |
| GET | `/api/skills/:name/ratings` | 评价列表 |
| POST | `/api/skills/:name/ratings` | 提交评价（需登录） |
| POST | `/api/publish` | 发布 Skill（需登录） |
| GET | `/api/auth/github/login` | GitHub 登录 |
| GET | `/api/auth/github/callback` | OAuth 回调 |
| GET | `/api/auth/me` | 当前用户信息 |

## 与 ouro 本地集成

在 ouro 的 `PackagePanel.vue` 或 `npm-utils.js` 中添加商店 API 调用：

```js
// 搜索商店
const res = await fetch('https://ouro-store.workers.dev/api/skills?q=github')
const { skills } = await res.json()

// 下载安装
const res = await fetch(`https://ouro-store.workers.dev/api/skills/${name}/download`)
// 解压到 skills 目录
```
