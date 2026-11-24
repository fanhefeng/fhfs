# 数据备份与恢复

| 副本 | 归属 | 调度 |
| --- | --- | --- |
| 公开快照 | 本仓库 `db-snapshots` 分支 | 每天北京时间 03:00，另可手动执行 |
| 加密私有备份 | 现有独立 B2 存储的 restic 仓库 | 每天 04:17 创建并校验数据库，每三小时检查新鲜度 |
| SQL 恢复演练 | 独立 Neon 恢复项目 | 每月 8 日 06:53，季度另做媒体字节验证 |
| 独立告警 | GitHub Actions 与 Healthchecks | 每三小时审计真实执行证据 |

公开快照仅包含已发布内容，由具备专用只读凭据的 Actions 事务导出，并依据后台编辑证据核对表和行数。
Cloudflare 与 Vercel 读取同一份公开快照，保持独立的后台和会话。文件不能用于恢复草稿或完整私有数据库。
下载或查看 `db-snapshots` 时只操作历史和文件。项目没有将公开 JSON 导回生产的支持入口。

现有加密仓库继续使用相同存储地址、密码、`fhfs-private` 标签和 `fhfs-site` 快照主机标签。
保留这些标签可继续发现历史快照。凭据独立保管，禁止把还原的私有内容提交到 Git 或公开 Actions。
Neon 自身的恢复窗口在控制台核对，跨账户恢复使用已验证的独立备份。

## 接管设置

1. 先在 `fanhefeng/fhfs` 发布原 `db-snapshots` 历史，并为旧快照添加原始时间和 SHA-256。从公开地址读回校验后再部署新的快照读取源。快照分支的 `vercel.json` 关闭其部署。
2. 新仓库的公开导出只设置 `PUBLIC_BACKUP_DATABASE_URL` 专用只读凭据。运行时的应用连接串保持在各平台，编译、验证和快照任务不需要该连接串。
3. 将现有 `BACKUP_DATABASE_URL`、`BACKUP_RESTORE_DATABASE_URL`、`RESTIC_REPOSITORY`、`RESTIC_PASSWORD`、`BACKUP_AWS_ACCESS_KEY_ID`、`BACKUP_AWS_SECRET_ACCESS_KEY` 配置为本仓库 Secret，沿用 `BACKUP_AWS_REGION`。从密码管理或受保护的本机配置注入，完整名单见 [PRIVATE-BACKUP.md](PRIVATE-BACKUP.md)。
4. Neon 恢复后，在默认分支手动运行公开备份、加密 `create`、`verify-database` 和受保护的 `restore-database`。核对真实快照、最新公开内容、前台实时读取、搜索、RSS、sitemap 和恢复对比摘要。
5. 创建或交接备份专用的 `HEALTHCHECKS_PING_URL`。保持原监控信号，直到新仓库证实收到自然调度信号。设置 `PUBLIC_BACKUP_ENABLED`、`PRIVATE_BACKUP_ENABLED`、`PRIVATE_RESTORE_ENABLED` 和 `MONITOR_ENABLED`；确认现有 `E2E_ENABLED` 仍为 `true`。在切换窗口内串行停用旧仓库的重复定时写入，避免两个仓库同一时段写同一 restic 仓库。旧站网页与原有告警继续保留，直至新任务完成至少一次自然运行并核对通知。
6. 将共享 `fhfs-media` 每小时清理切到新版 Cloudflare 的 `/api/media/cleanup`。确认现有上传密钥匹配、静态资源及 KV 绑定保留，并验证自然 Cron。只修改清理目标时不需要替换媒体静态资源。详见 [媒体上传](MEDIA-UPLOADS.md)。
7. 按 [GitHub 同步](GITHUB-SYNC.md) 核对已有仓库的 Webhook，在新部署验证签名与事件响应。确认历史跳转和监控这些独立接管项后，再停用旧站流量。

## 共享数据库结构

`drizzle/` 保留从旧仓库复制的完整迁移历史。本仓库维护未来的 schema 变更。
交接只转移记录和维护入口；数据库 schema、迁移编号和现有记录沿用。
Drizzle 工具要求单独设置显式直连变量 `DRIZZLE_MIGRATION_DATABASE_URL`。
代码发布、演练和生产验收均不执行生产迁移。

## 恢复

恢复先落在预置保护标记的独立数据库，逐表验证列、行、序列和迁移记录。
`restore-database` 拒绝生产和 E2E 目标；读回数据库和清单的 `verify-database`
只检查完整性。正式恢复或切换仍需要单独确认恢复目标、时间点和停写窗口。

若公开快照尚未产生新版本，故障读使用已校验的已有公开快照。紧急撤稿先屏蔽公开访问，再用正常备份发布新的已验证版本。依次复查详情、列表、搜索、RSS 和 sitemap。历史快照、公共 Git 历史和下载副本需独立处理。
