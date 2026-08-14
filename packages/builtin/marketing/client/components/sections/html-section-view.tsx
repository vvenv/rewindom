/**
 * 把 SSR HTML 渲染器接到编辑器预览上。
 *
 * 公开站不挂 React；预览若再写一套 JSX，DOM 必然漂。贡献段把同一份
 * `SectionHtmlRenderer` 交进来，预览灌同一串 HTML。
 */

import type { ReactElement } from "react";

import type { ChromeBlockHtmlRenderer } from "../../../shared/sections/_common/chrome-html.js";
import type { SectionHtmlRenderer } from "../../../shared/sections/render-context.js";

import type { ChromeBlockViewProps } from "./chrome-views.js";
import type { SectionViewProps } from "./section-parts.js";

function HtmlFragment({ html }: { html: string }): ReactElement {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      onSubmit={(event) => event.preventDefault()}
    />
  );
}

/** 段预览：调用与公开 SSR 同一个渲染器。 */
export function htmlSectionView(
  render: SectionHtmlRenderer,
): (props: SectionViewProps) => ReactElement | null {
  return function HtmlSectionView({
    section,
    pages,
    currentPath,
    contributed,
  }: SectionViewProps): ReactElement | null {
    const html = render(section, { pages, currentPath, contributed });
    if (!html) return null;
    return <HtmlFragment html={html} />;
  };
}

/** chrome 块预览：同上，源是 `registerChromeBlockHtml` 那份渲染器。 */
export function htmlChromeBlockView(
  render: ChromeBlockHtmlRenderer,
): (props: ChromeBlockViewProps) => ReactElement | null {
  return function HtmlChromeBlockView({
    block,
    contributed,
  }: ChromeBlockViewProps): ReactElement | null {
    const html = render(block, { contributed });
    if (!html) return null;
    return <HtmlFragment html={html} />;
  };
}
