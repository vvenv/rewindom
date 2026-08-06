-- CreateTable
CREATE TABLE "MarketingFormSubmission" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "page_slug" TEXT NOT NULL,
    "page_locale" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "form_title" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '[]',
    "ip" TEXT NOT NULL DEFAULT '',
    "user_agent" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingFormSubmission_tenant_id_created_at_idx" ON "MarketingFormSubmission"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "MarketingFormSubmission_tenant_id_section_id_idx" ON "MarketingFormSubmission"("tenant_id", "section_id");
