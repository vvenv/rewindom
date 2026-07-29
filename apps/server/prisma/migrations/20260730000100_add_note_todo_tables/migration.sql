-- Backfill Note / Todo: init was marked applied while these tables were absent
-- (schema drift after baseline / squash). Idempotent for re-runs.

CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Todo" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Note_tenant_id_idx" ON "Note"("tenant_id");
CREATE INDEX IF NOT EXISTS "Note_tenant_id_updated_at_idx" ON "Note"("tenant_id", "updated_at");
CREATE INDEX IF NOT EXISTS "Todo_tenant_id_idx" ON "Todo"("tenant_id");
CREATE INDEX IF NOT EXISTS "Todo_tenant_id_completed_updated_at_idx" ON "Todo"("tenant_id", "completed", "updated_at");
