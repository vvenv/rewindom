-- 回填 NewsEvent.source_kinds / source_names，并把这一类漂移堵死。
--
-- `20260819100000_events_non_news_sources` 加列时**已经回填过**一次，但那条
-- UPDATE 只覆盖「执行那一刻」的行：迁移先跑、旧代码还在写入的那段窗口里新建的事件
-- 仍然是 NULL。而 `refreshEvents` 只碰热窗内与降温扫描捞到的事件（每轮最多 200 个），
-- 凉透的老事件再也不会被重算——于是这批 NULL 永久留了下来。
-- 本地库实测：3132 个事件里 966 个（31%）是 NULL，最早的一条在 2026-05-28。
--
-- 后果不是显示问题，是**筛选静默失效**：Postgres 的 `&&` 对 NULL 返回 NULL，
-- 于是 Prisma 的 `hasSome` / `has` 对这些行恒不命中——
--   * Rising 的「非新闻源不进」闸门把它们整批排除；
--   * 公开列表的 `?kind=release` 同样看不到它们。
-- 两处都不报错，只是少一批事件，所以线上很难被发现。
--
-- 所以这次不只回填，还要 SET DEFAULT + SET NOT NULL：一次性数据修复解决的是
-- 眼前这批，约束解决的是「下次再来一遍」。失效方向必须在安全那一侧——
-- 空数组会让事件掉出 Rising（可见、可查），NULL 是静默失效。

-- 1) 从信号表派生。与 refreshEvents 里那行 sourceKinds 同一口径（含 removed_at 过滤）
UPDATE "NewsEvent" e
SET "source_kinds" = sub.kinds,
    "source_names" = COALESCE(e."source_names", sub.names)
FROM (
  SELECT s."event_id" AS event_id,
         array_agg(DISTINCT s."source_kind") AS kinds,
         array_agg(DISTINCT s."source_name") AS names
  FROM "EventSignal" s
  WHERE s."event_id" IS NOT NULL
    AND s."removed_at" IS NULL
  GROUP BY s."event_id"
) sub
WHERE e."id" = sub.event_id
  AND e."source_kinds" IS NULL;

-- 2) 一条存活信号都没有的事件（下一轮 refresh 会删掉的空壳）落成空数组，
--    否则下面的 NOT NULL 加不上
UPDATE "NewsEvent" SET "source_kinds" = '{}' WHERE "source_kinds" IS NULL;
UPDATE "NewsEvent" SET "source_names" = '{}' WHERE "source_names" IS NULL;

-- 3) 约束：这两列的语义里没有「未知」这一档，只有「哪几种」和「一种都没有」。
--
-- **只加 NOT NULL，不加 DEFAULT**：Prisma 把标量列表建模成非空，但不给它 DB 默认值
-- （客户端在 create 时总会带上，缺省是 `[]`）。加 `DEFAULT '{}'` 会让下一次
-- `migrate diff` 冒出一条 `DROP DEFAULT` —— 那正是 AGENTS.md 里说的迁移历史与
-- schema 不一致，比这里省一次手打值糟得多。
--
-- 换句话说：NOT NULL 才是 `source_kinds String[]` 本来就该有的形状，
-- 上一条迁移把它建成 nullable 才是漂移。
ALTER TABLE "NewsEvent" ALTER COLUMN "source_kinds" SET NOT NULL;
ALTER TABLE "NewsEvent" ALTER COLUMN "source_names" SET NOT NULL;
