-- events 模块：跨来源事件雷达。
--
-- 归属口径：Feed / Signal / NewsEvent / Timeline 是全平台共享的一份语料（tenant-guard 里为 global），
-- 只有 EventFollow 是租户态——谁关注了哪个事件、看到哪儿了。


-- CreateTable
CREATE TABLE "EventFeed" (
    "id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'tech',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSignal" (
    "id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "author" TEXT,
    "topic" TEXT NOT NULL DEFAULT 'tech',
    "score" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "topic" TEXT NOT NULL DEFAULT 'tech',
    "status" TEXT NOT NULL DEFAULT 'developing',
    "fingerprint" TEXT NOT NULL,
    "tokens" TEXT[],
    "source_names" TEXT[],
    "signal_count" INTEGER NOT NULL DEFAULT 0,
    "source_count" INTEGER NOT NULL DEFAULT 0,
    "heat_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "velocity_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL,
    "analyzed_at" TIMESTAMP(3),
    "analyzer" TEXT NOT NULL DEFAULT 'heuristic',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTimelineEntry" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "label_code" TEXT,
    "label_text" TEXT,
    "source_kind" TEXT NOT NULL,
    "source_name" TEXT NOT NULL DEFAULT '',
    "signal_id" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFollow" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventFeed_url_key" ON "EventFeed"("url");

-- CreateIndex
CREATE INDEX "EventFeed_enabled_last_fetched_at_idx" ON "EventFeed"("enabled", "last_fetched_at");

-- CreateIndex
CREATE INDEX "EventSignal_event_id_published_at_idx" ON "EventSignal"("event_id", "published_at");

-- CreateIndex
CREATE INDEX "EventSignal_published_at_idx" ON "EventSignal"("published_at" DESC);

-- CreateIndex
CREATE INDEX "EventSignal_canonical_url_idx" ON "EventSignal"("canonical_url");

-- CreateIndex
CREATE UNIQUE INDEX "EventSignal_connector_external_id_key" ON "EventSignal"("connector", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEvent_slug_key" ON "NewsEvent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEvent_fingerprint_key" ON "NewsEvent"("fingerprint");

-- CreateIndex
CREATE INDEX "NewsEvent_status_last_activity_at_idx" ON "NewsEvent"("status", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "NewsEvent_topic_last_activity_at_idx" ON "NewsEvent"("topic", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "NewsEvent_velocity_pct_idx" ON "NewsEvent"("velocity_pct" DESC);

-- CreateIndex
CREATE INDEX "NewsEvent_last_activity_at_idx" ON "NewsEvent"("last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "EventTimelineEntry_event_id_occurred_at_idx" ON "EventTimelineEntry"("event_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "EventTimelineEntry_event_id_signal_id_key" ON "EventTimelineEntry"("event_id", "signal_id");

-- CreateIndex
CREATE INDEX "EventFollow_tenant_id_user_id_idx" ON "EventFollow"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "EventFollow_event_id_idx" ON "EventFollow"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventFollow_tenant_id_user_id_event_id_key" ON "EventFollow"("tenant_id", "user_id", "event_id");

-- AddForeignKey
ALTER TABLE "EventSignal" ADD CONSTRAINT "EventSignal_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTimelineEntry" ADD CONSTRAINT "EventTimelineEntry_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFollow" ADD CONSTRAINT "EventFollow_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

