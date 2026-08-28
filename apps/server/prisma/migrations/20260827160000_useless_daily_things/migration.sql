-- 轮换改成排期：published_on 成为「哪天发哪条」的唯一真相
-- kind/title/html 让「今天那条」可以是可交互的东西，而不只是一句话

-- DropIndex
DROP INDEX "Thing_tenant_id_enabled_updated_at_idx";

-- AlterTable
ALTER TABLE "Thing" ADD COLUMN     "html" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "published_on" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "text" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "Thing_tenant_id_enabled_published_on_idx" ON "Thing"("tenant_id", "enabled", "published_on");

-- CreateIndex
CREATE UNIQUE INDEX "Thing_tenant_id_published_on_key" ON "Thing"("tenant_id", "published_on");
