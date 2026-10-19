# Void 部署

新站已通过 Void 官方 CLI 发布到 Cloudflare Worker `fhfs`，线上地址为 [fhfs.fhfs.workers.dev](https://fhfs.fhfs.workers.dev)。2026-10-19 首次成功发布版本：`f8f8e4c8-a1f3-4bae-8cc6-2ceb2b8ea15a`。

## GitHub main 自动部署

工作流位于 `.github/workflows/check.yml`：推送到 `main` 后先运行 `pnpm check` 和 `pnpm build`，成功后用 Void 发布到现有 Worker `fhfs`，最后检查 sitemap 中的公开页面、本部署的后台鉴权和分享图片。PR 只运行检查；Actions 页面也可手动运行工作流。

部署任务通过 `fhfs-production` 并发组串行执行，不中断正在进行的发布。每次发布前核对远端 `main` 的提交，避免较旧的检查任务覆盖新版本。

需要在仓库 Actions Secrets 中保存专用的 `CLOUDFLARE_API_TOKEN`，权限限制到此账户下的目标 Worker。账户 ID 和 `workers.dev` 子域是公开配置，已在工作流中固定。`DATABASE_URL` 继续保存在现有 Worker 的加密 Secret 中，不需要复制到 GitHub，也不运行数据库迁移。

只使用 Cloudflare 部署目标；`pnpm run deploy` 和 `pnpm run deploy:cloudflare` 都先生成 `.generated/public` 中的哈希资源，再显式选择 `--platform cloudflare`。Void CLI 内部构建不运行 `package.json` 的 build 脚本，因此每次发布都必须执行资源生成，不能依赖本地已有目录或其他 CI 任务的构建产物。Void Cloud 托管部署已取消。

## 现有 Cloudflare 部署

使用 `void` 的官方 Cloudflare 登录，不读取或提取其他 CLI 的认证令牌：

```sh
pnpm exec void cloudflare login
pnpm exec void connect --platform cloudflare
```

## 最小生产配置

应用与后台独立于原站，数据和媒体服务仍按项目约定共享。以下三项必须作为本 Worker 的加密 Secret 配置，不能提交到 GitHub、不能使用 `VITE_` 前缀：

- `DATABASE_URL`：现有 Neon 数据库连接串，沿用兼容 schema。
- `AUTH_SECRET`：为本应用生成的至少 32 字符随机会话密钥。
- `ADMIN_PASSWORD_HASH`：本应用管理员密码的 scrypt `salt:hash` 值。

需要上传媒体时配置 `MEDIA_UPLOAD_SECRET`，它必须与共享媒体 Worker 的上传租约协议匹配。GitHub 等集成功能按需配置。不要自动复制原站登录或集成密钥。

只有用户明确批准共享数据库凭据到该 Worker 后，才执行下面的官方配置流程。将连接串交给 CLI 的隐藏输入框，不要放在命令行参数中：

```sh
pnpm exec void secret put DATABASE_URL
pnpm exec void secret put AUTH_SECRET
pnpm exec void secret put ADMIN_PASSWORD_HASH
pnpm exec void env check --remote
CLOUDFLARE_WORKERS_SUBDOMAIN=fhfs pnpm run deploy
```

首次发布显式指定账户已有的 `workers.dev` 子域 `fhfs`，供 Void 的就绪检查使用；成功发布后 Void 会缓存它。`void.config.ts` 中的 `workers_dev: true` 启用正式访问地址。

此前共享后台版本的生产环境仅配置了 `DATABASE_URL`。首次发布独立后台之前，必须补齐 `AUTH_SECRET` 和 `ADMIN_PASSWORD_HASH`；Void 会检查必需 Secret 是否存在，不会自动上传本地 `.env`。

公开链接默认使用 `https://fhfs.fhfs.workers.dev`，使用自定义域名时在构建环境设置公开的 `VITE_SITE_URL`。`ADMIN_MODE` 已移除；后台始终留在本部署，不跳转到原站。分享图片和后台图标由本 Worker 生成，`ASSETS` 绑定提供本地字体。

本地 `.env` 与生产 Secrets 分开；Void 不会自动上传 `.env`。本地环境需要：

```dotenv
DATABASE_URL=postgresql://user:password@your-neon-host/database?sslmode=require
AUTH_SECRET=<本地随机会话密钥>
ADMIN_PASSWORD_HASH=<本地管理员密码的 salt:hash>
```

本应用的公开内容缓存最长 30 秒，保存时立即清除本部署的相关缓存。后台与授权预览绕过公开缓存。原站的缓存策略由原站维护，本应用不依赖原站的页面、图片接口或缓存失效接口。

## 发布检查

```sh
pnpm check
pnpm build
pnpm preview --port 4173
pnpm smoke http://127.0.0.1:4173
```

Smoke 读取 sitemap 并检查所有公开页面，以及双语 RSS/搜索、本地分享图片、404、本部署的后台登录跳转、跨站请求、哈希资源和安全头。它不登录、不写数据库、不上传或删除媒体。写入验证必须使用明确隔离的测试数据库，并先检查其保护标记。

2026-10-19 发布验证通过：`pnpm check` 的 411 项测试、生产构建，以及正式地址上的 120 个 sitemap 页面和上述接口检查。浏览器另验证了首页欢迎交互、页面内导航和语言切换。

部署不运行数据库迁移、种子或导入脚本。`void info` 应显示没有需要创建的持久化资源。共享数据库的 schema 继续由 `fhfs-site` 管理。

GitHub Actions 在 main 检查通过后自动发布。排障时可在 Actions 页面重跑工作流，或使用 `pnpm run deploy:cloudflare` 手动发布。
