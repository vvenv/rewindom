-- 页头 / 页脚拆成「草稿」与「已发布」两套存储。
-- Theme Editor 保存只写草稿列；公开面与已发布预览读 nav_json / footer_json。
-- 存量站点先把当前线上 chrome 复制到草稿列，避免升级后编辑器空白。

ALTER TABLE "MarketingSite"
  ADD COLUMN "nav_draft_json" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "footer_draft_json" JSONB NOT NULL DEFAULT '[]';

UPDATE "MarketingSite"
SET
  nav_draft_json = nav_json,
  footer_draft_json = footer_json;
