-- events：标题/摘要/时间线文案改为数据多语言（扁平 locale map，见 docs/design/i18n.md）。
--
-- title / summary 两列保留为**原文**：聚类指纹与 slug 都基于它们，不能被译文覆盖。
-- origin_locale 默认 en —— 一期数据源全是英文站，存量行按 en 回填正确。


-- AlterTable
ALTER TABLE "EventTimelineEntry" ADD COLUMN     "label_text_i18n" JSONB;

-- AlterTable
ALTER TABLE "NewsEvent" ADD COLUMN     "origin_locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "summary_i18n" JSONB,
ADD COLUMN     "title_i18n" JSONB;

