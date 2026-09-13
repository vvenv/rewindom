-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "last_error" TEXT,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboxMessage_status_next_attempt_at_idx" ON "OutboxMessage"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "OutboxMessage_topic_idx" ON "OutboxMessage"("topic");

-- CreateIndex
CREATE INDEX "OutboxMessage_tenant_id_idx" ON "OutboxMessage"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxMessage_topic_dedupe_key_key" ON "OutboxMessage"("topic", "dedupe_key");
