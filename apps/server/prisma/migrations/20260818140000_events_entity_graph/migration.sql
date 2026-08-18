-- 事件里的实体成为一等数据。
--
-- 事件是易逝的，实体不是：关注「OpenAI」比关注一个 24h 后就凉的事件留存高一个量级，
-- 而实体是稳定的聚合面（事件页只有一次索引机会）。
--
-- 身份键刻意不含别名合并——把 Meta 与 Facebook 合并需要外部知识，猜错比不合并更糟。

-- CreateTable
CREATE TABLE "EventEntity" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'org',
    "normalized" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEntityLink" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "mention_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventEntity_tenant_id_normalized_idx" ON "EventEntity"("tenant_id", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "EventEntity_tenant_id_kind_normalized_key" ON "EventEntity"("tenant_id", "kind", "normalized");

-- CreateIndex
CREATE INDEX "EventEntityLink_tenant_id_entity_id_idx" ON "EventEntityLink"("tenant_id", "entity_id");

-- CreateIndex
CREATE INDEX "EventEntityLink_event_id_mention_count_idx" ON "EventEntityLink"("event_id", "mention_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "EventEntityLink_event_id_entity_id_key" ON "EventEntityLink"("event_id", "entity_id");

-- AddForeignKey
ALTER TABLE "EventEntityLink" ADD CONSTRAINT "EventEntityLink_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEntityLink" ADD CONSTRAINT "EventEntityLink_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "EventEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

