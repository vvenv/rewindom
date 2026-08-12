-- 官网会员付费（site-billing）三张表 + billing 两条唯一键收窄到租户内。
--
-- 唯一键从 (provider, provider_subscription_id) 改成 (tenant_id, provider, …)：
-- webhook 落库改走 upsert，而 tenant-guard 只认得复合唯一键里的 tenant_id
-- （见 findTenantPredicate）——不带 tenant_id 的 where 就逃出了租户隔离。
-- 新约束比旧的更宽，存量数据必然满足，不会因重复值失败。

-- DropIndex
DROP INDEX "Payment_provider_provider_order_id_key";

-- DropIndex
DROP INDEX "Subscription_provider_provider_subscription_id_key";

-- CreateTable
CREATE TABLE "MemberPlan" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "provider_product_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSubscription" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT,
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

    CONSTRAINT "MemberSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPayment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "plan_slug" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'creem',
    "provider_order_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "description" TEXT,
    "raw_event" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberPlan_tenant_id_enabled_sort_order_idx" ON "MemberPlan"("tenant_id", "enabled", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "MemberPlan_tenant_id_slug_key" ON "MemberPlan"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "MemberSubscription_tenant_id_member_id_idx" ON "MemberSubscription"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "MemberSubscription_tenant_id_status_idx" ON "MemberSubscription"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSubscription_tenant_id_provider_provider_subscription_key" ON "MemberSubscription"("tenant_id", "provider", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "MemberPayment_tenant_id_member_id_idx" ON "MemberPayment"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "MemberPayment_tenant_id_created_at_idx" ON "MemberPayment"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "MemberPayment_tenant_id_provider_provider_order_id_key" ON "MemberPayment"("tenant_id", "provider", "provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tenant_id_provider_provider_order_id_key" ON "Payment"("tenant_id", "provider", "provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenant_id_provider_provider_subscription_id_key" ON "Subscription"("tenant_id", "provider", "provider_subscription_id");
