# fhfs 运行与验证

`fhfs` 的应用、后台与发布独立运行在 Cloudflare。Neon 数据和媒体继续共享；
`fhfs-site` 的备份、恢复和备份巡检工作流继续保护这份共享数据，不复制一套备份。
停用旧站网页之前，必须保留这些任务，或先完成恢复证据与告警的交接。

## 公开可用性与告警

`ops/uptime/` 是独立 Worker `fhfs-uptime`，每 5 分钟执行八项只读检查：
中英文页面、两种语言的内容 JSON、登录页、后台未登录跳转、媒体图片和音频的 Range。
页面还检查正文和嵌入错误；媒体必须返回有效的 206 与 64 字节范围。
不登录、不写库、不上传媒体，也不持有应用、数据库或媒体密钥。

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
后续 main 发布在应用 smoke 成功后更新巡检 Worker，先检查其 Secret 名称存在。
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
