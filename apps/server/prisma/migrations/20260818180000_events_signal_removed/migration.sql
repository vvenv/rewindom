-- 工作台手动移除一条信号：软删，不是硬删。
--
-- 硬删的话源下一轮采集又把同一条抓回来了——运营点一次「移除」，15 分钟后它复活。
-- 留着行本身就是墓碑：采集的身份键会命中它，于是不再重建（见 ingest.service.ts）。

-- AlterTable
ALTER TABLE "EventSignal" ADD COLUMN "removed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EventSignal_event_id_removed_at_idx" ON "EventSignal"("event_id", "removed_at");
