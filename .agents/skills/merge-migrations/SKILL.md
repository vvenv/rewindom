---
name: merge-migrations
description: 将多条 Prisma migration 收敛（squash）为单条 init migration，生产安全（不使用 reset，通过 migrate diff 离线生成 + baseline 标记）。在用户要求合并/收敛/清理 migration 历史时使用。
---

# 收敛 Migrations 为单条 init

将多条 Prisma migration 收敛（squash）为**单条 init migration**，使仓库里只剩一条 migration。

本流程**生产安全**：

- ❌ 不使用 `prisma migrate reset`
- ❌ 不删数据、不还原数据库
- ✅ 用 `migrate diff` **离线**从现有 DB 生成完整 SQL
- ✅ 对每个已有库（本地/测试/生产）只做 **baseline**（`resolve --applied`），不真正执行建表 SQL

## ⚠️ 前置条件

- 所有环境（本地 / 测试 / 生产）的 schema **必须完全一致**，先确认：
  ```bash
  pnpm --filter server exec prisma migrate status   # 须为 "Database schema is up to date!"
  ```
- 挑一个**短期内没人改 schema** 的时间窗口操作。
- 操作前**务必备份**（遵守 `prisma-migration.mdc` 安全规则）。

## 关键坑：自定义 SQL 不会被 migrate diff 捕获

`prisma migrate diff` 只会输出 schema 管理的对象（表、枚举、索引、外键）。
**函数 / 视图 / 触发器 / 扩展不在 `schema.prisma` 中，不会被生成**，必须手动追加。

本仓库当前**没有**这类自定义对象。若后续引入了扩展、函数、视图、
触发器或手写索引（如 `CREATE EXTENSION` 与配套的表达式/GIN 索引），
收敛时须逐条追加到 init migration 末尾——先在目标库 `\dx`、`\di`、`\df` 核对一遍。

数据 seed 不进 init，收敛后由独立脚本初始化（若有）。

## 关键坑：GIN/GiST 索引会被加上非法的 ASC

`migrate diff` 从库里读出 GIN 索引后，会照排序索引的模板给列补上 `ASC`：

```sql
-- 生成物（PostgreSQL 直接报错 access method "gin" does not support ASC/DESC options）
CREATE INDEX "ErrorLog_request_body_idx" ON "public"."ErrorLog" USING GIN ("request_body" jsonb_path_ops ASC);
```

必须手动删掉 `ASC`。本仓库目前有一条这样的索引（`ErrorLog_request_body_idx`），
新 init 里已带注释标明。收敛后**务必跑第 4 步的空库验证**——这个坑只在真正 apply 时才暴露。

## 关键坑：Enum 需条件创建

`prisma migrate diff` 生成的 `CREATE TYPE` 语句**没有条件判断**，直接 `CREATE TYPE "EnumName" AS ENUM (...)`。
如果目标库已存在该 enum，迁移会报 `type "EnumName" already exists`（P3018）。

必须把所有 `CREATE TYPE` 改为条件创建：

```sql
-- 原始（会冲突）
CREATE TYPE "public"."DocumentStatus" AS ENUM ('DRAFT', 'PROCESSING', ...);

-- 改为条件创建
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
        CREATE TYPE "public"."DocumentStatus" AS ENUM ('DRAFT', 'PROCESSING', ...);
    END IF;
END $$;
```

本仓库当前**零个** Prisma enum（所有状态字段都用 `String`），所以这一步通常无事可做。
后续新增的 enum 需要这层条件包裹——用 `grep -rn '^enum ' apps/server/prisma/models/` 先列全，别凭记忆。

确认是否漏掉自定义对象：

```bash
git show HEAD -- apps/server/prisma/migrations/ \
  | grep -E "CREATE (OR REPLACE )?(FUNCTION|TRIGGER|VIEW|MATERIALIZED VIEW|EXTENSION|INDEX.*USING)"
```

## 步骤

### 1. 确认所有环境同步 + 备份

```bash
pnpm --filter server exec prisma migrate status
DBURL="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/[?].*//')"
pg_dump "$DBURL" > "data/postgres-backup-$(date +%Y%m%d-%H%M%S).sql"
```

### 2. 离线生成 schema 部分的完整 SQL

从现有 DB（`prisma.config.ts` 的 datasource）生成 empty→当前 的全量 SQL。

```bash
pnpm --filter server exec prisma migrate diff \
  --from-empty --to-config-datasource prisma.config.ts --script \
  2>/dev/null | grep -vE 'injected env|^◇|tip:' > /tmp/squashed_init.sql
```

> Prisma 7 已移除 `--to-url`，改用 `--to-config-datasource`；`--to-schema-datamodel` 改为 `--to-schema`。

### 3. 追加自定义 SQL + 修复 Enum 条件创建（关键）

把旧 init 里的自定义对象追加到生成的 SQL 末尾，并把所有 `CREATE TYPE` 改为条件创建：

```bash
TS=$(date +%Y%m%d%H%M%S)
DIR=apps/server/prisma/migrations/${TS}_init
mkdir -p "$DIR"
cp /tmp/squashed_init.sql "$DIR/migration.sql"
printf '\n' >> "$DIR/migration.sql"
# 从旧 init 抽取自定义 SQL 块（行号按实际调整）
git show HEAD:apps/server/prisma/migrations/<old_init>/migration.sql \
  | sed -n '/-- Custom SQL/,$p' >> "$DIR/migration.sql"
```

**手动修复 Enum**（必须）：用编辑器打开 `$DIR/migration.sql`，把所有 `CREATE TYPE` 改为条件创建；或参考 `20260630120000_init` 的 Node 批量替换方式。

确认是否漏掉自定义对象：

```bash
git show HEAD -- apps/server/prisma/migrations/ \
  | grep -E "CREATE (OR REPLACE )?(FUNCTION|TRIGGER|VIEW|MATERIALIZED VIEW|EXTENSION|INDEX.*USING)"
```

### 4. 验证：在临时空库上跑一遍（强烈推荐）

```bash
ADMIN="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's#/[^/?]*\(?.*\)\?$#/postgres#')"
CHK="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's#/[^/?]*\(?.*\)\?$#/app_squash_check#; s#[?].*##')"
psql "$ADMIN" -c "DROP DATABASE IF EXISTS app_squash_check;" -c "CREATE DATABASE app_squash_check;"
psql "$CHK" -v ON_ERROR_STOP=1 -q -f "$DIR/migration.sql" && echo "APPLY OK"
psql "$ADMIN" -c "DROP DATABASE IF EXISTS app_squash_check;"
```

### 5. 删除所有旧 migration 目录（保留新 init 与 lock）

```bash
find apps/server/prisma/migrations -mindepth 1 -maxdepth 1 -type d \
  ! -name "${TS}_init" -exec rm -rf {} +
ls apps/server/prisma/migrations   # 只剩 ${TS}_init 和 migration_lock.toml
```

### 6. 对每个已有库做 baseline（不执行建表 SQL！）

已有库 schema 已存在，只需把历史改成「这一条已应用」。

**部署路径已自动处理**：`docker/entrypoint.sh` 在 `migrate deploy` 之前会探测
「已有 `User` 表但 `_prisma_migrations` 里没有这条 init」，命中则先 baseline 再 deploy；
全新空库跳过该分支正常建表。**改动 baseline 逻辑时记得同步这里。**

手动操作仅在不走部署流程时需要：

```bash
LIVE="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's#[?].*##')"
psql "$LIVE" -c 'DELETE FROM "_prisma_migrations";'
pnpm --filter server exec prisma migrate resolve --applied ${TS}_init
```

### 7. 验证

```bash
pnpm --filter server exec prisma migrate status   # "1 migration found" + "up to date"
```

## 全新环境

收敛后，全新/空库部署：

```bash
pnpm --filter server exec prisma migrate deploy   # 单条 init 建好全部对象
# 如有 seed 脚本，在此按需执行
```
