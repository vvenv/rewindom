-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "confirm_token" TEXT,
    "confirm_token_expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "unsubscribe_token" TEXT NOT NULL,
    "unsubscribed_at" TIMESTAMP(3),
    "source_path" TEXT,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "list_key" TEXT NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "NewsletterDigestRun" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "list_key" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "cursor" TEXT,
    "last_run_at" TIMESTAMP(3),
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterDigestRun_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribe_token_key" ON "NewsletterSubscriber"("unsubscribe_token");
-- CreateIndex
CREATE INDEX "NewsletterSubscriber_tenant_id_status_idx" ON "NewsletterSubscriber"("tenant_id", "status");
-- CreateIndex
CREATE INDEX "NewsletterSubscriber_tenant_id_created_at_idx" ON "NewsletterSubscriber"("tenant_id", "created_at");
-- CreateIndex
CREATE INDEX "NewsletterSubscriber_confirm_token_idx" ON "NewsletterSubscriber"("confirm_token");
-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_tenant_id_email_key" ON "NewsletterSubscriber"("tenant_id", "email");
-- CreateIndex
CREATE INDEX "NewsletterSubscription_tenant_id_list_key_cadence_idx" ON "NewsletterSubscription"("tenant_id", "list_key", "cadence");
-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_tenant_id_subscriber_id_list_key_key" ON "NewsletterSubscription"("tenant_id", "subscriber_id", "list_key");
-- CreateIndex
CREATE INDEX "NewsletterDigestRun_tenant_id_last_run_at_idx" ON "NewsletterDigestRun"("tenant_id", "last_run_at");
-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDigestRun_tenant_id_list_key_cadence_key" ON "NewsletterDigestRun"("tenant_id", "list_key", "cadence");
-- AddForeignKey
ALTER TABLE "NewsletterSubscription" ADD CONSTRAINT "NewsletterSubscription_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
