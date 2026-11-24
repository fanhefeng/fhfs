# 私有备份与独立恢复

`.github/workflows/private-backup.yml` 操作现有 restic 仓库。备份覆盖 Postgres 应用数据、草稿、迁移记录、序列和引用媒体。恢复使用保留的 `fhfs-private` 标签和旧主机标签 `fhfs-site` 找回历史。勿对现有仓库运行 `restic init`，也不要改变仓库地址、密码或前缀。

| GitHub Actions 配置 | 用途 |
| --- | --- |
| `BACKUP_DATABASE_URL` | `private_backup` 角色的直连 TLS URL，可读应用表、迁移日志及序列 |
| `RESTIC_REPOSITORY` / `RESTIC_PASSWORD` | 现有私有存储路径与加密凭据 |
| `BACKUP_AWS_ACCESS_KEY_ID` / `BACKUP_AWS_SECRET_ACCESS_KEY` | 只授予现有 B2 私有前缀所需权限 |
| `BACKUP_AWS_REGION` | 现有 S3 兼容区域，仓库变量 |
| `BACKUP_RESTORE_DATABASE_URL` | 已设保护标记的独立演练数据库直连 TLS URL |

本机可通过受保护的 `.env.local` 或进程环境提供 `BACKUP_DATABASE_URL`、
`BACKUP_RESTORE_DATABASE_URL`、`RESTIC_REPOSITORY`、`RESTIC_PASSWORD`、
`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_DEFAULT_REGION`。
加密密码在独立密码管理器保管。备份任务不输出连接串、媒体路径或私有行，
也不上传明文 artifact。定时任务凭据不授予永久删除权。
现有存储上限与流量额度在 B2 控制台核对后再跑完整恢复。

```sh
pnpm backup:private check
pnpm backup:private:selftest
pnpm backup:private health
pnpm backup:private create
pnpm backup:private verify-database
pnpm backup:private restore-database
```

`check` 只检查工具和配置。`selftest` 用临时本地仓库和合成文件验证加密往返。
`create` 以一致性 Postgres dump 和媒体文件生成独立校验清单，加密后写入现有仓库。
`verify-database` 取回 dump 与清单并验证字节和目录表。`verify` 另取回媒体并逐文件验证。
`health` 只查询最新加密快照，超过 36 小时报失败。原生 PostgreSQL 客户端版本需与 Neon 兼容；
CI 当前使用 pg_dump、pg_restore 和 psql 18。

`restore-database` 只向独立项目中名为 `fhfs_restore_drill` 的库恢复，要求角色
`backup_restore`、只读保护标记 `recovery_control.guard` 中的 `fhfs-private-restore-only`，
并拒绝源库、生产或 E2E 端点和额外权限。标记由演练库管理员预先建立。恢复前检查
归档范围，在单事务中替换演练库的应用对象，随后核对全部表、列、行、序列及迁移摘要。

历史备份库、隔离恢复项目、B2 权限和首次真实恢复的记录见
[旧仓库的私有备份记录](https://github.com/fanhefeng/fhfs-site/blob/9fbb036759fd8f53d40af58c7742375795dbb1dd/docs/PRIVATE-BACKUP.md)。
启用自然备份和独立告警的步骤见 [恢复和接管](RECOVERY.md)。
