-- 页面正文拆成「草稿」与「已发布」两套存储。
-- Theme Editor 保存只写草稿列；公开面读 title / description / sections。
-- 存量页面先把当前线上内容复制到草稿列，避免升级后编辑器空白。

ALTER TABLE "MarketingPage"
  ADD COLUMN "title_draft" TEXT,
  ADD COLUMN "description_draft" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "sections_draft" JSONB NOT NULL DEFAULT '[]';

UPDATE "MarketingPage"
SET
  title_draft = title,
  description_draft = description,
  sections_draft = sections;

ALTER TABLE "MarketingPage"
  ALTER COLUMN "title_draft" SET NOT NULL;
