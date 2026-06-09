# CI/CD 部署指南

Ouro Skill Store 部署到 Cloudflare Workers，使用 Wrangler CLI。

## 环境要求

- Node.js 20+ / Bun 1.0+
- Wrangler CLI (`npm i -g wrangler` 或 `bunx wrangler`)
- Cloudflare 账号（已登录 `wrangler login`）

## 部署流程

### 1. 确认改动已提交到 GitHub

```bash
cd ouro-store
git add .
git commit -m "your commit message"
git push origin main
```

### 2. 本地部署（Wrangler Deploy）

```bash
bun run deploy
# 等价于: npx wrangler deploy
```

### 3. 部署产物

| 资源 | 说明 |
|------|------|
| Worker 代码 | `ouro-store` 项目 |
| D1 数据库 | `ouro-store-db` (ID: `80b5c835-...`) |
| R2 存储桶 | `ouro-skill-bundles` |

### 4. 部署验证

- **Workers 默认域名**: https://ouro-store.shengguo620.workers.dev
- **自定义域名**: store.ouroskill.com
- **健康检查**: `curl https://ouro-store.shengguo620.workers.dev/api/health`

## 本地开发

```bash
# 安装依赖
bun install

# 首次创建本地 D1 数据库
bunx wrangler d1 create ouro-store-db

# 执行迁移（本地）
bunx wrangler d1 migrations apply ouro-store-db --local

# 配置环境变量
cp .env.example .dev.vars
# 编辑 .dev.vars 填入 GitHub OAuth 配置

# 启动开发服务器
bun run dev
# 访问 http://localhost:8788
```

## 环境变量（Secrets）

通过 `wrangler secret` 管理，不写入代码：

```bash
# 设置 secret
bunx wrangler secret put JWT_SECRET
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
bunx wrangler secret put APP_URL

# 查看所有 secret
bunx wrangler secret list
```

环境变量文件 `wrangler.toml` 配置：

```toml
name = "ouro-store"
main = "src/index.ts"
compatibility_date = "2025-03-01"
workers_dev = true

routes = [
  { pattern = "store.ouroskill.com", custom_domain = true }
]

[[d1_databases]]
binding = "DB"
database_name = "ouro-store-db"
database_id = "80b5c835-4541-449a-a99a-f85cdc174a78"

[[r2_buckets]]
binding = "SKILL_BUNDLES"
bucket_name = "ouro-skill-bundles"
```

## 数据库迁移

```bash
# 本地执行迁移
bun run migrate:local

# 生产环境执行迁移
bun run migrate:init

# 迁移文件位于 migrations/ 目录
```

## 常见问题

### 部署失败

1. 检查是否已登录：`wrangler whoami`
2. 查看 wrangler 版本：`wrangler --version`
3. 检查环境变量是否正确配置

### 数据库连接失败

确认 `wrangler.toml` 中的 D1 database_name 和 database_id 与 Cloudflare 控制台中一致。

### R2 桶不存在

```bash
bunx wrangler r2 bucket create ouro-skill-bundles
```

## 快速参考

```bash
# 一键部署（提交 + 部署）
git add . && git commit -m "update" && git push origin main && bun run deploy

# 查看部署日志
bunx wrangler pages functions log

# 回滚版本
# 在 Cloudflare Dashboard → Workers & Pages → ouro-store → Deployments → 选择旧版本 Rollback
```
