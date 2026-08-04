-- 语言切换器开关：从页头 section 提升为**站点级**主题设置。
--
-- 原来存在 `nav_json.settings.show_locale_switcher`（页头 section 的一个 checkbox），
-- 现在是 `theme_settings.show_locale_switcher`（站点设置里的全局开关）。
-- 不回填的话，已经打开过这个开关的租户升级后语言切换器会静默消失。
-- theme_settings 已有该键时不覆盖——它才是真相源。

UPDATE "MarketingSite"
SET "theme_settings" =
  "theme_settings" || jsonb_build_object('show_locale_switcher', true)
WHERE NOT ("theme_settings" ? 'show_locale_switcher')
  AND jsonb_typeof("nav_json") = 'object'
  AND ("nav_json" -> 'settings' ->> 'show_locale_switcher') = 'true';

-- 页头 section 里的残留键清掉：schema 已经不认它了（读路径会丢弃），
-- 留在 JSON 里只会让人以为那边还有一个同名设置。
UPDATE "MarketingSite"
SET "nav_json" = jsonb_set(
  "nav_json",
  '{settings}',
  ("nav_json" -> 'settings') - 'show_locale_switcher'
)
WHERE jsonb_typeof("nav_json") = 'object'
  AND jsonb_typeof("nav_json" -> 'settings') = 'object'
  AND ("nav_json" -> 'settings') ? 'show_locale_switcher';
