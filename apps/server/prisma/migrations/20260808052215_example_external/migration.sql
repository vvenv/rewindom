-- CreateTable
CREATE TABLE "ExternalBookmark" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalBookmark_tenant_id_idx" ON "ExternalBookmark"("tenant_id");
