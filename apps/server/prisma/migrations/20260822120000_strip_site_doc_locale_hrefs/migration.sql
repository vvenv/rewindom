-- 文档正文里写死的 locale 前缀 → 逻辑路径。
--
-- 背景：内置文档以前按目录写死前缀（`en/*.md` 里全是 `/en/docs/…`），只在站点主语言
-- 是 zh-CN 时成立。正文现在存**逻辑路径**，前缀由渲染期按「当前语言 vs 站点主语言」
-- 补（SSR `md(body, ctx)` / SPA `MarkdownProse`）——主语言换成 en 之后，写死的那份
-- 指向一个不存在的入口。源文件已经改过来了，但库里的存量正文不会被 seed 回灌
-- （`ensureDefaultSiteDocs` 按语言幂等，某语言已有文档就整体跳过，免得覆盖租户的
-- 编辑），所以在这里一次性剥掉。
--
-- 只剥**与文档自身语言相同**的那一段，这是整条迁移的安全性所在：
--
-- - `en` 文档里的 `](/en/docs/x)`：前缀是冗余的（这一页本来就渲染在 en 下），剥掉之后
--   渲染期补回同一个地址；站点主语言是 en 时还能少一个死链。语义不变。
-- - `en` 文档里的 `](/zh-CN/docs/x)`：那是租户**故意**写的跨语言链接，一个字不动。
--
-- 所以不必区分「出厂正文」与「租户改过的正文」——同语言前缀在哪一份正文里都是冗余的。
-- 只认行内链接 `](…)`；正文里当例子写的行内代码（`` `/en/docs` ``）不在其列。
--
-- 不碰 `updated_at`：这是纠正表示形式，不是内容更新，访客看到的「最后更新」不该跳。

-- `](/en/docs/x)` → `](/docs/x)`
UPDATE "SiteDoc"
SET
  "body_md"       = regexp_replace("body_md",       '\]\(/' || "locale" || '/', '](/', 'g'),
  "body_md_draft" = regexp_replace("body_md_draft", '\]\(/' || "locale" || '/', '](/', 'g')
WHERE "locale" IN ('zh-CN', 'en')
  AND (
    "body_md"       LIKE '%](/' || "locale" || '/%'
    OR "body_md_draft" LIKE '%](/' || "locale" || '/%'
  );

-- 少见形态：`](/en)`（指向该语言首页）同样是冗余前缀，收成 `](/)`
UPDATE "SiteDoc"
SET
  "body_md"       = regexp_replace("body_md",       '\]\(/' || "locale" || '\)', '](/)', 'g'),
  "body_md_draft" = regexp_replace("body_md_draft", '\]\(/' || "locale" || '\)', '](/)', 'g')
WHERE "locale" IN ('zh-CN', 'en')
  AND (
    "body_md"       LIKE '%](/' || "locale" || ')%'
    OR "body_md_draft" LIKE '%](/' || "locale" || ')%'
  );
