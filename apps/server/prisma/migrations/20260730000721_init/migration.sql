-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "username" TEXT NOT NULL,
    "tenant_slug" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'tenant',
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BackgroundJob" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "description" TEXT,
    "result" JSONB,
    "input" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ErrorLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "user_id" TEXT,
    "username" TEXT,
    "tenant_slug" TEXT,
    "route" TEXT,
    "method" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_body" JSONB,
    "request_params" JSONB,
    "request_query" JSONB,
    "error_code" TEXT,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Note" (
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

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_path" TEXT,
    "metadata" JSONB,
    "dedupe_key" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationLog" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "alert_severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformAdmin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_system_admin" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "last_access_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformAdminRefreshToken" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlatformAdminRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformAdminRole" (
    "admin_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdminRole_pkey" PRIMARY KEY ("admin_id","role_id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "tenant_id" TEXT,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "role_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role_id","permission")
);

-- CreateTable
CREATE TABLE "public"."SlowQueryLog" (
    "id" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "query" TEXT NOT NULL,
    "params" TEXT,
    "fingerprint" TEXT NOT NULL,
    "target" TEXT,
    "route" TEXT,
    "method" TEXT,
    "tenant_slug" TEXT,
    "user_id" TEXT,
    "username" TEXT,
    "request_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'http',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlowQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "plan_since" TIMESTAMP(3),
    "plan_ends_at" TIMESTAMP(3),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TenantApiKey" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "TenantApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TenantSetting" (
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "secret" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSetting_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "public"."Todo" (
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

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_access_at" TIMESTAMP(3),
    "is_system_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRole" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "public"."brands" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "weight_factor" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "dimension_factor" JSONB NOT NULL,
    "logo_url" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."destinations" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100),
    "flag" VARCHAR(10),
    "continent" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estimation_rules" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "style_id" INTEGER NOT NULL,
    "size_id" INTEGER,
    "with_box" BOOLEAN NOT NULL DEFAULT false,
    "estimated_weight" DECIMAL(5,3) NOT NULL,
    "estimated_dimensions" JSONB NOT NULL,
    "volume_weight" DECIMAL(5,3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_categories" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "parent_id" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shipping_channels" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channel_name" VARCHAR(100) NOT NULL,
    "channel_type" VARCHAR(50) NOT NULL,
    "origin" VARCHAR(50) NOT NULL,
    "destinations" JSONB NOT NULL,
    "destination_suffixes" JSONB,
    "destination_notes" JSONB,
    "weight_ranges" JSONB NOT NULL,
    "prices" JSONB NOT NULL,
    "volume_weight_divisor" INTEGER NOT NULL DEFAULT 6000,
    "special_conditions" JSONB,
    "pricing_model" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "sheet_name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sizes" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "size_value" VARCHAR(20) NOT NULL,
    "size_type" VARCHAR(10) NOT NULL,
    "weight_adjustment" DECIMAL(5,3) NOT NULL DEFAULT 0,
    "dimension_adjustment" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."styles" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "base_weight" DECIMAL(5,3) NOT NULL,
    "base_dimensions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "styles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "public"."AuditLog"("created_at" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_scope_idx" ON "public"."AuditLog"("scope" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_tenant_slug_idx" ON "public"."AuditLog"("tenant_slug" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "public"."AuditLog"("user_id" ASC);

-- CreateIndex
CREATE INDEX "BackgroundJob_user_id_created_at_idx" ON "public"."BackgroundJob"("user_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "ErrorLog_created_at_idx" ON "public"."ErrorLog"("created_at" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_error_code_idx" ON "public"."ErrorLog"("error_code" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_level_idx" ON "public"."ErrorLog"("level" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_request_body_idx" ON "public"."ErrorLog" USING GIN ("request_body" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "ErrorLog_tenant_slug_idx" ON "public"."ErrorLog"("tenant_slug" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_user_id_idx" ON "public"."ErrorLog"("user_id" ASC);

-- CreateIndex
CREATE INDEX "Note_tenant_id_idx" ON "public"."Note"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "Note_tenant_id_updated_at_idx" ON "public"."Note"("tenant_id" ASC, "updated_at" ASC);

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "public"."Notification"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_tenant_id_dedupe_key_key" ON "public"."Notification"("tenant_id" ASC, "dedupe_key" ASC);

-- CreateIndex
CREATE INDEX "Notification_tenant_id_user_id_created_at_idx" ON "public"."Notification"("tenant_id" ASC, "user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "Notification_tenant_id_user_id_read_at_created_at_idx" ON "public"."Notification"("tenant_id" ASC, "user_id" ASC, "read_at" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "NotificationLog_alert_severity_created_at_idx" ON "public"."NotificationLog"("alert_severity" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "NotificationLog_alert_type_created_at_idx" ON "public"."NotificationLog"("alert_type" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "NotificationLog_channel_created_at_idx" ON "public"."NotificationLog"("channel" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "NotificationLog_tenant_id_created_at_idx" ON "public"."NotificationLog"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_username_key" ON "public"."PlatformAdmin"("username" ASC);

-- CreateIndex
CREATE INDEX "PlatformAdminRefreshToken_admin_id_idx" ON "public"."PlatformAdminRefreshToken"("admin_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdminRefreshToken_token_key" ON "public"."PlatformAdminRefreshToken"("token" ASC);

-- CreateIndex
CREATE INDEX "PlatformAdminRole_role_id_idx" ON "public"."PlatformAdminRole"("role_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "public"."RefreshToken"("token" ASC);

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "public"."RefreshToken"("user_id" ASC);

-- CreateIndex
CREATE INDEX "Role_scope_idx" ON "public"."Role"("scope" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Role_scope_tenant_id_name_key" ON "public"."Role"("scope" ASC, "tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "Role_tenant_id_idx" ON "public"."Role"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "RolePermission_permission_idx" ON "public"."RolePermission"("permission" ASC);

-- CreateIndex
CREATE INDEX "SlowQueryLog_created_at_idx" ON "public"."SlowQueryLog"("created_at" ASC);

-- CreateIndex
CREATE INDEX "SlowQueryLog_duration_ms_idx" ON "public"."SlowQueryLog"("duration_ms" ASC);

-- CreateIndex
CREATE INDEX "SlowQueryLog_fingerprint_idx" ON "public"."SlowQueryLog"("fingerprint" ASC);

-- CreateIndex
CREATE INDEX "SlowQueryLog_route_idx" ON "public"."SlowQueryLog"("route" ASC);

-- CreateIndex
CREATE INDEX "SlowQueryLog_tenant_slug_idx" ON "public"."SlowQueryLog"("tenant_slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug" ASC);

-- CreateIndex
CREATE INDEX "TenantApiKey_key_hash_idx" ON "public"."TenantApiKey"("key_hash" ASC);

-- CreateIndex
CREATE INDEX "TenantApiKey_tenant_id_idx" ON "public"."TenantApiKey"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "Todo_tenant_id_completed_updated_at_idx" ON "public"."Todo"("tenant_id" ASC, "completed" ASC, "updated_at" ASC);

-- CreateIndex
CREATE INDEX "Todo_tenant_id_idx" ON "public"."Todo"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "User_tenant_id_idx" ON "public"."User"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_tenant_id_username_key" ON "public"."User"("tenant_id" ASC, "username" ASC);

-- CreateIndex
CREATE INDEX "UserRole_role_id_idx" ON "public"."UserRole"("role_id" ASC);

-- CreateIndex
CREATE INDEX "brands_tenant_id_category_id_idx" ON "public"."brands"("tenant_id" ASC, "category_id" ASC);

-- CreateIndex
CREATE INDEX "brands_tenant_id_idx" ON "public"."brands"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "destinations_tenant_id_code_key" ON "public"."destinations"("tenant_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "destinations_tenant_id_idx" ON "public"."destinations"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "estimation_rules_tenant_id_idx" ON "public"."estimation_rules"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "estimation_rules_tenant_id_style_id_idx" ON "public"."estimation_rules"("tenant_id" ASC, "style_id" ASC);

-- CreateIndex
CREATE INDEX "product_categories_tenant_id_idx" ON "public"."product_categories"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "shipping_channels_tenant_id_channel_name_idx" ON "public"."shipping_channels"("tenant_id" ASC, "channel_name" ASC);

-- CreateIndex
CREATE INDEX "shipping_channels_tenant_id_idx" ON "public"."shipping_channels"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "sizes_tenant_id_idx" ON "public"."sizes"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "styles_tenant_id_category_id_idx" ON "public"."styles"("tenant_id" ASC, "category_id" ASC);

-- CreateIndex
CREATE INDEX "styles_tenant_id_idx" ON "public"."styles"("tenant_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackgroundJob" ADD CONSTRAINT "BackgroundJob_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAdminRefreshToken" ADD CONSTRAINT "PlatformAdminRefreshToken_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAdminRole" ADD CONSTRAINT "PlatformAdminRole_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAdminRole" ADD CONSTRAINT "PlatformAdminRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TenantSetting" ADD CONSTRAINT "TenantSetting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."brands" ADD CONSTRAINT "brands_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimation_rules" ADD CONSTRAINT "estimation_rules_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimation_rules" ADD CONSTRAINT "estimation_rules_style_id_fkey" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."styles" ADD CONSTRAINT "styles_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."styles" ADD CONSTRAINT "styles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


