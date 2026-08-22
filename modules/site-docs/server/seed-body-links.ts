/**
 * 存量文档正文里「写死了 locale 前缀」的站内链接 → 逻辑路径。
 *
 * 内置文档以前按目录写死前缀（`en/*.md` 全写 `/en/docs/…`），只在站点主语言是
 * `zh-CN` 时成立；主语言换成 `en` 之后那些链接指向一个不存在的入口。源文件已经改成
 * 逻辑路径、渲染期补前缀（见 `md(body, ctx)` / `MarkdownProse`），但**建过库的实例**
 * 里那份正文不会被 seed 回灌（`ensureDefaultSiteDocs` 按语言幂等，跳过已有文档的语言）。
 *
 * 改写本身只动链接上的语言段，正文其余部分一个字符都不碰。出厂正文索引是用来**分级**
 * 的，不是用来覆盖的：
 *
 * - 命中索引 = 这一份还是出厂原样，剥前缀一定对；
 * - 没命中 = 内容与当前出厂正文对不上（租户改过，或库里还是更早一版出厂正文——
 *   两者从内容上分不开），剥不剥交给人拍板。
 *
 * 只认行内链接 `](…)`。参考式链接（`[x]: /en/docs/y`）内置文档里没有，真出现了也
 * 只是不被识别，不会被改错。
 *
 * 唯一的消费方是运维脚本 `apps/server/scripts/backfill-site-doc-locale-hrefs.ts`；
 * 判定与出厂正文强相关，所以住在本模块里，不进 `index.ts` 的对外面。
 */

import { APP_LOCALES } from "@rewindom/module-sdk";

import { parseMarkdownFile } from "../shared/site-doc.js";

import type { UsageDocFile } from "./load-usage-docs.js";

const LOCALE_ALTERNATION = APP_LOCALES.map((locale) =>
  locale.slug.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
).join("|");

/*
 * `](/en/docs/x)` → `](/docs/x)`。语言段后面必须紧跟 `/` 或 `)`，`](/english/…)`
 * 这种同前缀的路径不会被误伤；`](/en)` 收成 `](/)`。
 */
const LINK_LOCALE_PATTERN = `\\]\\(/(?:${LOCALE_ALTERNATION})(/[^)]*)?\\)`;
const LINK_LOCALE_RE = new RegExp(LINK_LOCALE_PATTERN, "gu");

/** 正文里所有行内链接的 locale 前缀剥掉（其余一个字符都不动）。 */
export function stripDocLinkLocale(body: string): string {
  return body.replace(LINK_LOCALE_RE, (_match, rest: string | undefined) => {
    return `](${rest ?? "/"})`;
  });
}

/** 正文里还有带 locale 前缀的行内链接？ */
export function hasLocalePrefixedDocLink(body: string): boolean {
  // 另起一个不带 `g` 的实例：`test` 会推进 `lastIndex`，共用那个会漏判
  return new RegExp(LINK_LOCALE_PATTERN, "u").test(body);
}

/** 出厂正文索引：剥掉前缀之后的出厂正文全集。 */
export function buildSeedBodyIndex(
  files: readonly UsageDocFile[],
): ReadonlySet<string> {
  const index = new Set<string>();
  for (const file of files) {
    const parsed = parseMarkdownFile(file.filename, file.raw);
    index.add(stripDocLinkLocale(parsed.body_md));
  }
  return index;
}

/** 这段正文除了链接前缀之外，与某篇出厂正文一字不差？ */
export function matchesSeedBody(
  index: ReadonlySet<string>,
  body: string,
): boolean {
  return index.has(stripDocLinkLocale(body));
}
