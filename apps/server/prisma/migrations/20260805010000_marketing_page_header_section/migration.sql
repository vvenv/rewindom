-- 「页面标题」不再自动渲染，改成一段普通 section（type = 'page-header'）。
--
-- 以前的规则是：非首页 + 首段不是带 headline 的 hero → 自动输出 h1 + 描述。
-- 现在那段代码没了，所以给**当初会自动出标题**的页面在 sections 最前面补一段，
-- 否则已发布官网的 h1 会静默消失（SEO 直接掉一级）。
--
-- 补进去的段不填 headline/subhead：渲染时回落到页面自己的 title/description，
-- 与迁移前的显示逐字一致，租户随后想改再填。

UPDATE "MarketingPage" AS p
SET sections =
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'type', 'page-header',
      'settings', jsonb_build_object('align', 'left'),
      'blocks', '[]'::jsonb
    )
  ) || p.sections
WHERE p.kind <> 'home'
  -- 空 sections 的页面走的是 body_md 回退，本来也没有 section 流，跳过
  AND jsonb_typeof(p.sections) = 'array'
  AND jsonb_array_length(p.sections) > 0
  -- 已经以 hero 开场的页面当初就不出 page-head（hero 自带 h1），别塞第二个
  AND NOT (
    p.sections -> 0 ->> 'type' = 'hero'
    AND COALESCE(p.sections -> 0 -> 'settings' ->> 'headline', '') <> ''
  )
  -- 幂等：已经有 page-header 的不再补
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.sections) AS s
    WHERE s ->> 'type' = 'page-header'
  );
