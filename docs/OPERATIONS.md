# fhfs 运行与验证

`fhfs` 的应用、后台与发布独立运行在 Cloudflare。Neon 数据和媒体继续共享；
`fhfs-site` 的备份、恢复和备份巡检工作流继续保护这份共享数据，不复制一套备份。
停用旧站网页之前，必须保留这些任务，或先完成恢复证据与告警的交接。

## 公开可用性与告警

`ops/uptime/` 是独立 Worker `fhfs-uptime`，每 5 分钟执行八项只读检查：
中英文页面、两种语言的内容 JSON、登录页、后台未登录跳转、媒体图片和音频的 Range。
页面还检查正文和嵌入错误；媒体必须返回有效的 206 与 64 字节范围。
不登录、不写库、不上传媒体，也不持有应用、数据库或媒体密钥。
巡检显式开启 `global_fetch_strictly_public`，经过公网入口访问同账户的应用与媒体 Worker，
保留公开路由与边缘安全检查；不用内部服务绑定绕过这些入口。

检查失败立即向专用 Healthchecks 检查上报 `/fail`；全部通过才上报成功。
响应只接受 `200 OK` 且正文为 `OK`，忽略的请求不算成功。
检查名为 **fhfs public uptime**，Period 5 分钟、Grace 10 分钟，沿用现有邮箱通知。
巡检自身失败、停用或 Cloudflare 整体不可用而无法上报时，外部服务在最后成功信号
超过 15 分钟后告警。调度与通知可能延迟；这不是多地域探测，也不保证 5 分钟内送达。
巡检运行器与应用同在 Cloudflare，外部看门狗用于覆盖两者一起停止的情况。

`HEALTHCHECKS_PING_URL` 仅保存在巡检 Worker 的加密 Secret，不能放在应用 `.env`、
GitHub 日志、公开代码或客户端。上报只包含固定服务名、检查名称、HTTP 状态与失败类别，
没有网页内容、URL 参数、异常原文或凭据。

```sh
pnpm uptime             # 现场检查，不上报外部状态
pnpm run deploy:monitor # 使用固定 Wrangler 部署现有巡检 Worker
```

首次启用必须先创建独立检查并配置 Secret，再验证自然定时上报。
应用的 CI 凭据不能访问巡检 Worker。main 发布只更新应用，随后执行 smoke 和八项探活。
巡检代码变化时，通过已授权的本机 Wrangler 独立执行 `pnpm run deploy:monitor`，
再确认自然调度和 Healthchecks 收到信号。应用发布不携带巡检 Secret，也不重发巡检 Worker。
应用正式地址不承担巡检触发接口；巡检 Worker 没有公开路由。
Cloudflare Cron 配置首次传播可能需要 15 分钟。

## 运行日志

`void.config.ts` 开启 Cloudflare invocation 日志与持久化，记录状态、执行结果和
未捕获异常；不新增请求体、Cookie、表单或连接串日志。
`fhfs-uptime` 同样记录每轮结构化检查结果。

在 Cloudflare 的 Workers & Pages 中选 `fhfs` 或 `fhfs-uptime`，进入 Observability
查询时间范围、5xx、异常与 CPU 超限。当前 Free 计划日志保留 3 天，有每日额度；
仅从启用后开始留存。不要把无记录解释为历史上从未出错。
Void 在 Cloudflare 目标的 `project logs` 是实时 tail，`--range` 不会补回历史。

## 公开读取诊断与请求内复用

公开内容加载器只增加脱敏诊断，不新增数据库耗时上限、取消或重试策略。
此前本地提出的 3 秒尝试和 8 秒共享预算已撤除：正常的 3.1 秒、18 秒读取
应继续成功，而不是被强制中断后重试。没有新增超时或 HTTP 429/5xx 重试，
因此不会因固定等待忽略 Retry-After，也不会因上游不响应取消而启动第二个读取。

数据库驱动保留已有的连接恢复行为（`src/lib/retryFetch.ts`）：只对带 cause 的
网络 TypeError 按 300ms、1200ms 等待，最多三次尝试，包含正文读取。
公开读取、后台、预览及原有键控幂等写操作使用相同的旧传输；本次不扩大错误识别
或改变重试次数。HTTP 状态、SQLSTATE、AbortError 不触发该旧重试。
这仍不是数据库端取消保证，也不能扩展到非幂等写操作；备份工具的独立策略不变。

缓存仍最多保留 30 秒；只在当前请求内复用相同进行中读取，不跨请求共享 I/O Promise。
搜索索引冷读时，七类内容复用页面查询和草稿过滤，在同一个 Neon HTTP 批次中取回。
内容缓存按语言区分，关联各数据表的失效标签；三种翻译命名空间仍共用一次独立的文案读取，
文案读取失败时使用默认目录。两路读取并行，冷读最多两条 HTTP 请求，缓存有效时不查库。
失败不写缓存，本部署保存后的 tag 失效也不会复用旧的进行中读取。
后台与授权预览绕过公开缓存、去重和诊断，保持原始读写路径。

失败及超过一秒的读取记录固定服务名、操作名和耗时；错误类型、SQLSTATE、
网络代码仅从白名单提取。分类只用于诊断，不触发自动重试。日志与抛给框架的错误
不包含原始 SQL、参数、内容、连接串、URL 或原始错误消息，识别 cause/sourceError
包装链。慢或失败的 HTTP 尝试另记录尝试编号、等待响应头的耗时、读取响应正文的耗时、状态码和失败阶段。
这些日志沿用公开读取作用域，后台与预览不输出这类记录。响应头耗时包含 Neon 唤醒、查询和网络，
需与 Neon 同期指标对照。请求在 Worker 中途取消时可能没有完整计时。

巡检分别报告 timeout、connection、body、content、http，并记录阶段与耗时；
响应头和正文共同受原有 20 秒上限约束，连接失败不再统一显示为 timeout。
超时会发送 abort 并请求取消正文 reader；这不证明数据库或不响应取消的上游已经停止。
巡检不自动重试，慢请求超过 20 秒时仍会报告失败。

Mock 回归覆盖正常及慢成功读取、不响应取消的上游、并发请求数、429/503、永久错误、
旧连接重试上限与后台/预览/写路径、脱敏、缓存失效和搜索冷/热请求次数。
真实驱动测试仅使用 .invalid 测试地址与拦截的 fetch，不连接或写入生产数据库。

发布前运行 pnpm check、pnpm build、只读 smoke、浏览器搜索及隔离后台 E2E。
应用与巡检按既有权限分别发布；发布前记录两者当前版本，发布后核对新版本、
八项自然探测、5xx/canceled 和公开读取诊断。如新版本增加失败、请求放大或后台回归，
分别回滚受影响的 Worker 到发布前版本。不要把本地通过视为已消除生产间歇故障。

## 后台隔离验证

`pnpm build` 后运行 `pnpm e2e`。运行器先拒绝生产端点，再要求数据库名为
`fhfs_e2e` 且包含 `public.fhfs_e2e_guard` 的 `fhfs-e2e-only` 标记，缺少任一条件即停止。
本地从 `.e2e/database.env` 读取专用 `TEST_DATABASE_URL`，CI 使用本仓库专用 Secret。
该数据库位于既有隔离测试项目，与旧站的测试数据库分开；只初始化当前 schema，
不复制生产数据。测试运行器不创建保护标记、不迁移或导入数据库。

本地 Wrangler 运行构建产物（3100）与独立媒体 KV 模拟器（8787）。测试子进程只继承
必要系统环境，不继承生产数据库、密码或媒体密钥；测试密码与签名密钥每次随机生成。
媒体上传在浏览器内拦截到本地模拟器，后台确认与清理也只指向本地媒体。
验证登录、日期校验与会话过期后保留输入、草稿保存和匿名不可读、授权预览、上传与保存后的保留。
清理本次文章、测试上传租约和临时密钥文件；测试失败仍清理。
`.e2e` 锁防止本机并发；CI 用同一并发组。后台状态、报告和截图不上传公开 artifact。
强杀后须先确认进程停止，再处理遗留锁与临时凭据。

## 发布验收

运行 `pnpm check`、`pnpm build` 和浏览器公开流程，再发布并运行 `pnpm smoke`、
`pnpm uptime`。确认正式地址保持本部署的后台登录，Cloudflare 新版本包含日志配置，
Healthchecks 收到自然调度信号，最后核对工作流的关键步骤实际执行。

资料：[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)、
[Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)、
[Healthchecks Pinging API](https://healthchecks.io/docs/http_api/)。
