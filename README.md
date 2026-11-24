# fhfs

`fhfs-site` 的 TanStack Start 版本。保留原站的中英双语、文章、软件、生活内容、33 个动效实验、3D 场景、音乐和主题切换；使用 React 19、TanStack Router、Tailwind CSS、Vite+ 和 Void。

线上地址：[fhfs.fhfs.workers.dev](https://fhfs.fhfs.workers.dev)。通过 Void 发布到 Cloudflare Workers。相同应用也可用 Nitro 部署到 `fhfs-projects/fhfs`，两端共享数据库和媒体服务。

## 本地开发

需要 Node 24 和 pnpm 11。Vite+ 管理开发、构建、Lint、格式和测试。

```sh
pnpm install
# 创建根目录 .env；Void 的变量定义在 env.ts，说明在 docs/DEPLOYMENT.md
pnpm dev
pnpm check
pnpm build
pnpm build:vercel
pnpm preview --port 4173
pnpm smoke http://127.0.0.1:4173
# 杂志卡片的原生 3D / HTML 回退浏览器检查（需本机 Chrome）
node scripts/smoke-magazine.mjs http://127.0.0.1:4173
```

`pnpm assets` 从原始 `public/` 和内容哈希清单生成 `.generated/public/`，包括字体和 Draco 目录的哈希地址。构建前自动执行，不改写原始资源。

电影与偶像的本地 JPEG 同时生成 480 / 768 / 1200 像素宽的候选图（不放大、不保留比原图更大的文件），由 `src/lib/responsive-images.gen.json` 映射到原图哈希地址。公共 Image 按现有 sizes 交给浏览器选图；全屏剧照使用原图。派生图保留原图许可，仅在构建时使用 sharp，不改变共享媒体 Worker 的上传协议。

## 数据与后台

- 内容继续从原站的 Neon Postgres 读取，沿用 Drizzle schema；部署不创建数据库、不迁移或导入数据。
- 后台按首页、文章、软件、实验室、生活和关于等前台栏目组织。栏目页提供页面文案和内容编辑入口，导入笔记可直接在「文章」或「不能说的秘密」编辑。
- 峰言峰语的图片、视频和音频继续使用 `fhfs-media.fhfs.workers.dev`；上传需要配置兼容现有媒体 Worker 的 `MEDIA_UPLOAD_SECRET`。
- 应用、后台和部署独立于 `fhfs-site.vercel.app`。`/admin` 使用本部署的登录、编辑和预览页面；必须配置本应用的 `AUTH_SECRET`、`ADMIN_PASSWORD_HASH`，所有保存和删除继续逐次检查会话。
- 本应用公开内容缓存最多保留 30 秒，仅保存已完成的数据；后台与授权预览绕过公开缓存。保存立即清除本部署的相关缓存，原站缓存由原站管理。
- 公开 Open Graph 图片和后台图标在构建时生成，由各自部署提供。图片、字体、模型和音乐随站构建。原素材许可保留在 `LICENSE` 和 `docs/CREDITS.md`。

## 结构

- `src/routes/`：TanStack 文件路由和服务端函数入口。
- `src/app/`：页面视图和邻接的 `page.server.tsx` 数据加载器；不是 Next.js 路由目录。
- `src/lib/server/content.ts`：公开内容读取层；参数化、带标签且最多缓存 30 秒。
- `src/start.ts`：TanStack 请求中间件，负责安全头、缓存请求作用域和跨站写入保护。
- `src/lib/client/gsap.ts`：浏览器动画入口。服务端通过 Vite 的环境解析使用惰性占位实现，不启动 Worker 全局计时器。
- `env.ts` / `void.config.ts`：环境变量契约和 Void 部署配置。

原设计、字体、内容恢复和媒体服务的文档保留在 `docs/`，其中旧版 Next.js 的记录适用于原 `fhfs-site`。双平台部署以本文和 `docs/DEPLOYMENT.md` 为准。

新站的独立公网巡检、Healthchecks 告警、Cloudflare 运行日志与隔离后台验证见 [docs/OPERATIONS.md](docs/OPERATIONS.md)。共享数据备份和媒体清理的交接步骤也记录在该文档。

## 部署

GitHub `main` 分支推送后，Actions 先运行检查、测试与构建，通过后使用 Void 官方 CLI 更新现有 Cloudflare Worker，并执行线上 smoke。Vercel 通过自己的 Git 集成部署已配置的生产分支。Cloudflare 手动发布使用 `pnpm run deploy:cloudflare`。详细说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。
