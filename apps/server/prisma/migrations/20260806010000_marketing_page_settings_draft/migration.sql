-- MarketingPage.settings 补上草稿列。
--
-- 页面设置原先只有一列：编辑器一保存就直接改到访客看到的那份，既绕过了「发布」
-- 这一步，也让 `content_dirty` 与撤销都盖不住它。现在与 title / description /
-- sections 同构——保存进 `_draft`，发布时提升，撤销时从线上回灌。
--
-- 存量行的现状等价于「草稿已发布」：两列同值即可，`content_dirty` 不会因此翻脸。

ALTER TABLE "MarketingPage"
  ADD COLUMN "settings_draft" JSONB NOT NULL DEFAULT '{}';

UPDATE "MarketingPage" SET "settings_draft" = "settings";
