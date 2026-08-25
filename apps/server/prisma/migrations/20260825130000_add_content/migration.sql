-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "brief" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT 'note',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error_message" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL DEFAULT '',
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "storage_key" TEXT,
    "text_body" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Content_tenant_id_idx" ON "Content"("tenant_id");

-- CreateIndex
CREATE INDEX "Content_tenant_id_updated_at_idx" ON "Content"("tenant_id", "updated_at");

-- CreateIndex
CREATE INDEX "ContentAsset_tenant_id_idx" ON "ContentAsset"("tenant_id");

-- CreateIndex
CREATE INDEX "ContentAsset_tenant_id_content_id_idx" ON "ContentAsset"("tenant_id", "content_id");

-- AddForeignKey
ALTER TABLE "ContentAsset" ADD CONSTRAINT "ContentAsset_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
