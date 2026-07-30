-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'creem',
    "provider_subscription_id" TEXT NOT NULL,
    "provider_customer_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "plan_slug" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'creem',
    "provider_order_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "description" TEXT,
    "raw_event" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_idx" ON "Subscription"("tenant_id");

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_status_idx" ON "Subscription"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_provider_provider_subscription_id_key" ON "Subscription"("provider", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "Payment_tenant_id_created_at_idx" ON "Payment"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "Payment_tenant_id_idx" ON "Payment"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_provider_order_id_key" ON "Payment"("provider", "provider_order_id");
