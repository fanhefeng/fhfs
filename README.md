# fhfs

`fhfs-site` 的 TanStack Start 版本。保留原站的中英双语、文章、软件、生活内容、33 个动效实验、3D 场景、音乐和主题切换；使用 React 19、TanStack Router、Tailwind CSS、Vite+ 和 Void。

线上地址：[fhfs.fhfs.workers.dev](https://fhfs.fhfs.workers.dev)。通过 Void 官方 CLI 发布到 Cloudflare Workers，数据库和媒体服务与原站共享。

## 本地开发

需要 Node 24 和 pnpm 11。Vite+ 管理开发、构建、Lint、格式和测试。

```sh
pnpm install
# 创建根目录 .env；Void 的变量定义在 env.ts，说明在 docs/DEPLOYMENT.md
pnpm dev
pnpm check
pnpm build
pnpm preview --port 4173
pnpm smoke http://127.0.0.1:4173 --shared-admin
```

`pnpm assets` 从原始 `public/` 和内容哈希清单生成 `.generated/public/`，包括字体和 Draco 目录的哈希地址。构建前自动执行，不改写原始资源。

## 数据与后台

- 内容继续从原站的 Neon Postgres 读取，沿用 Drizzle schema；部署不创建数据库、不迁移或导入数据。
- 峰言峰语的图片、视频和音频继续使用 `fhfs-media.fhfs.workers.dev`；无需复制媒体或上传密钥。
- 默认 `ADMIN_MODE=shared`：`/admin` 使用原站管理入口。原后台保存会清除原站缓存，新站最多 30 秒读到改动，避免两套后台使原站缓存失效机制失配。
- 已迁移的原生 TanStack 后台可在隔离开发环境设置 `ADMIN_MODE=local` 启用，另外配置 `AUTH_SECRET`、`ADMIN_PASSWORD_HASH`，需要上传时再配置 `MEDIA_UPLOAD_SECRET`。所有保存和删除继续逐次检查会话。共享生产库时优先使用默认共享后台。
- 公开 Open Graph 图片继续调用原站图片生成端点；本地图片、字体、模型和音乐在新站部署。原素材许可保留在 `LICENSE` 和 `docs/CREDITS.md`。

## 结构

- `src/routes/`：TanStack 文件路由和服务端函数入口。
- `src/app/`：页面视图和邻接的 `page.server.tsx` 数据加载器；不是 Next.js 路由目录。
- `src/lib/server/content.ts`：公开内容读取层；参数化、带标签且最多缓存 30 秒。
- `src/start.ts`：TanStack 请求中间件，负责安全头、共享后台和跨站写入保护。
- `src/lib/client/gsap.ts`：浏览器动画入口。服务端通过 Vite 的环境解析使用惰性占位实现，不启动 Worker 全局计时器。
- `env.ts` / `void.config.ts`：环境变量契约和 Void 部署配置。

原设计、字体、内容恢复和媒体服务的文档保留在 `docs/`，其中 Next.js / Vercel 描述适用于原 `fhfs-site`；新站以本文和 `docs/DEPLOYMENT.md` 为准。

## 部署

GitHub `main` 分支推送后，Actions 先运行检查、测试与构建，通过后使用 Void 官方 CLI 更新现有 Cloudflare Worker，并执行线上 smoke。PR 只检查，不发布。详细说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。手动发布使用 `pnpm run deploy:cloudflare`。
