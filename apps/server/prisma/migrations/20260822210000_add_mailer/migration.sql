-- CreateTable
CREATE TABLE "MailDelivery" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "driver" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "headers" JSONB,
    "provider_message_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailDelivery_tenant_id_status_next_attempt_at_idx" ON "MailDelivery"("tenant_id", "status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "MailDelivery_tenant_id_created_at_idx" ON "MailDelivery"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "MailDelivery_tenant_id_idempotency_key_key" ON "MailDelivery"("tenant_id", "idempotency_key");
