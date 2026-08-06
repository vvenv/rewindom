-- 语言切换器开关搬回页头 section。
--
-- 20260804030000 把它从页头提到了站点设置（`theme_settings.show_locale_switcher`），
-- 理由是「这个站是不是多语言站」属于站点表态。但页头现在有一整排同类开关
--（站点导航 / 语言 / 明暗 / 账户入口），它们回答的都是同一个问题：这枚按钮露不露。
-- 分在两处配，租户得跑两个地方才能排好页头右侧那一行。
--
-- 不回填就等于把已经打开过的租户静默关掉，所以逐行搬过去。
-- 注意 `nav_json` / `nav_draft_json` 现在是 section **数组**（20260805020000 起），
-- 不再是当年那个单对象——要挑出 `type = 'header'` 的那一段写进去。

CREATE OR REPLACE FUNCTION pg_temp.set_header_locale_switcher(sections jsonb)
RETURNS jsonb AS $$
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'type' = 'header'
       AND jsonb_typeof(elem->'settings') = 'object'
      THEN jsonb_set(elem, '{settings,show_locale_switcher}', 'true'::jsonb)
      ELSE elem
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(sections) WITH ORDINALITY AS t(elem, ord);
$$ LANGUAGE sql;

UPDATE "MarketingSite"
SET
  "nav_json" =
    CASE WHEN jsonb_typeof("nav_json") = 'array' AND "nav_json" <> '[]'::jsonb
      THEN pg_temp.set_header_locale_switcher("nav_json")
      ELSE "nav_json" END,
  "nav_draft_json" =
    CASE WHEN jsonb_typeof("nav_draft_json") = 'array' AND "nav_draft_json" <> '[]'::jsonb
      THEN pg_temp.set_header_locale_switcher("nav_draft_json")
      ELSE "nav_draft_json" END
WHERE ("theme_settings" ->> 'show_locale_switcher') = 'true';

-- theme_settings 里的残留键清掉：schema 已经不认它，留着只会让人以为那边还有一个同名设置。
UPDATE "MarketingSite"
SET "theme_settings" = "theme_settings" - 'show_locale_switcher'
WHERE "theme_settings" ? 'show_locale_switcher';
