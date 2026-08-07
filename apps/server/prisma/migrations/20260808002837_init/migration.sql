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
    "detail_key" TEXT,
    "detail_params" JSONB,

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
CREATE TABLE "public"."MarketingAsset" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketingFormSubmission" (
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

-- CreateTable
CREATE TABLE "public"."MarketingPage" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "kind" TEXT NOT NULL DEFAULT 'page',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "title_draft" TEXT NOT NULL,
    "description_draft" TEXT NOT NULL DEFAULT '',
    "sections_draft" JSONB NOT NULL DEFAULT '[]',
    "settings_draft" JSONB NOT NULL DEFAULT '{}',
    "visibility" TEXT NOT NULL DEFAULT 'public',

    CONSTRAINT "MarketingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketingPageVersion" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketingRedirect" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_path" TEXT NOT NULL,
    "to_path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketingSite" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "site_name" JSONB NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "default_locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "nav_json" JSONB NOT NULL DEFAULT '[]',
    "footer_json" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "theme_settings" JSONB NOT NULL DEFAULT '{}',
    "nav_draft_json" JSONB NOT NULL DEFAULT '[]',
    "footer_draft_json" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "MarketingSite_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."OAuthAccount" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_username" TEXT,
    "provider_email" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "plan_slug" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'creem',
    "provider_order_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "description" TEXT,
    "raw_event" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."SiteMember" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "display_name" TEXT NOT NULL DEFAULT '',
    "email_verified_at" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "SiteMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteMemberOAuthAccount" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "provider_email" TEXT,
    "provider_username" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteMemberOAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteMemberOAuthExchangeCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMemberOAuthExchangeCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteMemberRefreshToken" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SiteMemberRefreshToken_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'creem',
    "provider_subscription_id" TEXT NOT NULL,
    "provider_customer_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
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
    "custom_domain" TEXT,

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
    "password" TEXT,
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

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "public"."AuditLog"("created_at" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_detail_key_idx" ON "public"."AuditLog"("detail_key" ASC);

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
-- NOTE: `prisma migrate diff` 会给 GIN 索引列错误地加上 ASC，PostgreSQL 会报
-- `access method "gin" does not support ASC/DESC options`，这里手动去掉。
CREATE INDEX "ErrorLog_request_body_idx" ON "public"."ErrorLog" USING GIN ("request_body" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "ErrorLog_tenant_slug_idx" ON "public"."ErrorLog"("tenant_slug" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_user_id_idx" ON "public"."ErrorLog"("user_id" ASC);

-- CreateIndex
CREATE INDEX "MarketingAsset_tenant_id_created_at_idx" ON "public"."MarketingAsset"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAsset_tenant_id_filename_key" ON "public"."MarketingAsset"("tenant_id" ASC, "filename" ASC);

-- CreateIndex
CREATE INDEX "MarketingFormSubmission_tenant_id_created_at_idx" ON "public"."MarketingFormSubmission"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "MarketingFormSubmission_tenant_id_section_id_idx" ON "public"."MarketingFormSubmission"("tenant_id" ASC, "section_id" ASC);

-- CreateIndex
CREATE INDEX "MarketingPage_tenant_id_idx" ON "public"."MarketingPage"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPage_tenant_id_slug_locale_key" ON "public"."MarketingPage"("tenant_id" ASC, "slug" ASC, "locale" ASC);

-- CreateIndex
CREATE INDEX "MarketingPage_tenant_id_status_kind_idx" ON "public"."MarketingPage"("tenant_id" ASC, "status" ASC, "kind" ASC);

-- CreateIndex
CREATE INDEX "MarketingPageVersion_tenant_id_page_id_created_at_idx" ON "public"."MarketingPageVersion"("tenant_id" ASC, "page_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPageVersion_tenant_id_page_id_version_key" ON "public"."MarketingPageVersion"("tenant_id" ASC, "page_id" ASC, "version" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingRedirect_tenant_id_from_path_key" ON "public"."MarketingRedirect"("tenant_id" ASC, "from_path" ASC);

-- CreateIndex
CREATE INDEX "MarketingRedirect_tenant_id_idx" ON "public"."MarketingRedirect"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "MarketingSite_tenant_id_idx" ON "public"."MarketingSite"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSite_tenant_id_key" ON "public"."MarketingSite"("tenant_id" ASC);

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
CREATE UNIQUE INDEX "OAuthAccount_provider_provider_user_id_key" ON "public"."OAuthAccount"("provider" ASC, "provider_user_id" ASC);

-- CreateIndex
CREATE INDEX "OAuthAccount_user_id_idx" ON "public"."OAuthAccount"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_provider_order_id_key" ON "public"."Payment"("provider" ASC, "provider_order_id" ASC);

-- CreateIndex
CREATE INDEX "Payment_tenant_id_created_at_idx" ON "public"."Payment"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "Payment_tenant_id_idx" ON "public"."Payment"("tenant_id" ASC);

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
CREATE UNIQUE INDEX "SiteMember_tenant_id_email_key" ON "public"."SiteMember"("tenant_id" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "SiteMember_tenant_id_idx" ON "public"."SiteMember"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "SiteMemberOAuthAccount_member_id_idx" ON "public"."SiteMemberOAuthAccount"("member_id" ASC);

-- CreateIndex
CREATE INDEX "SiteMemberOAuthAccount_tenant_id_idx" ON "public"."SiteMemberOAuthAccount"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteMemberOAuthAccount_tenant_id_provider_provider_user_id_key" ON "public"."SiteMemberOAuthAccount"("tenant_id" ASC, "provider" ASC, "provider_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteMemberOAuthExchangeCode_code_key" ON "public"."SiteMemberOAuthExchangeCode"("code" ASC);

-- CreateIndex
CREATE INDEX "SiteMemberOAuthExchangeCode_expires_at_idx" ON "public"."SiteMemberOAuthExchangeCode"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "SiteMemberOAuthExchangeCode_member_id_idx" ON "public"."SiteMemberOAuthExchangeCode"("member_id" ASC);

-- CreateIndex
CREATE INDEX "SiteMemberOAuthExchangeCode_tenant_id_idx" ON "public"."SiteMemberOAuthExchangeCode"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "SiteMemberRefreshToken_member_id_idx" ON "public"."SiteMemberRefreshToken"("member_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SiteMemberRefreshToken_token_key" ON "public"."SiteMemberRefreshToken"("token" ASC);

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
CREATE UNIQUE INDEX "Subscription_provider_provider_subscription_id_key" ON "public"."Subscription"("provider" ASC, "provider_subscription_id" ASC);

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_idx" ON "public"."Subscription"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_status_idx" ON "public"."Subscription"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_custom_domain_key" ON "public"."Tenant"("custom_domain" ASC);

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

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackgroundJob" ADD CONSTRAINT "BackgroundJob_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthAccount" ADD CONSTRAINT "OAuthAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "public"."SiteMemberOAuthAccount" ADD CONSTRAINT "SiteMemberOAuthAccount_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteMemberOAuthExchangeCode" ADD CONSTRAINT "SiteMemberOAuthExchangeCode_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteMemberRefreshToken" ADD CONSTRAINT "SiteMemberRefreshToken_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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


