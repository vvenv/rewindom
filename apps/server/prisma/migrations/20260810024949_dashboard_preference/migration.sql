-- CreateTable
CREATE TABLE "DashboardPreference" (
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hidden_widgets" TEXT[],
    "widget_order" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("tenant_id","user_id")
);

-- AddForeignKey
ALTER TABLE "DashboardPreference" ADD CONSTRAINT "DashboardPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
