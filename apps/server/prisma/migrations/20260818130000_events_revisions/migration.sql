-- 事件修订史：只追加的观察记录。
--
-- 「自你上次看之后发生了什么」以前只能从 EventFollow.last_seen_at 推出一个布尔。
-- 竞品做不到这件事是结构性的：每轮重新聚类的产品没有连续观察记录，事后补算不出来。
--
-- 同时删掉 EventTimelineEntry 上那条只有 tenant_id 的索引：选择度极低，
-- 而所有查询都恒带 event_id，(event_id, occurred_at) 那条已经覆盖。

-- DropIndex
DROP INDEX "EventTimelineEntry_tenant_id_idx";

-- CreateTable
CREATE TABLE "EventRevision" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRevision_tenant_id_event_id_occurred_at_idx" ON "EventRevision"("tenant_id", "event_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "EventRevision_tenant_id_occurred_at_idx" ON "EventRevision"("tenant_id", "occurred_at" DESC);

-- 重跑保护：refreshEvents 幂等，修订写入也必须幂等
CREATE UNIQUE INDEX "EventRevision_event_id_kind_occurred_at_key" ON "EventRevision"("event_id", "kind", "occurred_at");

-- AddForeignKey
ALTER TABLE "EventRevision" ADD CONSTRAINT "EventRevision_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
