-- 非新闻源（release / status / filing）。
--
-- source_kind 的枚举活在 TS 里（DB 上一直是 TEXT），所以扩类型本身不需要迁移。
-- 要落的只有 NewsEvent.source_kinds —— Rising 要在库里过滤掉「只有非新闻源」的
-- 事件，公开列表要按类型筛，两者都不能把候选全捞回应用层再算。

-- AlterTable
ALTER TABLE "NewsEvent" ADD COLUMN     "source_kinds" TEXT[];

-- 一次性回填。
--
-- 不回填的话存量事件的 source_kinds 全是 '{}'，而 Rising 的
-- `source_kinds hasSome (...)` 对空数组恒为假 —— 首页「正在升温」会整段空掉，
-- 直到降温扫描把每个事件都轮一遍（每轮最多 200 个）才慢慢恢复。
-- 派生自信号表，与 refreshEvents 里那行 sourceKinds 同一口径（含 removed_at 过滤）。
UPDATE "NewsEvent" e
SET "source_kinds" = sub.kinds
FROM (
  SELECT s."event_id" AS event_id,
         array_agg(DISTINCT s."source_kind") AS kinds
  FROM "EventSignal" s
  WHERE s."event_id" IS NOT NULL
    AND s."removed_at" IS NULL
  GROUP BY s."event_id"
) sub
WHERE e."id" = sub.event_id;
