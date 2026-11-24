# Cloudflare 与 Vercel 部署

新站已通过 Void 官方 CLI 发布到 Cloudflare Worker `fhfs`，线上地址为 [fhfs.fhfs.workers.dev](https://fhfs.fhfs.workers.dev)。2026-10-19 首次成功发布版本：`f8f8e4c8-a1f3-4bae-8cc6-2ceb2b8ea15a`。

## 双平台部署

两个站点从同一份 TanStack Start 代码构建。Cloudflare 使用 Void 和现有的 `fhfs` Worker，Vercel 使用 Nitro 和现有的 `fhfs-projects/fhfs` 项目。两端各自运行公开页面、API 和后台，沿用同一 Neon schema 和媒体 Worker。

- Cloudflare 使用 `pnpm build` 和 `pnpm deploy:cloudflare`，继续服务 `fhfs.fhfs.workers.dev`。
- Vercel 使用 `pnpm build:vercel`，通过 `vercel.json` 选择 TanStack Start。产物位于 `.vercel/output`，默认生产地址为 `https://fhfs.vercel.app`。需要变更规范地址时，设置该项目的 `VITE_SITE_URL`。
- Vercel Production 配置 `DATABASE_URL`、独立生成的 `AUTH_SECRET`、`ADMIN_PASSWORD_HASH` 和兼容共享媒体 Worker 的 `MEDIA_UPLOAD_SECRET`。按目标服务配置 `GITHUB_WEBHOOK_SECRET` 和可选 `GITHUB_TOKEN`。Preview 使用隔离数据和会话配置，生产密钥只进入 Production。
- 在两端分别核对生产域名、公开页面、搜索、RSS、分享图和后台登录边界。后台写入验收只使用明确隔离的测试数据库与媒体。备份、巡检、媒体清理和 Webhook 的交接见 [OPERATIONS.md](OPERATIONS.md)。

## 2026-11-11 断环印记组件体系

正式流量已在 Cloudflare 控制台切至版本前缀 `ef0b2a5a`，比例 100%。候选预览为
[ef0b2a5a-fhfs.fhfs.workers.dev](https://ef0b2a5a-fhfs.fhfs.workers.dev)。本轮最初发布版本为
`8096edb3-c17c-4c71-96f0-c97b7d4b3232`；UI 改动前的回滚参照为
`7ea2609c-a136-4a48-b565-83a54fb08d34`。

前后台共用组件与字级规范见 [UI-COMPONENTS.md](UI-COMPONENTS.md)。图标更新为 52 枚原创
「断环印记」，图录位于 `/icons/`。按钮、字段、选择器、状态提示和加载反馈统一使用共用皮肤；
保留中文圆体、英文分工、原有霓虹与三维场景。保存、失败、搜索重试及打印/响应式显隐均已验收。

最终候选由 Void 官方 CLI 构建并上传；CLI 在上传后的版本列表校验阶段中断，尚未激活。
随后在官方控制台核对候选与当前版本、相同的配置摘要，以及候选预览的实际代码表现：
`index-B3jKSjQa.css` 与验收构建逐字一致，SHA-256 为
`48dba0d6dc95cdba4c51c73734cd072e38211dc74b3e6ee849acf7efd0d47c3f`；
`admin-BAwyO-D1.css` 也逐字一致。候选的简历打印、桌面/手机搜索关闭和字段聚焦通过后，
经控制台的明确版本提升流程激活至 100%。正式域名的 CSS 和同一组浏览器流程再次通过。

`pnpm check` 的 546 项测试、生产构建、15 项隔离后台流程及最终正式域名的 191 页 smoke 通过。
后台写入仅针对带端点与保护
标记校验的 `fhfs_e2e`；公开页面、鉴权和图录检查均为只读或拒绝路径验证。生产数据库内容、
结构及共享媒体 Worker 保持原样。

## 2026-11-11 后台控件修订

正式版本 `7ea2609c-a136-4a48-b565-83a54fb08d34` 替换
`199c21af-295d-431e-a594-152bee3f4be8`。修订后台共用字段的单层内侧焦点线、
按钮表面与 hover/按压/选中/禁用状态，并接入上传图标，保留键盘与强制颜色模式焦点。

546 项检查、生产构建、14 项隔离后台流程和本地公开浏览器检查通过。正式地址的
191 页 smoke、八项探活、双语键盘/触屏导航与搜索通过；线上 `admin-BNhFFFib.css`
与验收构建逐字一致，浅深主题、320px 布局、键盘焦点和触屏 hover 抑制已现场复核。
没有写入生产数据或修改用户正在编辑的浏览器页面。

发布期间遇到 API 超时与连接重置；本次命令显式继承本机已配置的系统代理后上传成功。
该代理仅用于本次命令，没有写入应用、Cloudflare 或系统配置。

## 2026-11-11 UI 与图标发布

通过 `pnpm run deploy:cloudflare` 发布已验收的工作区版本，正式 Worker Version 为
`199c21af-295d-431e-a594-152bee3f4be8`；发布前的线上版本为
`d3a287ea-e55c-43cc-acac-4bae8ce9c8b0`，保留作回滚依据。

本次包含后台分组目录、写作快捷入口、文章检索与类型筛选，以及 48 枚配套 SVG 图标。
图录在 `/icons/`，后台仍使用本部署的 `/admin` 与原有登录配置。
没有执行生产迁移、导入或数据写入，也没有发布共享媒体或巡检 Worker。

发布前 `pnpm check` 的 546 项测试、生产构建和 14 项隔离后台浏览器流程通过；
后台测试仅使用经端点、数据库名与保护标记验证的 `fhfs_e2e` 和本地媒体模拟器，测试后清理。
发布后正式地址的 191 个 sitemap 页面 smoke、中英文键盘/触屏导航与搜索、八项 uptime 探测通过；
另核对全部 48 个线上 SVG 与源码几何一致，图录浅深主题、320px 布局及更新后的后台登录页正常。

## GitHub main 自动部署

2026-11-13 发布前，依赖审计发现 Void 间接依赖的 Hono 4.13.13 受五项安全公告影响。
工作区以 `void>hono` 精确覆盖为 4.13.16，并更新锁文件；保持 Void 及其他依赖版本不变，
不降低 `pnpm audit --audit-level low` 的发布门槛。修复范围与兼容性变化见
[Hono 4.13.16 官方发布说明](https://github.com/honojs/hono/releases/tag/v4.13.16)。

工作流位于 `.github/workflows/check.yml`：推送到 `main` 后先运行 `pnpm check`、`pnpm build` 和 `pnpm build:vercel`，成功后用 Void 发布到现有 Worker `fhfs`，最后检查 sitemap 中的公开页面、本部署的后台鉴权和分享图片。PR 只运行检查；Actions 页面也可手动运行工作流。

部署任务通过 `fhfs-production` 并发组串行执行，不中断正在进行的发布。每次发布前核对远端 `main` 的提交，避免较旧的检查任务覆盖新版本。

需要在仓库 Actions Secrets 中保存专用的 `CLOUDFLARE_API_TOKEN`，权限限制到此账户下的目标 Worker。账户 ID 和 `workers.dev` 子域是公开配置，已在工作流中固定。`DATABASE_URL` 继续保存在现有 Worker 的加密 Secret 中，不需要复制到 GitHub，也不运行数据库迁移。

`pnpm run deploy` 和 `pnpm run deploy:cloudflare` 都先生成 `.generated/public` 中的哈希资源，再显式选择 `--platform cloudflare`。Void CLI 内部构建不运行 `package.json` 的 build 脚本，因此每次发布都必须执行资源生成，不能依赖本地已有目录或其他 CI 任务的构建产物。Void Cloud 托管部署已取消。

## 现有 Cloudflare 部署

使用 `void` 的官方 Cloudflare 登录，不读取或提取其他 CLI 的认证令牌：

```sh
pnpm exec void cloudflare login
pnpm exec void connect --platform cloudflare
```

## 最小生产配置

应用与后台由各自的部署处理，数据和媒体服务仍按项目约定共享。以下三项必须各自在运行平台配置为加密 Secret，不能提交到 GitHub、不能使用 `VITE_` 前缀：

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

当前 Worker 没有自定义域名路由，`workers.dev` 与版本预览均启用；配置显式保留 `routes: []`、`workers_dev: true` 和 `preview_urls: true`。更新 Secret 会产生新的 Worker 版本，显式配置可让 CI 在版本元数据变化后仍按现有访问设置安全发布。

此前共享后台版本的生产环境仅配置了 `DATABASE_URL`。首次发布独立后台之前，必须补齐 `AUTH_SECRET` 和 `ADMIN_PASSWORD_HASH`；Void 会检查必需 Secret 是否存在，不会自动上传本地 `.env`。

公开链接默认使用 `https://fhfs.fhfs.workers.dev`，使用自定义域名时在构建环境设置公开的 `VITE_SITE_URL`。`ADMIN_MODE` 已移除；后台始终留在本部署，不跳转到原站。仅在构建时生成中英文通用分享封面和后台图标，不读取公开搜索索引，也不打包文章专属 PNG 或清单。文章仍使用原分享图片路由，返回对应语言的通用封面。Worker 通过 `ASSETS` 绑定直接返回 PNG，不在请求期间加载字体或运行绘图 WASM。

本地 `.env` 与生产 Secrets 分开；Void 不会自动上传 `.env`。本地环境需要：

```dotenv
DATABASE_URL=postgresql://user:password@your-neon-host/database?sslmode=require
AUTH_SECRET=<本地随机会话密钥>
ADMIN_PASSWORD_HASH=<本地管理员密码的 salt:hash>
```

本应用的公开内容缓存最长 30 秒，保存时立即清除本部署的相关缓存。后台与授权预览绕过公开缓存。原站的缓存策略由原站维护，本应用不依赖原站的页面、图片接口或缓存失效接口。

## 发布检查

### Worker CPU 额度

本项目继续使用 Workers Free，未开通付费订阅。免费档请求 CPU 上限为 10ms，本地开发与预览不会复现这个限制。动态绘图曾触发 `exceededCpu` / Error 1102，因此图片改为在 Node 构建阶段生成，线上只读取静态 PNG。字体、Satori 和图片渲染器不进入 Worker 的请求路径。

`pnpm assets` 生成双语封面和后台图标，并只读取本部署公开的搜索索引生成文章图片；CI 不需要数据库密钥。新站尚无索引、索引暂时不可用或缺少文章元数据时使用通用封面。线上对照最新的已发布标题、双语副标题、日期和前三个标签；与构建快照不同即使用对应语言封面，下一次发布再生成文章专属图。草稿不会进入公开图片。

发布验收必须检查正式地址上的页面、登录路由和图片，不能用本地构建成功代替线上验证，也不要通过重试隐藏 CPU 错误。依据：[Cloudflare CPU 限制](https://developers.cloudflare.com/workers/platform/limits/)。

### 检查命令

```sh
pnpm check
pnpm build
pnpm preview --port 4173
pnpm smoke http://127.0.0.1:4173
```

Smoke 读取 sitemap 并检查所有公开页面，以及双语 RSS/搜索、本地分享图片、404、本部署的后台登录跳转、跨站请求、哈希资源和安全头。它不登录、不写数据库、不上传或删除媒体。写入验证必须使用明确隔离的测试数据库，并先检查其保护标记。

2026-10-19 发布验证通过：`pnpm check` 的 411 项测试、生产构建，以及正式地址上的 120 个 sitemap 页面和上述接口检查。浏览器另验证了首页欢迎交互、页面内导航和语言切换。

部署不运行数据库迁移、种子或导入脚本。`void info` 应显示没有需要创建的持久化资源。共享数据库的 schema 与迁移历史在本仓库的 `src/db/schema.ts` 和 `drizzle/`。

GitHub Actions 在 main 检查通过后自动发布。排障时可在 Actions 页面重跑工作流，或使用 `pnpm run deploy:cloudflare` 手动发布。

## 运行时安全基线（2026-10-22）

本地与 CI 都读取 `.node-version` 的 Node.js 24.22.1，`engines.node` 和 pnpm 的
`engineStrict` 拒绝更旧版本。安装准备、检查、资源生成、预览和发布入口还会运行
`scripts/check-runtime.mjs`，核对实际进程版本以及 Brotli 解码补丁标记。
Node 的 Brotli 版本字符串在回补补丁后仍是 1.2.0，不能只看该字符串判断是否修复。
`pnpm check:worker-runtime` 还会用相同兼容配置启动隔离的 workerd，并通过本机
固定数据验证 Brotli 解码和 zlib 函数被禁用、gzip 仍可解码；它同时用于检查与资源生成，
因此本地开发、构建和发布都会执行。该验证不访问生产服务，也不写数据库。

Void 更新到 1.2.1；锁文件中的 Undici 统一为 7.30.1，Miniflare 为
5.20261019.1-beta，Wrangler 为 4.151.3，workerd 为 1.20261022.1。
Undici 是工具链独立安装的依赖，升级 Node 不会替换它。CI 在安装后运行完整
`pnpm audit --audit-level low`，同时保留这些经官方公告核对的版本约束。
Wrangler、Cloudflare Vite 插件和 cf CLI 还内嵌了旧 Undici。安装时的
`scripts/patch-bundled-undici.mjs` 将这些副本的入口改为加载外部 7.30.1，
`packageExtensions` 确保该依赖可解析。修复按完整文件 SHA-256 和精确版本校验，
未知内容或版本会拒绝执行；检查、开发与发布也会验证修复确实存在。仅设置 overrides
不会修复内嵌副本，因此升级这些包时必须先核对上游是否仍内嵌旧版本并更新此修复。
每份修复还用实际 Node 进程做语法检查，保留 CLI 的首行 shebang，避免仅在部署时
加载的模块绕过构建验证。此前已知的错误安装可按其精确哈希修复，不接受未知变更。

截至本次检查，最新 workerd 的公开构建配置仍引用未包含
`google/brotli@0ed4268` 解码修复的 Brotli 1.2.0。因此本应用显式设置
`no_brotli_content_encoding` 和 `no_nodejs_zlib`，关闭未使用的 Brotli 编解码入口与
Node zlib 模块；这两项开关随本地预览和正式 Worker 一起生效。该措施不代表
Cloudflare 平台的底层库已经修复。只有确认上游构建包含补丁并完成回归验证后，
才能移除开关。共享媒体 Worker 的独立部署不由本应用配置覆盖。

依据：[Node.js 安全发布](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)、
[Undici 安全公告](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c)、
[workerd 构建依赖](https://github.com/cloudflare/workerd/blob/v1.20261022.1/build/deps/gen/deps.MODULE.bazel)、
[Cloudflare 兼容开关](https://developers.cloudflare.com/workers/configuration/compatibility-flags/)。

## 2026-11-02 发布前依赖修复

Seroval 固定到 1.6.11，覆盖正则表达式和 TypedArray 序列化的两项安全修复；
Void 的 minimatch 固定到 11.0.1，保持原有命名导出接口。
分享图构建改为直接调用 Satori 0.33.5 与 Resvg 2.6.2，删除内嵌旧 Satori 的
`cf-workers-og`；只覆盖它声明的依赖不能替换其发布包里的旧代码。
Satori 的 fflate 固定到同一 0.7 系列的修复版本 0.7.5。
这些图片仍在 Node 构建阶段使用仓库字体生成，Worker 请求只读取静态 PNG。

依据：[Seroval TypedArray](https://github.com/lxsmnsyc/seroval/security/advisories/GHSA-f86p-h4j2-7qgj)、
[Seroval RegExp](https://github.com/advisories/GHSA-9wx9-5pv9-3349)、
[Satori](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp)、
[minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249)、
[fflate](https://github.com/advisories/GHSA-px8p-9vwx-vf98)。
