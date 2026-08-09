-- 导航条目已内嵌到页头 / 页脚 chrome（settings.items），不再要独立菜单表。
-- 不迁移旧 menus_*：产品明确不保兼容；存量站点需在编辑器里重配导航。

ALTER TABLE "MarketingSite"
  DROP COLUMN IF EXISTS "menus_json",
  DROP COLUMN IF EXISTS "menus_draft_json";
