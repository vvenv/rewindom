-- 站点导航菜单：把散在页头 / 页脚里的链接收进一份可复用的菜单表。
--
-- 存量数据必须搬过来——租户配了半年的导航不能因为换了个数据模型就清空。搬运规则：
--   * 页头 `show_site_nav` 开着     → main 菜单的一条 `pages` 动态项（等价语义）
--   * 页头 `nav_link` 块            → main 菜单的静态项，顺序不变（自动项在前，同旧渲染）
--   * 页脚 `footer_link` 块按 group → 每组一个 `footer-N` 菜单，页脚改挂 `menu_column` 块
-- 草稿列与线上列各搬一次，互不干扰：两边的分组本来就可能不一样。

-- AlterTable
ALTER TABLE "MarketingSite"
  ADD COLUMN "menus_json" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "menus_draft_json" JSONB NOT NULL DEFAULT '[]';

CREATE FUNCTION marketing_migrate_chrome_menus(nav jsonb, footer jsonb)
RETURNS jsonb
LANGUAGE plpgsql AS $fn$
DECLARE
  menus       jsonb := '[]'::jsonb;
  main_items  jsonb := '[]'::jsonb;
  new_nav     jsonb := '[]'::jsonb;
  new_footer  jsonb := '[]'::jsonb;
  groups      jsonb := '{}'::jsonb;
  group_order text[] := ARRAY[]::text[];
  col_blocks  jsonb := '[]'::jsonb;
  sec         jsonb;
  blk         jsonb;
  grp         text;
  menu_key    text;
  idx         int := 0;
BEGIN
  IF jsonb_typeof(nav) = 'array' THEN
    FOR sec IN SELECT * FROM jsonb_array_elements(nav) LOOP
      IF sec->>'type' = 'header' THEN
        -- 缺字段按 true：`show_site_nav` 的默认值就是开着的
        IF COALESCE((sec->'settings'->>'show_site_nav')::boolean, true) THEN
          main_items := main_items || jsonb_build_array(jsonb_build_object(
            'id', gen_random_uuid()::text,
            'source', 'pages',
            'label', '',
            'href', '',
            'category', '',
            'expand', 'flat',
            'children', '[]'::jsonb));
        END IF;

        FOR blk IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'blocks', '[]'::jsonb)) LOOP
          IF blk->>'type' = 'nav_link' THEN
            main_items := main_items || jsonb_build_array(jsonb_build_object(
              'id', COALESCE(blk->>'id', gen_random_uuid()::text),
              'source', 'link',
              -- label 可能是多语言表；整个 jsonb 值原样搬，别压成字符串
              'label', COALESCE(blk->'settings'->'label', '""'::jsonb),
              'href', COALESCE(blk->'settings'->>'href', ''),
              'category', '',
              'expand', 'children',
              'children', '[]'::jsonb));
          END IF;
        END LOOP;

        sec := jsonb_set(sec, '{settings,menu}', '"main"'::jsonb);
        sec := sec #- '{settings,show_site_nav}';
        sec := jsonb_set(sec, '{blocks}', '[]'::jsonb);
      END IF;
      new_nav := new_nav || jsonb_build_array(sec);
    END LOOP;
  END IF;

  IF jsonb_typeof(footer) = 'array' THEN
    FOR sec IN SELECT * FROM jsonb_array_elements(footer) LOOP
      IF sec->>'type' = 'footer' THEN
        FOR blk IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'blocks', '[]'::jsonb)) LOOP
          IF blk->>'type' = 'footer_link' THEN
            grp := COALESCE(btrim(blk->'settings'->>'group'), '');
            IF NOT jsonb_exists(groups, grp) THEN
              groups := jsonb_set(groups, ARRAY[grp], '[]'::jsonb);
              group_order := group_order || grp;
            END IF;
            groups := jsonb_set(groups, ARRAY[grp],
              (groups->grp) || jsonb_build_array(jsonb_build_object(
                'id', COALESCE(blk->>'id', gen_random_uuid()::text),
                'source', 'link',
                'label', COALESCE(blk->'settings'->'label', '""'::jsonb),
                'href', COALESCE(blk->'settings'->>'href', ''),
                'category', '',
                'expand', 'children',
                'children', '[]'::jsonb)));
          END IF;
        END LOOP;

        FOREACH grp IN ARRAY group_order LOOP
          idx := idx + 1;
          menu_key := 'footer-' || idx;
          menus := menus || jsonb_build_array(jsonb_build_object(
            'key', menu_key,
            'title', grp,
            'items', groups->grp));
          col_blocks := col_blocks || jsonb_build_array(jsonb_build_object(
            'id', gen_random_uuid()::text,
            'type', 'menu_column',
            'settings', jsonb_build_object('menu', menu_key, 'title', '')));
        END LOOP;

        sec := jsonb_set(sec, '{blocks}', col_blocks);
      END IF;
      new_footer := new_footer || jsonb_build_array(sec);
    END LOOP;
  END IF;

  -- main 恒在最前，即使一条链接都没搬出来：页头的 `menu` 设置默认指向它
  menus := jsonb_build_array(jsonb_build_object(
    'key', 'main', 'title', '', 'items', main_items)) || menus;

  RETURN jsonb_build_object('menus', menus, 'nav', new_nav, 'footer', new_footer);
END
$fn$;

UPDATE "MarketingSite" AS s
SET menus_json       = c.published->'menus',
    nav_json         = c.published->'nav',
    footer_json      = c.published->'footer',
    menus_draft_json = c.draft->'menus',
    nav_draft_json   = c.draft->'nav',
    footer_draft_json = c.draft->'footer'
FROM (
  SELECT id,
         marketing_migrate_chrome_menus(nav_json, footer_json) AS published,
         marketing_migrate_chrome_menus(nav_draft_json, footer_draft_json) AS draft
  FROM "MarketingSite"
) AS c
WHERE c.id = s.id;

DROP FUNCTION marketing_migrate_chrome_menus(jsonb, jsonb);
