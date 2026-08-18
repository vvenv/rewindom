-- 关注实体：留存的真正支点。
--
-- 与关注事件的区别是时间尺度：事件 24h 后就凉，关注它第三天就没意义了；
-- 实体不会凉——关注「OpenAI」之后只要它再出现在任何事件里就有东西可推。

-- CreateTable
CREATE TABLE "EventEntityFollow" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEntityFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventEntityFollow_tenant_id_user_id_idx" ON "EventEntityFollow"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "EventEntityFollow_entity_id_idx" ON "EventEntityFollow"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventEntityFollow_tenant_id_user_id_entity_id_key" ON "EventEntityFollow"("tenant_id", "user_id", "entity_id");

-- AddForeignKey
ALTER TABLE "EventEntityFollow" ADD CONSTRAINT "EventEntityFollow_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "EventEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

