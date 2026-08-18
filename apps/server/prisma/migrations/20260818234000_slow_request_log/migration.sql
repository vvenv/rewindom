-- CreateTable
CREATE TABLE "SlowRequestLog" (
    "id" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "status_code" INTEGER NOT NULL,
    "route" TEXT NOT NULL,
    "path" TEXT,
    "method" TEXT NOT NULL,
    "tenant_slug" TEXT,
    "user_id" TEXT,
    "username" TEXT,
    "request_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'http',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlowRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlowRequestLog_created_at_idx" ON "SlowRequestLog"("created_at");

-- CreateIndex
CREATE INDEX "SlowRequestLog_duration_ms_idx" ON "SlowRequestLog"("duration_ms");

-- CreateIndex
CREATE INDEX "SlowRequestLog_route_idx" ON "SlowRequestLog"("route");

-- CreateIndex
CREATE INDEX "SlowRequestLog_tenant_slug_idx" ON "SlowRequestLog"("tenant_slug");

-- CreateIndex
CREATE INDEX "SlowRequestLog_status_code_idx" ON "SlowRequestLog"("status_code");
