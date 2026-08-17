-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "username" TEXT NOT NULL,
    "tenant_slug" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'tenant',
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "details" TEXT,
    "detail_key" TEXT,
    "detail_params" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
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
CREATE TABLE "Subscription" (
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
CREATE TABLE "Payment" (
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
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardPreference" (
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hidden_widgets" TEXT[],
    "widget_order" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("tenant_id","user_id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
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
CREATE TABLE "EventFeed" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'tech',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSignal" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "author" TEXT,
    "topic" TEXT NOT NULL DEFAULT 'tech',
    "score" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsEvent" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "topic" TEXT NOT NULL DEFAULT 'tech',
    "status" TEXT NOT NULL DEFAULT 'developing',
    "fingerprint" TEXT NOT NULL,
    "tokens" TEXT[],
    "source_names" TEXT[],
    "signal_count" INTEGER NOT NULL DEFAULT 0,
    "source_count" INTEGER NOT NULL DEFAULT 0,
    "heat_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "velocity_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL,
    "analyzed_at" TIMESTAMP(3),
    "analyzer" TEXT NOT NULL DEFAULT 'heuristic',
    "manual_content" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTimelineEntry" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "label_code" TEXT,
    "label_text" TEXT,
    "source_kind" TEXT NOT NULL,
    "source_name" TEXT NOT NULL DEFAULT '',
    "signal_id" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFollow" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
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
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "custom_domain" TEXT,
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
CREATE TABLE "TenantApiKey" (
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
CREATE TABLE "TenantSetting" (
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "secret" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSetting_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "is_system_admin" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "last_access_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSite" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "site_name" JSONB NOT NULL,
    "tagline" JSONB NOT NULL DEFAULT '""',
    "theme_settings" JSONB NOT NULL DEFAULT '{}',
    "theme_settings_draft" JSONB NOT NULL DEFAULT '{}',
    "theme_key" TEXT,
    "default_locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "nav_json" JSONB NOT NULL DEFAULT '[]',
    "footer_json" JSONB NOT NULL DEFAULT '[]',
    "nav_draft_json" JSONB NOT NULL DEFAULT '[]',
    "footer_draft_json" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "home_path" TEXT NOT NULL DEFAULT '/',
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
    "sections" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "title_draft" TEXT NOT NULL,
    "description_draft" TEXT NOT NULL DEFAULT '',
    "sections_draft" JSONB NOT NULL DEFAULT '[]',
    "settings_draft" JSONB NOT NULL DEFAULT '{}',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingRedirect" (
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
CREATE TABLE "MarketingAsset" (
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
CREATE TABLE "MarketingPageVersion" (
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
CREATE TABLE "Note" (
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
CREATE TABLE "Notification" (
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
CREATE TABLE "NotificationLog" (
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
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PlatformAdmin" (
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
CREATE TABLE "PlatformAdminRole" (
    "admin_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdminRole_pkey" PRIMARY KEY ("admin_id","role_id")
);

-- CreateTable
CREATE TABLE "PlatformAdminRefreshToken" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlatformAdminRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
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
CREATE TABLE "RolePermission" (
    "role_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role_id","permission")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "ShopSetting" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "origin_country" TEXT NOT NULL DEFAULT 'CN',
    "ioss_number" TEXT,
    "eori_number" TEXT,
    "stripe_tax_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" JSONB NOT NULL,
    "subtitle" JSONB,
    "description" JSONB,
    "images" JSONB NOT NULL DEFAULT '[]',
    "product_type" TEXT,
    "vendor" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "seo_title" JSONB,
    "seo_description" JSONB,
    "options" JSONB NOT NULL DEFAULT '[]',
    "published_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCollection" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" JSONB NOT NULL,
    "description" JSONB,
    "seo_title" JSONB,
    "seo_description" JSONB,
    "image_url" TEXT,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCollectionProduct" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCollectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopDiscount" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "min_subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopVariant" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" JSONB,
    "option_values" JSONB NOT NULL DEFAULT '{}',
    "price_cents" INTEGER NOT NULL,
    "compare_at_price_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "weight_g" INTEGER NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "hs_code" TEXT,
    "origin_country" TEXT,
    "inventory_policy" TEXT NOT NULL DEFAULT 'deny',
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "requires_shipping" BOOLEAN NOT NULL DEFAULT true,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCart" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_token" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "discount_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCartItem" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShippingZone" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countries" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShippingRate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier_code" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "min_days" INTEGER,
    "max_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "member_id" TEXT,
    "guest_token" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal_cents" INTEGER NOT NULL,
    "shipping_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "shipping_address" JSONB NOT NULL,
    "billing_address" JSONB,
    "shipping_rate_id" TEXT,
    "shipping_rate_name" TEXT,
    "carrier_code" TEXT,
    "stripe_checkout_session_id" TEXT,
    "note" TEXT,
    "discount_code" TEXT,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderLine" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "weight_g" INTEGER NOT NULL DEFAULT 0,
    "hs_code" TEXT,
    "origin_country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShipment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "carrier_code" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "shipped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customs_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPayment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "provider_ref" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "raw_event" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPlan" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "provider_product_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSubscription" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT,
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

    CONSTRAINT "MemberSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPayment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "plan_slug" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'creem',
    "provider_order_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "description" TEXT,
    "raw_event" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteDocCategory" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDocCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteDoc" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "body_md" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title_draft" TEXT NOT NULL,
    "description_draft" TEXT NOT NULL DEFAULT '',
    "body_md_draft" TEXT NOT NULL DEFAULT '',
    "category_draft" TEXT NOT NULL DEFAULT '',
    "sort_order_draft" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteFormSubmission" (
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

    CONSTRAINT "SiteFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMember" (
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
CREATE TABLE "SiteMemberRefreshToken" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SiteMemberRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMemberOAuthAccount" (
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
CREATE TABLE "SiteMemberOAuthExchangeCode" (
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
CREATE TABLE "SlowQueryLog" (
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
CREATE TABLE "Todo" (
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

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE INDEX "AuditLog_tenant_slug_idx" ON "AuditLog"("tenant_slug");

-- CreateIndex
CREATE INDEX "AuditLog_scope_idx" ON "AuditLog"("scope");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_detail_key_idx" ON "AuditLog"("detail_key");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- CreateIndex
CREATE INDEX "BackgroundJob_user_id_created_at_idx" ON "BackgroundJob"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_idx" ON "Subscription"("tenant_id");

-- CreateIndex
CREATE INDEX "Subscription_tenant_id_status_idx" ON "Subscription"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenant_id_provider_provider_subscription_id_key" ON "Subscription"("tenant_id", "provider", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "Payment_tenant_id_created_at_idx" ON "Payment"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "Payment_tenant_id_idx" ON "Payment"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tenant_id_provider_provider_order_id_key" ON "Payment"("tenant_id", "provider", "provider_order_id");

-- CreateIndex
CREATE INDEX "Bookmark_tenant_id_idx" ON "Bookmark"("tenant_id");

-- CreateIndex
CREATE INDEX "Bookmark_tenant_id_updated_at_idx" ON "Bookmark"("tenant_id", "updated_at");

-- CreateIndex
CREATE INDEX "ErrorLog_user_id_idx" ON "ErrorLog"("user_id");

-- CreateIndex
CREATE INDEX "ErrorLog_tenant_slug_idx" ON "ErrorLog"("tenant_slug");

-- CreateIndex
CREATE INDEX "ErrorLog_level_idx" ON "ErrorLog"("level");

-- CreateIndex
CREATE INDEX "ErrorLog_created_at_idx" ON "ErrorLog"("created_at");

-- CreateIndex
CREATE INDEX "ErrorLog_error_code_idx" ON "ErrorLog"("error_code");

-- CreateIndex
-- GIN does not support ASC/DESC; migrate diff from a live DB may emit ASC — strip it.
CREATE INDEX "ErrorLog_request_body_idx" ON "ErrorLog" USING GIN ("request_body" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "EventFeed_tenant_id_enabled_last_fetched_at_idx" ON "EventFeed"("tenant_id", "enabled", "last_fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "EventFeed_tenant_id_url_key" ON "EventFeed"("tenant_id", "url");

-- CreateIndex
CREATE INDEX "EventSignal_event_id_published_at_idx" ON "EventSignal"("event_id", "published_at");

-- CreateIndex
CREATE INDEX "EventSignal_tenant_id_published_at_idx" ON "EventSignal"("tenant_id", "published_at" DESC);

-- CreateIndex
CREATE INDEX "EventSignal_tenant_id_canonical_url_idx" ON "EventSignal"("tenant_id", "canonical_url");

-- CreateIndex
CREATE UNIQUE INDEX "EventSignal_tenant_id_connector_external_id_key" ON "EventSignal"("tenant_id", "connector", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventSignal_tenant_id_connector_source_name_canonical_url_key" ON "EventSignal"("tenant_id", "connector", "source_name", "canonical_url");

-- CreateIndex
CREATE INDEX "NewsEvent_tenant_id_status_last_activity_at_idx" ON "NewsEvent"("tenant_id", "status", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "NewsEvent_tenant_id_topic_last_activity_at_idx" ON "NewsEvent"("tenant_id", "topic", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "NewsEvent_tenant_id_velocity_pct_idx" ON "NewsEvent"("tenant_id", "velocity_pct" DESC);

-- CreateIndex
CREATE INDEX "NewsEvent_tenant_id_last_activity_at_idx" ON "NewsEvent"("tenant_id", "last_activity_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "NewsEvent_tenant_id_slug_key" ON "NewsEvent"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsEvent_tenant_id_fingerprint_key" ON "NewsEvent"("tenant_id", "fingerprint");

-- CreateIndex
CREATE INDEX "EventTimelineEntry_event_id_occurred_at_idx" ON "EventTimelineEntry"("event_id", "occurred_at");

-- CreateIndex
CREATE INDEX "EventTimelineEntry_tenant_id_idx" ON "EventTimelineEntry"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventTimelineEntry_event_id_signal_id_key" ON "EventTimelineEntry"("event_id", "signal_id");

-- CreateIndex
CREATE INDEX "EventFollow_tenant_id_user_id_idx" ON "EventFollow"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "EventFollow_event_id_idx" ON "EventFollow"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventFollow_tenant_id_user_id_event_id_key" ON "EventFollow"("tenant_id", "user_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE INDEX "OAuthAccount_user_id_idx" ON "OAuthAccount"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_provider_user_id_key" ON "OAuthAccount"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_custom_domain_key" ON "Tenant"("custom_domain");

-- CreateIndex
CREATE INDEX "TenantApiKey_tenant_id_idx" ON "TenantApiKey"("tenant_id");

-- CreateIndex
CREATE INDEX "TenantApiKey_key_hash_idx" ON "TenantApiKey"("key_hash");

-- CreateIndex
CREATE INDEX "User_tenant_id_idx" ON "User"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenant_id_username_key" ON "User"("tenant_id", "username");

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

-- CreateIndex
CREATE INDEX "MarketingRedirect_tenant_id_idx" ON "MarketingRedirect"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingRedirect_tenant_id_from_path_key" ON "MarketingRedirect"("tenant_id", "from_path");

-- CreateIndex
CREATE INDEX "MarketingAsset_tenant_id_created_at_idx" ON "MarketingAsset"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAsset_tenant_id_filename_key" ON "MarketingAsset"("tenant_id", "filename");

-- CreateIndex
CREATE INDEX "MarketingPageVersion_tenant_id_page_id_created_at_idx" ON "MarketingPageVersion"("tenant_id", "page_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPageVersion_tenant_id_page_id_version_key" ON "MarketingPageVersion"("tenant_id", "page_id", "version");

-- CreateIndex
CREATE INDEX "Note_tenant_id_idx" ON "Note"("tenant_id");

-- CreateIndex
CREATE INDEX "Note_tenant_id_updated_at_idx" ON "Note"("tenant_id", "updated_at");

-- CreateIndex
CREATE INDEX "Notification_tenant_id_user_id_read_at_created_at_idx" ON "Notification"("tenant_id", "user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "Notification_tenant_id_user_id_created_at_idx" ON "Notification"("tenant_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_tenant_id_dedupe_key_key" ON "Notification"("tenant_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "NotificationLog_tenant_id_created_at_idx" ON "NotificationLog"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "NotificationLog_channel_created_at_idx" ON "NotificationLog"("channel", "created_at");

-- CreateIndex
CREATE INDEX "NotificationLog_alert_type_created_at_idx" ON "NotificationLog"("alert_type", "created_at");

-- CreateIndex
CREATE INDEX "NotificationLog_alert_severity_created_at_idx" ON "NotificationLog"("alert_severity", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_username_key" ON "PlatformAdmin"("username");

-- CreateIndex
CREATE INDEX "PlatformAdminRole_role_id_idx" ON "PlatformAdminRole"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdminRefreshToken_token_key" ON "PlatformAdminRefreshToken"("token");

-- CreateIndex
CREATE INDEX "PlatformAdminRefreshToken_admin_id_idx" ON "PlatformAdminRefreshToken"("admin_id");

-- CreateIndex
CREATE INDEX "Role_scope_idx" ON "Role"("scope");

-- CreateIndex
CREATE INDEX "Role_tenant_id_idx" ON "Role"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Role_scope_tenant_id_name_key" ON "Role"("scope", "tenant_id", "name");

-- CreateIndex
CREATE INDEX "RolePermission_permission_idx" ON "RolePermission"("permission");

-- CreateIndex
CREATE INDEX "UserRole_role_id_idx" ON "UserRole"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSetting_tenant_id_key" ON "ShopSetting"("tenant_id");

-- CreateIndex
CREATE INDEX "ShopProduct_tenant_id_status_updated_at_idx" ON "ShopProduct"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProduct_tenant_id_slug_key" ON "ShopProduct"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "ShopCollection_tenant_id_status_updated_at_idx" ON "ShopCollection"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "ShopCollection_tenant_id_parent_id_sort_order_idx" ON "ShopCollection"("tenant_id", "parent_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCollection_tenant_id_slug_key" ON "ShopCollection"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "ShopCollectionProduct_tenant_id_collection_id_position_idx" ON "ShopCollectionProduct"("tenant_id", "collection_id", "position");

-- CreateIndex
CREATE INDEX "ShopCollectionProduct_tenant_id_product_id_idx" ON "ShopCollectionProduct"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCollectionProduct_tenant_id_collection_id_product_id_key" ON "ShopCollectionProduct"("tenant_id", "collection_id", "product_id");

-- CreateIndex
CREATE INDEX "ShopDiscount_tenant_id_status_updated_at_idx" ON "ShopDiscount"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDiscount_tenant_id_code_key" ON "ShopDiscount"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "ShopVariant_tenant_id_product_id_idx" ON "ShopVariant"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopVariant_tenant_id_sku_key" ON "ShopVariant"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "ShopCart_tenant_id_member_id_idx" ON "ShopCart"("tenant_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCart_tenant_id_guest_token_key" ON "ShopCart"("tenant_id", "guest_token");

-- CreateIndex
CREATE INDEX "ShopCartItem_tenant_id_cart_id_idx" ON "ShopCartItem"("tenant_id", "cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCartItem_tenant_id_cart_id_variant_id_key" ON "ShopCartItem"("tenant_id", "cart_id", "variant_id");

-- CreateIndex
CREATE INDEX "ShopShippingZone_tenant_id_idx" ON "ShopShippingZone"("tenant_id");

-- CreateIndex
CREATE INDEX "ShopShippingRate_tenant_id_zone_id_idx" ON "ShopShippingRate"("tenant_id", "zone_id");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_status_created_at_idx" ON "ShopOrder"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_member_id_idx" ON "ShopOrder"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_email_idx" ON "ShopOrder"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "ShopOrder_tenant_id_stripe_checkout_session_id_idx" ON "ShopOrder"("tenant_id", "stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_tenant_id_number_key" ON "ShopOrder"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "ShopOrderLine_tenant_id_order_id_idx" ON "ShopOrderLine"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "ShopShipment_tenant_id_order_id_idx" ON "ShopShipment"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "ShopPayment_tenant_id_order_id_idx" ON "ShopPayment"("tenant_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPayment_tenant_id_provider_provider_ref_key" ON "ShopPayment"("tenant_id", "provider", "provider_ref");

-- CreateIndex
CREATE INDEX "MemberPlan_tenant_id_enabled_sort_order_idx" ON "MemberPlan"("tenant_id", "enabled", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "MemberPlan_tenant_id_slug_key" ON "MemberPlan"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "MemberSubscription_tenant_id_member_id_idx" ON "MemberSubscription"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "MemberSubscription_tenant_id_status_idx" ON "MemberSubscription"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSubscription_tenant_id_provider_provider_subscription_key" ON "MemberSubscription"("tenant_id", "provider", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "MemberPayment_tenant_id_member_id_idx" ON "MemberPayment"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "MemberPayment_tenant_id_created_at_idx" ON "MemberPayment"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "MemberPayment_tenant_id_provider_provider_order_id_key" ON "MemberPayment"("tenant_id", "provider", "provider_order_id");

-- CreateIndex
CREATE INDEX "SiteDocCategory_tenant_id_sort_order_idx" ON "SiteDocCategory"("tenant_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "SiteDocCategory_tenant_id_key_key" ON "SiteDocCategory"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "SiteDoc_tenant_id_idx" ON "SiteDoc"("tenant_id");

-- CreateIndex
CREATE INDEX "SiteDoc_tenant_id_status_idx" ON "SiteDoc"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "SiteDoc_tenant_id_category_sort_order_idx" ON "SiteDoc"("tenant_id", "category", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "SiteDoc_tenant_id_slug_locale_key" ON "SiteDoc"("tenant_id", "slug", "locale");

-- CreateIndex
CREATE INDEX "SiteFormSubmission_tenant_id_created_at_idx" ON "SiteFormSubmission"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "SiteFormSubmission_tenant_id_section_id_idx" ON "SiteFormSubmission"("tenant_id", "section_id");

-- CreateIndex
CREATE INDEX "SiteMember_tenant_id_idx" ON "SiteMember"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMember_tenant_id_email_key" ON "SiteMember"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMemberRefreshToken_token_key" ON "SiteMemberRefreshToken"("token");

-- CreateIndex
CREATE INDEX "SiteMemberRefreshToken_member_id_idx" ON "SiteMemberRefreshToken"("member_id");

-- CreateIndex
CREATE INDEX "SiteMemberOAuthAccount_member_id_idx" ON "SiteMemberOAuthAccount"("member_id");

-- CreateIndex
CREATE INDEX "SiteMemberOAuthAccount_tenant_id_idx" ON "SiteMemberOAuthAccount"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMemberOAuthAccount_tenant_id_provider_provider_user_id_key" ON "SiteMemberOAuthAccount"("tenant_id", "provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMemberOAuthExchangeCode_code_key" ON "SiteMemberOAuthExchangeCode"("code");

-- CreateIndex
CREATE INDEX "SiteMemberOAuthExchangeCode_member_id_idx" ON "SiteMemberOAuthExchangeCode"("member_id");

-- CreateIndex
CREATE INDEX "SiteMemberOAuthExchangeCode_tenant_id_idx" ON "SiteMemberOAuthExchangeCode"("tenant_id");

-- CreateIndex
CREATE INDEX "SiteMemberOAuthExchangeCode_expires_at_idx" ON "SiteMemberOAuthExchangeCode"("expires_at");

-- CreateIndex
CREATE INDEX "SlowQueryLog_created_at_idx" ON "SlowQueryLog"("created_at");

-- CreateIndex
CREATE INDEX "SlowQueryLog_duration_ms_idx" ON "SlowQueryLog"("duration_ms");

-- CreateIndex
CREATE INDEX "SlowQueryLog_fingerprint_idx" ON "SlowQueryLog"("fingerprint");

-- CreateIndex
CREATE INDEX "SlowQueryLog_tenant_slug_idx" ON "SlowQueryLog"("tenant_slug");

-- CreateIndex
CREATE INDEX "SlowQueryLog_route_idx" ON "SlowQueryLog"("route");

-- CreateIndex
CREATE INDEX "Todo_tenant_id_idx" ON "Todo"("tenant_id");

-- CreateIndex
CREATE INDEX "Todo_tenant_id_completed_updated_at_idx" ON "Todo"("tenant_id", "completed", "updated_at");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardPreference" ADD CONSTRAINT "DashboardPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSignal" ADD CONSTRAINT "EventSignal_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTimelineEntry" ADD CONSTRAINT "EventTimelineEntry_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFollow" ADD CONSTRAINT "EventFollow_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "NewsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSetting" ADD CONSTRAINT "TenantSetting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAdminRole" ADD CONSTRAINT "PlatformAdminRole_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAdminRole" ADD CONSTRAINT "PlatformAdminRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAdminRefreshToken" ADD CONSTRAINT "PlatformAdminRefreshToken_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCollection" ADD CONSTRAINT "ShopCollection_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ShopCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCollectionProduct" ADD CONSTRAINT "ShopCollectionProduct_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "ShopCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCollectionProduct" ADD CONSTRAINT "ShopCollectionProduct_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopVariant" ADD CONSTRAINT "ShopVariant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "ShopCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ShopVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShippingRate" ADD CONSTRAINT "ShopShippingRate_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "ShopShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderLine" ADD CONSTRAINT "ShopOrderLine_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShipment" ADD CONSTRAINT "ShopShipment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPayment" ADD CONSTRAINT "ShopPayment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMemberRefreshToken" ADD CONSTRAINT "SiteMemberRefreshToken_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMemberOAuthAccount" ADD CONSTRAINT "SiteMemberOAuthAccount_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMemberOAuthExchangeCode" ADD CONSTRAINT "SiteMemberOAuthExchangeCode_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

