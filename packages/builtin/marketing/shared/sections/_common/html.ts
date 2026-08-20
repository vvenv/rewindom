/**
 * 各段 SSR 渲染器的复用片段，与客户端 `section-parts.tsx` 一一对应。
 *
 * 两边共用同一份 schema 读取（`settingText` 等）与同一套 class 名，改了一边就该改另一边
 * ——这也是把两端渲染并置到 `sections/<type>/` 的用意：diff 里它们是相邻的。
 */

import { Marked, Renderer } from "marked";

import { BRAND_ICON_SVG } from "../../brand-icons.js";
import { escapeHtml } from "../../html.js";
import { SECTION_ICON_SVG } from "../../section-icons.generated.js";
import {
  resolveSettingIcon,
  resolveSurfaceStyle,
  settingIcon,
  settingText,
  surfaceStyleAttr,
  type BrandIconName,
  type ResolvedSectionIcon,
  type SectionIconName,
  type SettingValues,
} from "../../section-schema.js";

/**
 * 标题文本 → 锚点 id。保留 CJK：中文标题占多数，剥成空串的话目录链接点不动。
 */
function headingAnchor(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "section"
  );
}

const defaultTable = Renderer.prototype.table;

/** 独立实例，避免污染全局 marked 默认配置。 */
const mdMarked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    table(token) {
      // 表格套一层滚动容器：和 SPA 的 MarkdownProse 结构一致。
      // 直接给 table 上 `display:block;overflow:auto` 会让单元格缩成内容宽度，撑不满。
      return `<div class="table-wrap">${defaultTable.call(this, token)}</div>`;
    },
    /*
     * 标题带锚点 id，且 `#` 降一级——两条都是为了跟客户端 `MarkdownProse` 对齐。
     *
     * 降级：正文外面已经有一个页面级 h1（文档标题 / hero），正文里的 `#` 再出一个
     * 就是双 h1。id：目录链接要在 SSR 出来的页面上点得动。
     */
    heading(token) {
      const level = token.depth === 1 ? 2 : token.depth;
      const anchor = escapeHtml(headingAnchor(token.text));
      const inner = this.parser.parseInline(token.tokens);
      return `<h${level} id="${anchor}">${inner}</h${level}>\n`;
    },
  },
});

/** markdown → HTML，与 SPA 的 `MarkdownProse` 结构对齐。 */
export function md(body: string): string {
  return mdMarked.parse(body || "", { async: false }) as string;
}

/** block / 卡片上的自定义外观：有设置才吐 ` style="..."`。 */
export function blockSurfaceAttr(settings: SettingValues): string {
  const attr = surfaceStyleAttr(resolveSurfaceStyle(settings));
  return attr ? ` style="${attr}"` : "";
}

export function isExternal(href: string): boolean {
  return /^(https?:|mailto:|tel:)/u.test(href);
}

export function linkAttrs(href: string): string {
  return isExternal(href)
    ? ` href="${escapeHtml(href)}" rel="noreferrer noopener" target="_blank"`
    : ` href="${escapeHtml(href)}"`;
}

export function buttonRow(settings: SettingValues, align: string): string {
  const buttons = (["primary", "secondary"] as const)
    .map((prefix) => ({
      prefix,
      label: settingText(settings, `${prefix}_label`),
      href: settingText(settings, `${prefix}_href`),
    }))
    .filter((item) => item.label && item.href)
    .map(
      (item) =>
        `<a class="btn${item.prefix === "secondary" ? " btn-secondary" : ""}"${linkAttrs(item.href)}>${escapeHtml(item.label)}</a>`,
    );
  if (buttons.length === 0) return "";
  return `<p class="btn-row${align === "center" ? " center" : ""}">${buttons.join("")}</p>`;
}

export function sectionHeading(settings: SettingValues, action = false): string {
  const heading = settingText(settings, "heading");
  const subheading = settingText(settings, "subheading");
  const label = settingText(settings, "primary_label");
  const href = settingText(settings, "primary_href");
  const hasAction = action && label && href;
  if (!heading && !subheading && !hasAction) return "";

  return `<div class="sec-head">
  <div>
    ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}
    ${subheading ? `<p class="lead">${escapeHtml(subheading)}</p>` : ""}
  </div>
  ${hasAction ? `<a class="btn btn-secondary"${linkAttrs(href)}>${escapeHtml(label)}</a>` : ""}
</div>`;
}

export function gridClass(columns: number): string {
  return `grid cols-${columns === 2 || columns === 4 ? columns : 3}`;
}

function lucideSvgHtml(name: SectionIconName, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SECTION_ICON_SVG[name]}</svg>`;
}

function brandSvgHtml(name: BrandIconName, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${BRAND_ICON_SVG[name]}</svg>`;
}

/** lucide / 社交品牌 / 上传图：公开站内联 SVG 或 `<img>`。 */
export function resolvedIconHtml(
  icon: ResolvedSectionIcon,
  options: { className?: string; size?: number; wrap?: boolean } = {},
): string {
  const size = options.size ?? 20;
  const inner =
    icon.kind === "image"
      ? `<img src="${escapeHtml(icon.url)}" alt="" width="${size}" height="${size}" />`
      : icon.kind === "brand"
        ? brandSvgHtml(icon.name, size)
        : lucideSvgHtml(icon.name, size);
  if (options.wrap === false) return inner;
  const className = options.className ?? "card-icon";
  return `<span class="${className}" aria-hidden="true">${inner}</span>`;
}

/** lucide 白名单图标，SSR 内联 SVG（公开站不挂 React）。 */
export function iconHtml(
  name: SectionIconName,
  className = "card-icon",
): string {
  return resolvedIconHtml(
    { kind: "lucide", name },
    { className, size: 20, wrap: true },
  );
}

export function iconHtmlFromSettings(
  settings: SettingValues,
  id = "icon",
  className = "card-icon",
): string {
  const resolved = resolveSettingIcon(settings, id);
  if (resolved) {
    return resolvedIconHtml(resolved, { className, size: 20, wrap: true });
  }
  return iconHtml(settingIcon(settings, id), className);
}
