-- AlterTable: MarketingPage settings（页面级布局开关，先只有 page_nav）
ALTER TABLE "MarketingPage" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
