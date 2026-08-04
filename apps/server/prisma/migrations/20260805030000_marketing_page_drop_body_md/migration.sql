-- 干掉 `MarketingPage.body_md`：内容模型统一到 sections。
--
-- 它原本是「sections 为空时回退渲染成一段 prose」的旧模型，与 section 流并存，
-- 每个渲染入口都得先想一遍走哪条路。`prose` 段能完整覆盖它的场景。
--
-- 删列之前先把还有正文、但没有 section 的页面搬成一段 prose——读路径不留兼容层，
-- 不搬就是把租户已发布的正文直接删掉。

UPDATE "MarketingPage"
SET sections = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'prose',
    'settings', jsonb_build_object('body_md', body_md, 'width', 'page'),
    'blocks', '[]'::jsonb
  )
)
WHERE COALESCE(btrim(body_md), '') <> ''
  AND (
    jsonb_typeof(sections) <> 'array'
    OR jsonb_array_length(sections) = 0
  );

ALTER TABLE "MarketingPage" DROP COLUMN "body_md";
