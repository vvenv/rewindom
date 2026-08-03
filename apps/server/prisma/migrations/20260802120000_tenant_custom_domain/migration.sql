-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "custom_domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_custom_domain_key" ON "Tenant"("custom_domain");
