-- Catch-up for DBs that baseline-marked init without actually creating these tables
-- (entrypoint baseline when User already existed). Idempotent: safe on fresh + drifted DBs.

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."MarketingFormSubmission" (
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
CREATE TABLE IF NOT EXISTS "public"."MarketingRedirect" (
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
CREATE TABLE IF NOT EXISTS "public"."MarketingAsset" (
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
CREATE TABLE IF NOT EXISTS "public"."MarketingPageVersion" (
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
CREATE TABLE IF NOT EXISTS "public"."SiteMemberOAuthAccount" (
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
CREATE TABLE IF NOT EXISTS "public"."SiteMemberOAuthExchangeCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMemberOAuthExchangeCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingFormSubmission_tenant_id_created_at_idx" ON "public"."MarketingFormSubmission"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "MarketingFormSubmission_tenant_id_section_id_idx" ON "public"."MarketingFormSubmission"("tenant_id", "section_id");
CREATE INDEX IF NOT EXISTS "MarketingRedirect_tenant_id_idx" ON "public"."MarketingRedirect"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingRedirect_tenant_id_from_path_key" ON "public"."MarketingRedirect"("tenant_id", "from_path");
CREATE INDEX IF NOT EXISTS "MarketingAsset_tenant_id_created_at_idx" ON "public"."MarketingAsset"("tenant_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingAsset_tenant_id_filename_key" ON "public"."MarketingAsset"("tenant_id", "filename");
CREATE INDEX IF NOT EXISTS "MarketingPageVersion_tenant_id_page_id_created_at_idx" ON "public"."MarketingPageVersion"("tenant_id", "page_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingPageVersion_tenant_id_page_id_version_key" ON "public"."MarketingPageVersion"("tenant_id", "page_id", "version");
CREATE INDEX IF NOT EXISTS "SiteMemberOAuthAccount_member_id_idx" ON "public"."SiteMemberOAuthAccount"("member_id");
CREATE INDEX IF NOT EXISTS "SiteMemberOAuthAccount_tenant_id_idx" ON "public"."SiteMemberOAuthAccount"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteMemberOAuthAccount_tenant_id_provider_provider_user_id_key" ON "public"."SiteMemberOAuthAccount"("tenant_id", "provider", "provider_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteMemberOAuthExchangeCode_code_key" ON "public"."SiteMemberOAuthExchangeCode"("code");
CREATE INDEX IF NOT EXISTS "SiteMemberOAuthExchangeCode_member_id_idx" ON "public"."SiteMemberOAuthExchangeCode"("member_id");
CREATE INDEX IF NOT EXISTS "SiteMemberOAuthExchangeCode_tenant_id_idx" ON "public"."SiteMemberOAuthExchangeCode"("tenant_id");
CREATE INDEX IF NOT EXISTS "SiteMemberOAuthExchangeCode_expires_at_idx" ON "public"."SiteMemberOAuthExchangeCode"("expires_at");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SiteMemberOAuthAccount_member_id_fkey'
  ) THEN
    ALTER TABLE "public"."SiteMemberOAuthAccount"
      ADD CONSTRAINT "SiteMemberOAuthAccount_member_id_fkey"
      FOREIGN KEY ("member_id") REFERENCES "public"."SiteMember"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SiteMemberOAuthExchangeCode_member_id_fkey'
  ) THEN
    ALTER TABLE "public"."SiteMemberOAuthExchangeCode"
      ADD CONSTRAINT "SiteMemberOAuthExchangeCode_member_id_fkey"
      FOREIGN KEY ("member_id") REFERENCES "public"."SiteMember"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ErrorLog: baseline DBs may still have TEXT columns; convert to JSONB without DROP
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ErrorLog'
      AND column_name = 'request_body' AND data_type = 'text'
  ) THEN
    ALTER TABLE "public"."ErrorLog"
      ALTER COLUMN "request_body" TYPE JSONB USING CASE
        WHEN "request_body" IS NULL THEN NULL
        WHEN pg_input_is_valid("request_body", 'jsonb') THEN "request_body"::jsonb
        ELSE to_jsonb("request_body")
      END,
      ALTER COLUMN "request_params" TYPE JSONB USING CASE
        WHEN "request_params" IS NULL THEN NULL
        WHEN pg_input_is_valid("request_params", 'jsonb') THEN "request_params"::jsonb
        ELSE to_jsonb("request_params")
      END,
      ALTER COLUMN "request_query" TYPE JSONB USING CASE
        WHEN "request_query" IS NULL THEN NULL
        WHEN pg_input_is_valid("request_query", 'jsonb') THEN "request_query"::jsonb
        ELSE to_jsonb("request_query")
      END,
      ALTER COLUMN "context" TYPE JSONB USING CASE
        WHEN "context" IS NULL THEN NULL
        WHEN pg_input_is_valid("context", 'jsonb') THEN "context"::jsonb
        ELSE to_jsonb("context")
      END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ErrorLog_request_body_idx" ON "public"."ErrorLog" USING GIN ("request_body" jsonb_path_ops);
