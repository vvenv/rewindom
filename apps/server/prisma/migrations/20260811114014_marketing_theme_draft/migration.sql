-- AlterTable
ALTER TABLE "MarketingSite" ADD COLUMN     "theme_settings_draft" JSONB NOT NULL DEFAULT '{}';

-- 存量站点的草稿从线上灌一份：不回填的话编辑器一打开是空主题，
-- 存一次就把租户配好的配色清了。
UPDATE "MarketingSite" SET "theme_settings_draft" = "theme_settings";
