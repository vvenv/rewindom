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

-- CreateIndex
CREATE INDEX "SiteMember_tenant_id_idx" ON "SiteMember"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMember_tenant_id_email_key" ON "SiteMember"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMemberRefreshToken_token_key" ON "SiteMemberRefreshToken"("token");

-- CreateIndex
CREATE INDEX "SiteMemberRefreshToken_member_id_idx" ON "SiteMemberRefreshToken"("member_id");

-- AddForeignKey
ALTER TABLE "SiteMemberRefreshToken" ADD CONSTRAINT "SiteMemberRefreshToken_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "SiteMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
