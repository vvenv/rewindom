---
name: prisma-sync-fix
description: 修复 Prisma Client 与数据库不同步导致的列缺失/多余错误。在出现 column does not exist 或 Unknown arg 错误时使用。
---

# Prisma Client 与数据库同步修复

## 适用症状

- `The column \`<Model>.<field>\` does not exist in the current database.`
- `The column \`<Model>.<field>\` is required but ... was not found.`
- `Unknown arg \`<field>\` in select/where ...`

根因：**Prisma Client（运行中进程）** 与 **数据库实际结构** 不一致。

常见三种错位：

1. schema 已更新，迁移已生成，但**数据库未应用**
2. schema 与数据库一致，但**Client 未重新 generate**
3. Client 已 generate，但**Node 进程仍持有旧 Client**

## 排查与修复

### 1. 确认 schema 与迁移已对齐

```bash
ls apps/server/prisma/migrations
```

检查最新 `migration.sql` 与 `schema.prisma` 一致。

### 2. 应用迁移

```bash
pnpm --filter server prisma migrate deploy
```

开发环境生成新迁移：`pnpm --filter server prisma migrate dev --name <change>`

### 3. 重新生成 Client

```bash
pnpm --filter server prisma generate
```

### 4. 重启 server 进程（关键易漏）

- `pnpm dev`：`Ctrl+C` 后重新 `pnpm dev`
- pm2：`pm2 restart all`
- 生产容器：重建/重启

### 5. 验证

请求原报错接口，或 `pnpm --filter server prisma studio` 核对列结构。

## 防御性约定

- 修改 `schema.prisma` 后：**migrate dev → generate → 重启进程**
- 删除字段时检查引用：`grep -rn "<field>" apps/server/src`
- 多个迁移合并走 `merge-migrations` skill
- CI/部署顺序：`migrate deploy → generate → 启动服务`
