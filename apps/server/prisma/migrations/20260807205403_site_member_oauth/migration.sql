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

-- AddForeignKey
ALTER TABLE "SiteMemberOAuthAccount" ADD CONSTRAINT "SiteMemberOAuthAccount_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMemberOAuthExchangeCode" ADD CONSTRAINT "SiteMemberOAuthExchangeCode_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
