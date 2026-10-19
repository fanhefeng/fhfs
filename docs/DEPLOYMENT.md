# Void 部署

新站已通过 Void 官方 CLI 发布到 Cloudflare Worker `fhfs`，线上地址为 [fhfs.fhfs.workers.dev](https://fhfs.fhfs.workers.dev)。2026-10-19 首次成功发布版本：`f8f8e4c8-a1f3-4bae-8cc6-2ceb2b8ea15a`。

使用 `void` 的官方 Cloudflare 登录，不读取或提取其他 CLI 的认证令牌：

```sh
pnpm exec void cloudflare login
pnpm exec void connect --platform cloudflare
```

## 最小生产配置

默认共享原后台，只需 `DATABASE_URL`。它是原站 Neon 数据库的连接串，必须作为加密 Worker Secret 配置，不能提交到 GitHub、不能使用 `VITE_` 前缀。该 Secret 让新站服务器能读取原站数据。默认不向新 Worker 复制原站登录、媒体上传、GitHub 或备份密钥。

只有用户明确批准共享数据库凭据到该 Worker 后，才执行下面的官方配置流程。将连接串交给 CLI 的隐藏输入框，不要放在命令行参数中：

```sh
pnpm exec void secret put DATABASE_URL
pnpm exec void env check --remote
CLOUDFLARE_WORKERS_SUBDOMAIN=fhfs pnpm run deploy
```

首次发布显式指定账户已有的 `workers.dev` 子域 `fhfs`，供 Void 的就绪检查使用；成功发布后 Void 会缓存它。`void.config.ts` 中的 `workers_dev: true` 启用正式访问地址。

生产环境仅配置了 `DATABASE_URL` 这一个加密 Secret。默认共享原后台，登录、上传、GitHub 等密钥均无需复制。

`SITE_URL` 可选；公开链接默认使用 `https://fhfs.fhfs.workers.dev`，使用自定义域名时在构建环境设置公开的 `VITE_SITE_URL`。生产 `ADMIN_MODE` 默认 `shared`，不要设置为 `local`。

本地 `.env` 与生产 Secrets 分开；Void 不会自动上传 `.env`。本地环境需要：

```dotenv
DATABASE_URL=postgresql://user:password@your-neon-host/database?sslmode=require
ADMIN_MODE=shared
```

要验证迁移后的独立后台，可在专用开发环境设置 `ADMIN_MODE=local` 并提供 `AUTH_SECRET`（至少 32 字符）、`ADMIN_PASSWORD_HASH`（原有 salt:hash 格式）。生产默认走共享后台，避免新后台写入后原站的 Next.js 缓存长时间不更新。

## 发布检查

```sh
pnpm check
pnpm build
pnpm preview --port 4173
pnpm smoke http://127.0.0.1:4173 --shared-admin
```

Smoke 读取 sitemap 并检查所有公开页面，以及双语 RSS/搜索、404、后台鉴权、跨站请求、哈希资源和安全头。它不登录、不写数据库、不上传或删除媒体。

2026-10-19 发布验证通过：`pnpm check` 的 411 项测试、生产构建，以及正式地址上的 120 个 sitemap 页面和上述接口检查。浏览器另验证了首页欢迎交互、页面内导航和语言切换。

部署不运行数据库迁移、种子或导入脚本。`void info` 应显示没有需要创建的持久化资源。共享数据库的 schema 继续由 `fhfs-site` 管理。

GitHub Actions 的 `check` 工作流运行质量检查与构建。生产部署保留为显式的 `pnpm deploy`，避免在缺少授权或配置时自动发布。
