# 备份巡检与独立告警

`.github/workflows/monitor.yml` 在本仓库默认分支每三小时运行。它只检查 Actions 和加密仓库，网站公开可用性由 [独立 uptime Worker](OPERATIONS.md) 检查。

- 检查 `backup.yml`、`private-backup.yml`、`e2e.yml` 已启用，验证最新运行和关键步骤确实完成。
- 公开快照、定时创建、隔离后台流程要求 36 小时内成功，备份健康要求 12 小时内成功，隔离 SQL 恢复要求 35 天内有实际逐表对比证据。失败、超时和待验证重跑单独告警。
- 从现有加密存储只读检查真实备份时间。取证失败与备份过期均报告异常。
- 只发送固定服务名和成功或失败状态至独立 Healthchecks。专用 ping URL 存在 Actions Secret `HEALTHCHECKS_PING_URL`；与网站 uptime 的地址分别管理。

启用前按 [恢复和接管](RECOVERY.md) 验证现有凭据、默认分支真实运行和自然调度。
建议备份告警检查周期和宽限各 6 小时，给 GitHub 延迟留出余量。核对失败及恢复通知送达后再停用旧仓库巡检。
GitHub API 或恢复日志取证有时限，无法验证时应修复相关权限或日志保留。
