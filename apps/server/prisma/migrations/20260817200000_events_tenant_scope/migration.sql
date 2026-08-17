-- 事件语料改为按站点隔离：采集源 / 信号 / 事件 / 时间线带上 tenant_id。
-- 存量行挂到最早创建的站点上（开发库与单站点部署都是这份语料的原主人）。
-- NewsEvent.manual_content：工作台改过的标题/摘要，采集刷新不再覆盖。

ALTER TABLE "EventFeed" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "EventSignal" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "NewsEvent" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "NewsEvent" ADD COLUMN "manual_content" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventTimelineEntry" ADD COLUMN "tenant_id" TEXT;

UPDATE "EventFeed" SET "tenant_id" = (SELECT "id" FROM "Tenant" ORDER BY "created_at" ASC LIMIT 1);
UPDATE "EventSignal" SET "tenant_id" = (SELECT "id" FROM "Tenant" ORDER BY "created_at" ASC LIMIT 1);
UPDATE "NewsEvent" SET "tenant_id" = (SELECT "id" FROM "Tenant" ORDER BY "created_at" ASC LIMIT 1);
UPDATE "EventTimelineEntry" e
SET "tenant_id" = n."tenant_id"
FROM "NewsEvent" n
WHERE e."event_id" = n."id";

ALTER TABLE "EventFeed" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "EventSignal" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "NewsEvent" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "EventTimelineEntry" ALTER COLUMN "tenant_id" SET NOT NULL;

DROP INDEX "EventFeed_url_key";
DROP INDEX "EventFeed_enabled_last_fetched_at_idx";
CREATE UNIQUE INDEX "EventFeed_tenant_id_url_key" ON "EventFeed"("tenant_id", "url");
CREATE INDEX "EventFeed_tenant_id_enabled_last_fetched_at_idx" ON "EventFeed"("tenant_id", "enabled", "last_fetched_at");

DROP INDEX "EventSignal_connector_external_id_key";
DROP INDEX "EventSignal_connector_source_name_canonical_url_key";
DROP INDEX "EventSignal_published_at_idx";
DROP INDEX "EventSignal_canonical_url_idx";
CREATE UNIQUE INDEX "EventSignal_tenant_id_connector_external_id_key" ON "EventSignal"("tenant_id", "connector", "external_id");
CREATE UNIQUE INDEX "EventSignal_tenant_id_connector_source_name_canonical_url_key" ON "EventSignal"("tenant_id", "connector", "source_name", "canonical_url");
CREATE INDEX "EventSignal_tenant_id_published_at_idx" ON "EventSignal"("tenant_id", "published_at" DESC);
CREATE INDEX "EventSignal_tenant_id_canonical_url_idx" ON "EventSignal"("tenant_id", "canonical_url");

DROP INDEX "NewsEvent_slug_key";
DROP INDEX "NewsEvent_fingerprint_key";
DROP INDEX "NewsEvent_status_last_activity_at_idx";
DROP INDEX "NewsEvent_topic_last_activity_at_idx";
DROP INDEX "NewsEvent_velocity_pct_idx";
DROP INDEX "NewsEvent_last_activity_at_idx";
CREATE UNIQUE INDEX "NewsEvent_tenant_id_slug_key" ON "NewsEvent"("tenant_id", "slug");
CREATE UNIQUE INDEX "NewsEvent_tenant_id_fingerprint_key" ON "NewsEvent"("tenant_id", "fingerprint");
CREATE INDEX "NewsEvent_tenant_id_status_last_activity_at_idx" ON "NewsEvent"("tenant_id", "status", "last_activity_at" DESC);
CREATE INDEX "NewsEvent_tenant_id_topic_last_activity_at_idx" ON "NewsEvent"("tenant_id", "topic", "last_activity_at" DESC);
CREATE INDEX "NewsEvent_tenant_id_velocity_pct_idx" ON "NewsEvent"("tenant_id", "velocity_pct" DESC);
CREATE INDEX "NewsEvent_tenant_id_last_activity_at_idx" ON "NewsEvent"("tenant_id", "last_activity_at" DESC);

CREATE INDEX "EventTimelineEntry_tenant_id_idx" ON "EventTimelineEntry"("tenant_id");

ALTER TABLE "EventFeed" ADD CONSTRAINT "EventFeed_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventSignal" ADD CONSTRAINT "EventSignal_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsEvent" ADD CONSTRAINT "NewsEvent_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTimelineEntry" ADD CONSTRAINT "EventTimelineEntry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
