-- CreateTable
CREATE TABLE "MarketingSite" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "logo_url" TEXT,
    "primary_color" TEXT,
    "default_locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "nav_json" JSONB NOT NULL DEFAULT '[]',
    "footer_json" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPage" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "kind" TEXT NOT NULL DEFAULT 'page',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "body_md" TEXT NOT NULL DEFAULT '',
    "home_blocks" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSite_tenant_id_key" ON "MarketingSite"("tenant_id");

-- CreateIndex
CREATE INDEX "MarketingSite_tenant_id_idx" ON "MarketingSite"("tenant_id");

-- CreateIndex
CREATE INDEX "MarketingPage_tenant_id_idx" ON "MarketingPage"("tenant_id");

-- CreateIndex
CREATE INDEX "MarketingPage_tenant_id_status_kind_idx" ON "MarketingPage"("tenant_id", "status", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPage_tenant_id_slug_locale_key" ON "MarketingPage"("tenant_id", "slug", "locale");
