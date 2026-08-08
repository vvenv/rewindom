import { getPlatformDoc } from "../../../docs/index.js";
import { settingText } from "../../section-schema.js";
import { md } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

/**
 * doc-source 的 SSR 渲染：从平台文档注册表查 markdown，转 HTML。
 *
 * 与 prose 的 \`md(settingText(section.settings, "body_md"))\` 对应——
 * 只是内容来源从 section settings 换成了 docs 注册表。
 */
export const renderDocSourceHtml: SectionHtmlRenderer = (section) => {
  const slug = settingText(section.settings, "doc_slug");
  const doc = getPlatformDoc(slug);
  if (!doc) return "";
  return `<div class="prose">${md(doc.markdown)}</div>`;
};
