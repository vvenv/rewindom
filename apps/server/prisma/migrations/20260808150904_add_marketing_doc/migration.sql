-- CreateTable
CREATE TABLE "MarketingDoc" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "body_md" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title_draft" TEXT NOT NULL,
    "description_draft" TEXT NOT NULL DEFAULT '',
    "body_md_draft" TEXT NOT NULL DEFAULT '',
    "category_draft" TEXT NOT NULL DEFAULT '',
    "sort_order_draft" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingDoc_tenant_id_idx" ON "MarketingDoc"("tenant_id");

-- CreateIndex
CREATE INDEX "MarketingDoc_tenant_id_status_idx" ON "MarketingDoc"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "MarketingDoc_tenant_id_category_sort_order_idx" ON "MarketingDoc"("tenant_id", "category", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingDoc_tenant_id_slug_locale_key" ON "MarketingDoc"("tenant_id", "slug", "locale");
