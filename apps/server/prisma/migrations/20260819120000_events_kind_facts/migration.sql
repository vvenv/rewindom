-- 事件类型与按类型抽出的关键事实。
--
-- 全部可空：判不出类型、抽不到事实都留 null，绝不硬凑一个最像的
-- （与 topic 分类器「回落，不硬凑」同一条原则）。
--
-- **不回填**：与 source_kinds 那次不同，这些列没有「空数组让事件掉出 Rising」
-- 这类硬后果——kind 为 null 就是不画角标。下一轮采集会把有新信号的事件重算，
-- 降温扫描会把其余的轮一遍，慢慢长出来就行。

-- AlterTable
ALTER TABLE "EventSignal" ADD COLUMN     "incident_updates" JSONB;

-- AlterTable
ALTER TABLE "NewsEvent" ADD COLUMN     "fact_amount_text" TEXT,
ADD COLUMN     "fact_amount_usd" DOUBLE PRECISION,
ADD COLUMN     "fact_duration_minutes" INTEGER,
ADD COLUMN     "fact_resolved" BOOLEAN,
ADD COLUMN     "fact_version" TEXT,
ADD COLUMN     "kind" TEXT;
