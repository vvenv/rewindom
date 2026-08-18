-- Rising 的排序键从 velocity_pct 换成近窗新增量。
--
-- velocity_pct 对「信号全落在同一个 6h 窗内」的事件恒等于 heat_score * 100
--（旧实现在 previous = 0 时取 base = 1），线上几乎所有事件都属于这种，
-- 于是「正在升温」与「正在发生」排出同一串。它不再是排序键，索引一并撤掉。
--
-- 三个新列都有默认值，存量行不需要回填：下一轮采集的 refreshEvents 会重算。

-- DropIndex
DROP INDEX "NewsEvent_tenant_id_velocity_pct_idx";

-- AlterTable
ALTER TABLE "NewsEvent" ADD COLUMN     "has_velocity_baseline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recent_signal_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recent_source_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "NewsEvent_tenant_id_recent_source_count_recent_signal_count_idx" ON "NewsEvent"("tenant_id", "recent_source_count" DESC, "recent_signal_count" DESC);
