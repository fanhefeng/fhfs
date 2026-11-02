# GitHub 数据同步

`/admin/apps` 的 `repo`（`owner/name`）决定接入哪些公开仓库，现有六款软件已填好。
留空时也会从 GitHub 项目网址识别仓库（支持仓库首页、`.git` 和 Release 链接）；
显式 `repo` 优先，其他域名的网址不会触发 GitHub 请求。识别逻辑同时用于软件页、
首页最近发布和 Webhook 白名单，无需更改数据库结构。

GitHub 是版本号、发布日期、Release 下载文件、Star、Fork、主要语言和代码更新时间
（`pushed_at`）的来源；双语介绍、官网、分类和平台仍在后台编辑。列表中每个有数据的
项目显示 Star/Fork，唱机旁的详情还展示语言、代码更新时间和可点击的统计链接。
没有 Release 时显示第一个 tag，指向实际 tag 的源码树，不编造发布日期或安装包。

数据在 TanStack Start 服务端加载，只向浏览器传递页面需要的字段，不在浏览器请求
GitHub。首页最近发布和软件页共享按仓库划分的缓存标签，完成的读取在当前 Worker
实例内最多缓存 30 秒；后台与授权预览绕过公开缓存。Webhook 到达后立即过期当前实例
中的标签，其他实例依靠最多 30 秒的缓存期限更新。已经打开的页面需刷新。

## 启用立即同步

1. 用密码管理器生成独立随机密钥，至少 32 个字符。在站点的生产环境配置
   `GITHUB_WEBHOOK_SECRET`，然后部署本次代码。不要复用后台的 `AUTH_SECRET`，
   不要把密钥写入代码、命令参数或日志。
2. 每个已接入仓库打开 **Settings → Webhooks → Add webhook**：
   - Payload URL：实际站点地址加 `/api/github/webhook`，不带 `/zh` 或 `/en`。
   - Content type：`application/json`。
   - Secret：与生产环境中的 `GITHUB_WEBHOOK_SECRET` 相同。
   - SSL verification：启用；Active：启用。
   - 选择事件：Releases、Pushes、Branch or tag creation、Branch or tag deletion、
     Repository、Stars、Forks；公开化事件 `public` 也被处理。
3. Webhook 的首次 `ping` 应返回 HTTP 200 和 `{"ok":true}`。发布或编辑 Release 后，
   在 Recent Deliveries 中应看到 `{"ok":true,"repo":"owner/name"}`，随后刷新双语首页
   和软件页，确认版本、时间、文件与统计更新。

可选 `GITHUB_TOKEN` 仅在服务端用于提升 API 配额。公开仓库无需 token，未认证请求
每个来源 IP 每小时仅有 60 次额度；持续访问时应配置只读取公开仓库的 token，避免授予
私有仓库权限。本地放在被忽略的 `.env`，生产使用 Void 的 Secret 管理，不写入
`VITE_*`、数据库或客户端。增加仓库只需填 `repo`（或 GitHub 项目网址），并给这个仓库
添加同一个 Webhook。仓库改名或转移后同步更新后台的配置。

Webhook 使用原始请求字节验证 `X-Hub-Signature-256`（HMAC-SHA256、恒定时间比较），
签名通过后才解析 JSON、读取配置和失效缓存。只处理后台已配置的仓库；忽略其他事件或
仓库，重复投递只重复失效同一个标签，不写数据库。不配置密钥时端点返回 503，页面仍
在下一次访问且缓存过期时读取。错误签名返回 401，非法 JSON 返回 400，超过 25 MiB
的请求返回 413。

桌面软件和工具有已上传的 Release 附件时，主按钮前往该 Release；展开「下载文件」
可按文件名选择对应平台的直接下载地址。网站和网页游戏保留原入口。GitHub 请求失败时
缺失的信息不显示，原官网和项目介绍仍可用。GitHub 未投递的事件（例如上游 Fork 删除
或下载附件变化未触发 Release 事件）和投递失败，由最多 30 秒缓存过期后的访问兜底；
不是后台定时任务。统计请求与 Release 请求独立，缺少语言或时间不影响 Star/Fork，
请求超时、限流和异常响应不会显示伪造的零值或日期。

## 验证

`pnpm check` 覆盖签名的 GitHub 官方测试向量、Unicode 原始字节、篡改、禁用/未授权
请求、仓库识别与白名单、重复投递、缓存标签、下载地址、统计与可选字段解析、错误与
tag 回退。测试使用 mock，不读写生产数据库。
生产构建后用 `pnpm smoke <本机地址>` 检查公开路由、双语内容、后台未登录跳转与 CSP；
另用浏览器检查中英文软件页、切换唱片、手机布局和无数据时的降级。

协议来源：[签名验证](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)、
[Webhook 事件](https://docs.github.com/en/webhooks/webhook-events-and-payloads)、
[Release API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)、
[仓库 API](https://docs.github.com/en/rest/repos/repos#get-a-repository)、
[API 配额](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)。

## 2026-10-14 旧站启用记录（fhfs-site）

以下记录属于旧站，不代表当前 fhfs Worker 的 Secret 或 Webhook 配置已完成。
旧站生产环境已配置独立敏感变量 `GITHUB_WEBHOOK_SECRET`，并已部署同步代码。
`file-tidy`、`keyboard-piano`、`link-verse`、`lumitext`、`photo-browser`、`portreaper`
六个仓库均启用了指向生产端点的签名 Webhook；GitHub 实际发出的六次首次 `ping`
全部返回 HTTP 200。正式域名上的签名发布事件、错误签名和未知仓库检查通过，
中英文软件页的版本、时间、下载文件和统计与 GitHub API 一致。

同步代码随 `main` 的提交发布，后续部署继续使用同一条主分支历史。
本机全站 smoke 的说说页因代理将媒体域名解析到私网地址而失败；同一图片的生产请求
返回 200。受影响页面另行检查脚本预算、控制台和 CSP。
