-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- pgvector extension (not captured by migrate diff)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionItemStatus') THEN
        CREATE TYPE "public"."ActionItemStatus" AS ENUM ('PENDING', 'COMPLETED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnalysisStatus') THEN
        CREATE TYPE "public"."AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CandidateStage') THEN
        CREATE TYPE "public"."CandidateStage" AS ENUM ('DISCOVERED', 'FETCHED', 'EXTRACTED', 'NORMALIZED', 'VALIDATED', 'AUTO_APPROVED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EMBEDDED', 'PUBLISHED', 'FAILED', 'UNCHANGED', 'DISMISSED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatMessageRole') THEN
        CREATE TYPE "public"."ChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceTaskPriority') THEN
        CREATE TYPE "public"."ComplianceTaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceTaskStatus') THEN
        CREATE TYPE "public"."ComplianceTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentScope') THEN
        CREATE TYPE "public"."DocumentScope" AS ENUM ('PLATFORM', 'TENANT');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
        CREATE TYPE "public"."DocumentType" AS ENUM ('REGULATION', 'DIRECTIVE', 'STANDARD', 'GUIDANCE', 'FAQ', 'PRODUCT_SPEC', 'BOM', 'TEST_REPORT', 'CERTIFICATE', 'INTERNAL_SOP');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EvidenceDocType') THEN
        CREATE TYPE "public"."EvidenceDocType" AS ENUM ('CERTIFICATE', 'TEST_REPORT', 'MATERIAL_DECLARATION', 'SHIPPING', 'OTHER');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EvidenceLinkSource') THEN
        CREATE TYPE "public"."EvidenceLinkSource" AS ENUM ('MANUAL', 'AUTO_RULE', 'AUTO_AI');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EvidencePackStatus') THEN
        CREATE TYPE "public"."EvidencePackStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'MISSING');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HarvestAdapter') THEN
        CREATE TYPE "public"."HarvestAdapter" AS ENUM ('HTML', 'RSS', 'API', 'SITEMAP', 'PDF', 'MANUAL');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HarvestHealth') THEN
        CREATE TYPE "public"."HarvestHealth" AS ENUM ('HEALTHY', 'DEGRADED', 'FAILING', 'DISABLED', 'UNKNOWN');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HarvestItemStatus') THEN
        CREATE TYPE "public"."HarvestItemStatus" AS ENUM ('UNCHANGED', 'CHANGED', 'NEW', 'SKIPPED', 'FAILED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HarvestRunStatus') THEN
        CREATE TYPE "public"."HarvestRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'CANCELLED');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegulationSignalType') THEN
        CREATE TYPE "public"."RegulationSignalType" AS ENUM ('PRESS_RELEASE', 'DRAFT', 'ENACTED', 'RECALL', 'ENFORCEMENT', 'GUIDANCE');
    END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceTrust') THEN
        CREATE TYPE "public"."SourceTrust" AS ENUM ('OFFICIAL', 'THIRD_PARTY');
    END IF;
END $$;

-- CreateTable
CREATE TABLE "public"."Analysis" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "target_markets" TEXT[],
    "status" "public"."AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "risk_summary" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "target_market" TEXT NOT NULL,
    "overall_risk" "public"."ComplianceTaskPriority",

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "public"."ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Citation" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_id" TEXT,
    "section_number" TEXT,
    "article_ref" TEXT,
    "original_text" TEXT NOT NULL,
    "relevance" TEXT,
    "context_before" TEXT,
    "context_after" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary_zh" TEXT,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceTask" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "source_alert_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."ComplianceTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."ComplianceTaskPriority" NOT NULL,
    "due_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceTaskActionItem" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priority" "public"."ComplianceTaskPriority" NOT NULL,
    "regulation_ref" TEXT,
    "status" "public"."ActionItemStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTaskActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceTaskEvidenceLink" (
    "task_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "link_source" "public"."EvidenceLinkSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DOUBLE PRECISION,
    "linked_by" TEXT,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceTaskEvidenceLink_pkey" PRIMARY KEY ("task_id","pack_id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "pinned_at" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "title" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "type" "public"."DocumentType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "published_at" TIMESTAMP(3),
    "source_url" TEXT,
    "version" TEXT,
    "effective_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "content" TEXT,
    "storage_key" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "scope" "public"."DocumentScope" NOT NULL DEFAULT 'TENANT',
    "product_id" TEXT,
    "superseded_by_id" TEXT,
    "language" TEXT DEFAULT 'zh',
    "target_markets" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentChunk" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "section_id" TEXT,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "token_count" INTEGER NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_vector" tsvector,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentSection" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "number" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "translation_engine" TEXT,
    "source_title" TEXT,
    "source_content" TEXT,

    CONSTRAINT "DocumentSection_pkey" PRIMARY KEY ("id")
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
    "request_body" TEXT,
    "request_params" TEXT,
    "request_query" TEXT,
    "error_code" TEXT,
    "context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EvidencePack" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "compliance_item" TEXT NOT NULL,
    "status" "public"."EvidencePackStatus" NOT NULL DEFAULT 'MISSING',
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "owner_user_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidencePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EvidencePackItem" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "doc_type" "public"."EvidenceDocType" NOT NULL,
    "title" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "document_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "EvidencePackItem_pkey" PRIMARY KEY ("id")
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
    "seller_id" TEXT,
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
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "attributes" JSONB NOT NULL,
    "document_urls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "main_image_url" TEXT,
    "category_en" TEXT,
    "name_en" TEXT,
    "poster_image_url" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductMarketCompliance" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "target_market" TEXT NOT NULL,
    "current_analysis_id" TEXT NOT NULL,
    "version_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMarketCompliance_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."RegulationCandidate" (
    "id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "run_id" TEXT,
    "snapshot_id" TEXT,
    "stage" "public"."CandidateStage" NOT NULL DEFAULT 'DISCOVERED',
    "signal_type" "public"."RegulationSignalType" NOT NULL DEFAULT 'ENACTED',
    "document_id" TEXT,
    "title" TEXT,
    "country" TEXT,
    "region" TEXT,
    "normalized_content" TEXT,
    "sections_json" JSONB,
    "metadata_json" JSONB,
    "change_ratio" DOUBLE PRECISION,
    "quality_report" JSONB,
    "review_note" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "content_storage_key" TEXT,
    "sections_storage_key" TEXT,

    CONSTRAINT "RegulationCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegulationHarvestItem" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "status" "public"."HarvestItemStatus" NOT NULL,
    "signal_type" "public"."RegulationSignalType",
    "change_ratio" DOUBLE PRECISION,
    "candidate_id" TEXT,
    "document_id" TEXT,
    "title" TEXT,
    "url" TEXT,
    "http_status" INTEGER,
    "duration_ms" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulationHarvestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegulationHarvestRun" (
    "id" TEXT NOT NULL,
    "source_id" TEXT,
    "trigger" TEXT NOT NULL,
    "triggered_by" TEXT,
    "status" "public"."HarvestRunStatus" NOT NULL DEFAULT 'RUNNING',
    "endpoints_total" INTEGER NOT NULL DEFAULT 0,
    "endpoints_changed" INTEGER NOT NULL DEFAULT 0,
    "endpoints_failed" INTEGER NOT NULL DEFAULT 0,
    "candidates_pending" INTEGER NOT NULL DEFAULT 0,
    "versions_published" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "error" TEXT,

    CONSTRAINT "RegulationHarvestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegulationSnapshot" (
    "id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "url" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "http_status" INTEGER,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegulationSource" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "authority" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topics" TEXT[],
    "homepage" TEXT,
    "trust" "public"."SourceTrust" NOT NULL DEFAULT 'OFFICIAL',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "license" TEXT,
    "auth_config_enc" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "health" "public"."HarvestHealth" NOT NULL DEFAULT 'UNKNOWN',
    "last_run_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "failure_streak" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RegulationSourceEndpoint" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "adapter" "public"."HarvestAdapter" NOT NULL,
    "config" JSONB,
    "schedule_cron" TEXT,
    "document_id" TEXT,
    "auto_publish" BOOLEAN NOT NULL DEFAULT false,
    "diff_auto_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "health" "public"."HarvestHealth" NOT NULL DEFAULT 'UNKNOWN',
    "last_run_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_content_hash" TEXT,
    "failure_streak" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "execution_region" TEXT,

    CONSTRAINT "RegulationSourceEndpoint_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "Analysis_created_at_idx" ON "public"."Analysis"("created_at" ASC);

-- CreateIndex
CREATE INDEX "Analysis_status_idx" ON "public"."Analysis"("status" ASC);

-- CreateIndex
CREATE INDEX "Analysis_tenant_id_product_id_target_market_idx" ON "public"."Analysis"("tenant_id" ASC, "product_id" ASC, "target_market" ASC);

-- CreateIndex
CREATE INDEX "Analysis_tenant_id_user_id_idx" ON "public"."Analysis"("tenant_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "Analysis_tenant_id_user_id_status_overall_risk_idx" ON "public"."Analysis"("tenant_id" ASC, "user_id" ASC, "status" ASC, "overall_risk" ASC);

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
CREATE INDEX "ChatMessage_conversation_id_created_at_idx" ON "public"."ChatMessage"("conversation_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "Citation_analysis_id_idx" ON "public"."Citation"("analysis_id" ASC);

-- CreateIndex
CREATE INDEX "Citation_document_id_idx" ON "public"."Citation"("document_id" ASC);

-- CreateIndex
CREATE INDEX "ComplianceTask_analysis_id_idx" ON "public"."ComplianceTask"("analysis_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceTask_analysis_id_key" ON "public"."ComplianceTask"("analysis_id" ASC);

-- CreateIndex
CREATE INDEX "ComplianceTask_product_id_idx" ON "public"."ComplianceTask"("product_id" ASC);

-- CreateIndex
CREATE INDEX "ComplianceTask_tenant_id_status_due_at_idx" ON "public"."ComplianceTask"("tenant_id" ASC, "status" ASC, "due_at" ASC);

-- CreateIndex
CREATE INDEX "ComplianceTask_tenant_id_user_id_status_idx" ON "public"."ComplianceTask"("tenant_id" ASC, "user_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "ComplianceTaskActionItem_task_id_idx" ON "public"."ComplianceTaskActionItem"("task_id" ASC);

-- CreateIndex
CREATE INDEX "ComplianceTaskActionItem_task_id_status_idx" ON "public"."ComplianceTaskActionItem"("task_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "ComplianceTaskEvidenceLink_pack_id_idx" ON "public"."ComplianceTaskEvidenceLink"("pack_id" ASC);

-- CreateIndex
CREATE INDEX "Conversation_tenant_id_user_id_updated_at_idx" ON "public"."Conversation"("tenant_id" ASC, "user_id" ASC, "updated_at" DESC);

-- CreateIndex
CREATE INDEX "Document_product_id_idx" ON "public"."Document"("product_id" ASC);

-- CreateIndex
CREATE INDEX "Document_scope_country_type_idx" ON "public"."Document"("scope" ASC, "country" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "Document_scope_tenant_id_status_idx" ON "public"."Document"("scope" ASC, "tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Document_superseded_by_id_idx" ON "public"."Document"("superseded_by_id" ASC);

-- CreateIndex
CREATE INDEX "Document_tenant_id_country_type_idx" ON "public"."Document"("tenant_id" ASC, "country" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "Document_tenant_id_status_idx" ON "public"."Document"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "DocumentChunk_document_id_idx" ON "public"."DocumentChunk"("document_id" ASC);

-- CreateIndex
CREATE INDEX "DocumentChunk_search_vector_idx" ON "public"."DocumentChunk" USING GIN ("search_vector" tsvector_ops ASC);

-- CreateIndex
CREATE INDEX "DocumentChunk_section_id_idx" ON "public"."DocumentChunk"("section_id" ASC);

-- CreateIndex
CREATE INDEX "idx_document_chunk_embedding_ivfflat" ON "public"."DocumentChunk"("embedding" ASC);

-- CreateIndex
CREATE INDEX "DocumentSection_document_id_idx" ON "public"."DocumentSection"("document_id" ASC);

-- CreateIndex
CREATE INDEX "DocumentSection_parent_id_idx" ON "public"."DocumentSection"("parent_id" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_created_at_idx" ON "public"."ErrorLog"("created_at" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_error_code_idx" ON "public"."ErrorLog"("error_code" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_level_idx" ON "public"."ErrorLog"("level" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_tenant_slug_idx" ON "public"."ErrorLog"("tenant_slug" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_user_id_idx" ON "public"."ErrorLog"("user_id" ASC);

-- CreateIndex
CREATE INDEX "EvidencePack_product_id_idx" ON "public"."EvidencePack"("product_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EvidencePack_tenant_id_product_id_market_compliance_item_key" ON "public"."EvidencePack"("tenant_id" ASC, "product_id" ASC, "market" ASC, "compliance_item" ASC);

-- CreateIndex
CREATE INDEX "EvidencePack_tenant_id_status_idx" ON "public"."EvidencePack"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "EvidencePackItem_pack_id_idx" ON "public"."EvidencePackItem"("pack_id" ASC);

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
CREATE UNIQUE INDEX "ProductMarketCompliance_current_analysis_id_key" ON "public"."ProductMarketCompliance"("current_analysis_id" ASC);

-- CreateIndex
CREATE INDEX "ProductMarketCompliance_product_id_idx" ON "public"."ProductMarketCompliance"("product_id" ASC);

-- CreateIndex
CREATE INDEX "ProductMarketCompliance_tenant_id_user_id_idx" ON "public"."ProductMarketCompliance"("tenant_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductMarketCompliance_tenant_id_user_id_product_id_target_mar" ON "public"."ProductMarketCompliance"("tenant_id" ASC, "user_id" ASC, "product_id" ASC, "target_market" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "public"."RefreshToken"("token" ASC);

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "public"."RefreshToken"("user_id" ASC);

-- CreateIndex
CREATE INDEX "RegulationCandidate_document_id_idx" ON "public"."RegulationCandidate"("document_id" ASC);

-- CreateIndex
CREATE INDEX "RegulationCandidate_endpoint_id_idx" ON "public"."RegulationCandidate"("endpoint_id" ASC);

-- CreateIndex
CREATE INDEX "RegulationCandidate_run_id_idx" ON "public"."RegulationCandidate"("run_id" ASC);

-- CreateIndex
CREATE INDEX "RegulationCandidate_stage_created_at_idx" ON "public"."RegulationCandidate"("stage" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "RegulationHarvestItem_endpoint_id_created_at_idx" ON "public"."RegulationHarvestItem"("endpoint_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "RegulationHarvestItem_run_id_idx" ON "public"."RegulationHarvestItem"("run_id" ASC);

-- CreateIndex
CREATE INDEX "RegulationHarvestItem_status_idx" ON "public"."RegulationHarvestItem"("status" ASC);

-- CreateIndex
CREATE INDEX "RegulationHarvestRun_source_id_started_at_idx" ON "public"."RegulationHarvestRun"("source_id" ASC, "started_at" DESC);

-- CreateIndex
CREATE INDEX "RegulationHarvestRun_status_started_at_idx" ON "public"."RegulationHarvestRun"("status" ASC, "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RegulationSnapshot_content_hash_key" ON "public"."RegulationSnapshot"("content_hash" ASC);

-- CreateIndex
CREATE INDEX "RegulationSnapshot_endpoint_id_fetched_at_idx" ON "public"."RegulationSnapshot"("endpoint_id" ASC, "fetched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RegulationSource_country_authority_key" ON "public"."RegulationSource"("country" ASC, "authority" ASC);

-- CreateIndex
CREATE INDEX "RegulationSource_country_region_enabled_idx" ON "public"."RegulationSource"("country" ASC, "region" ASC, "enabled" ASC);

-- CreateIndex
CREATE INDEX "RegulationSource_health_idx" ON "public"."RegulationSource"("health" ASC);

-- CreateIndex
CREATE INDEX "RegulationSourceEndpoint_adapter_idx" ON "public"."RegulationSourceEndpoint"("adapter" ASC);

-- CreateIndex
CREATE INDEX "RegulationSourceEndpoint_document_id_idx" ON "public"."RegulationSourceEndpoint"("document_id" ASC);

-- CreateIndex
CREATE INDEX "RegulationSourceEndpoint_execution_region_enabled_idx" ON "public"."RegulationSourceEndpoint"("execution_region" ASC, "enabled" ASC);

-- CreateIndex
CREATE INDEX "RegulationSourceEndpoint_source_id_enabled_idx" ON "public"."RegulationSourceEndpoint"("source_id" ASC, "enabled" ASC);

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
CREATE INDEX "User_tenant_id_idx" ON "public"."User"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_tenant_id_username_key" ON "public"."User"("tenant_id" ASC, "username" ASC);

-- CreateIndex
CREATE INDEX "UserRole_role_id_idx" ON "public"."UserRole"("role_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."Analysis" ADD CONSTRAINT "Analysis_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Analysis" ADD CONSTRAINT "Analysis_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Analysis" ADD CONSTRAINT "Analysis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackgroundJob" ADD CONSTRAINT "BackgroundJob_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Citation" ADD CONSTRAINT "Citation_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Citation" ADD CONSTRAINT "Citation_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceTask" ADD CONSTRAINT "ComplianceTask_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceTask" ADD CONSTRAINT "ComplianceTask_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceTask" ADD CONSTRAINT "ComplianceTask_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceTask" ADD CONSTRAINT "ComplianceTask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceTaskActionItem" ADD CONSTRAINT "ComplianceTaskActionItem_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."ComplianceTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ComplianceTaskEvidenceLink" ADD CONSTRAINT "ComplianceTaskEvidenceLink_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."EvidencePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceTaskEvidenceLink" ADD CONSTRAINT "ComplianceTaskEvidenceLink_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."ComplianceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentChunk" ADD CONSTRAINT "DocumentChunk_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentSection" ADD CONSTRAINT "DocumentSection_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvidencePack" ADD CONSTRAINT "EvidencePack_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvidencePack" ADD CONSTRAINT "EvidencePack_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvidencePackItem" ADD CONSTRAINT "EvidencePackItem_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."EvidencePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAdminRefreshToken" ADD CONSTRAINT "PlatformAdminRefreshToken_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAdminRole" ADD CONSTRAINT "PlatformAdminRole_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformAdminRole" ADD CONSTRAINT "PlatformAdminRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductMarketCompliance" ADD CONSTRAINT "ProductMarketCompliance_current_analysis_id_fkey" FOREIGN KEY ("current_analysis_id") REFERENCES "public"."Analysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductMarketCompliance" ADD CONSTRAINT "ProductMarketCompliance_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductMarketCompliance" ADD CONSTRAINT "ProductMarketCompliance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductMarketCompliance" ADD CONSTRAINT "ProductMarketCompliance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationCandidate" ADD CONSTRAINT "RegulationCandidate_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationCandidate" ADD CONSTRAINT "RegulationCandidate_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "public"."RegulationSourceEndpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationCandidate" ADD CONSTRAINT "RegulationCandidate_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."RegulationHarvestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationCandidate" ADD CONSTRAINT "RegulationCandidate_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "public"."RegulationSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationHarvestItem" ADD CONSTRAINT "RegulationHarvestItem_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "public"."RegulationSourceEndpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationHarvestItem" ADD CONSTRAINT "RegulationHarvestItem_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."RegulationHarvestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationHarvestRun" ADD CONSTRAINT "RegulationHarvestRun_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."RegulationSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationSourceEndpoint" ADD CONSTRAINT "RegulationSourceEndpoint_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RegulationSourceEndpoint" ADD CONSTRAINT "RegulationSourceEndpoint_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."RegulationSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

