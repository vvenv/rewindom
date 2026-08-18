/**
 * 页面段流的外壳：外层色块承外背景，内层正文承内背景与内边距。
 *
 * 段本身长什么样不在这里——见 `section-views.ts` 与 `views/<type>.tsx`，
 * 以及它们在 SSR 侧的对应实现 `shared/sections/<type>/html.ts`。
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  contentSurfaceStyleCss,
  hasCustomSurface,
  isPageHeaderVisible,
  resolveSectionGaps,
  resolveSectionLayout,
  resolveSurfaceStyle,
  sectionUsesExplicitPadX,
  settingBool,
  surfaceStyleCss,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { type PublicSitePage } from "../../../shared/site-cms.js";
import { THEME_SECTION_SPACING } from "../../../shared/theme-sections.js";

import { SECTION_VIEWS } from "./section-views.js";

export { SiteLink } from "./SiteLink.js";

/**
 * 编辑器里点中了哪个 block。
 *
 * **不**给每个 block 各挂一个 onClick：block 的渲染散在十来个视图里，逐个挂必漏，
 * 而卡片整块是 `<a>` 的那几种还会先把事件吃掉。统一在段这一层从事件目标往上找
 * 最近的 `data-block-id`，找到的元素不在本段里（分栏段的外层）就当没点中。
 *
 * 用 `closest` 的存在性而不是 `instanceof Element` 判断：预览跑在 iframe 里，
 * 那份 document 的 `Element` 与工作台不是同一个构造器，`instanceof` 恒为 false。
 */
function resolveClickedBlockId(event: {
  target: EventTarget | null;
  currentTarget: Element;
}): string | null {
  const target = event.target as Element | null;
  if (typeof target?.closest !== "function") return null;
  const block = target.closest("[data-block-id]");
  if (!block || !event.currentTarget.contains(block)) return null;
  return block.getAttribute("data-block-id");
}

/** 段 / 块的选中回调；`blockId` 为 null 表示选中的是段本身。 */
export type SelectSectionFn = (
  sectionId: string,
  blockId: string | null,
) => void;

interface SiteSectionsProps {
  sections: SiteSection[];
  onSelectSection?: SelectSectionFn;
  sectionSpacing?: number;
  contained?: boolean;
  pages?: PublicSitePage[];
  currentPath?: string;
  contributed?: Readonly<Record<string, unknown>>;
}

export function SiteSections({
  sections,
  onSelectSection,
  sectionSpacing = THEME_SECTION_SPACING.default,
  contained = false,
  pages = [],
  currentPath = "/",
  contributed,
}: SiteSectionsProps): ReactNode {
  const layouts = sections.map((section) =>
    resolveSectionLayout(section.settings),
  );
  const gaps = resolveSectionGaps(layouts, sectionSpacing);

  /*
   * 容器段的下钻口：列已经限过宽、给过 gutter，列内子段走 `contained`
   *（`width: full` 在一列里没有「通栏」可言）。SSR 侧的 `ctx.renderSection` 同理。
   */
  const renderChildren = (children: SiteSection[]): ReactNode => (
    <SiteSections
      sections={children}
      contained
      sectionSpacing={sectionSpacing}
      pages={pages}
      currentPath={currentPath}
      contributed={contributed}
      onSelectSection={onSelectSection}
    />
  );

  return sections.map((section, index) => {
    if (section.type === "page-header" && !isPageHeaderVisible(section.settings)) {
      return null;
    }
    const View = SECTION_VIEWS[section.type];
    if (!View) return null;
    const layout = layouts[index]!;
    const surface = resolveSurfaceStyle(section.settings);
    const width = contained && layout.width === "full" ? "page" : layout.width;
    const glow = settingBool(section.settings, "show_glow");
    const useTokenBg = !surface.backgroundColor && layout.background !== "none";
    const useDefaultRadius =
      surface.borderRadius === null &&
      (useTokenBg || hasCustomSurface(surface)) &&
      width !== "full";
    const explicitPadX = sectionUsesExplicitPadX(layout, section.type);

    const bandClass = [
      "sec-band",
      `sec-w-${width}`,
      useTokenBg ? `sec-bg-${layout.background}` : "",
      useDefaultRadius ? "sec-radius-default" : "",
      layout.dividerTop ? "sec-divider-top" : "",
      layout.dividerBottom ? "sec-divider-bottom" : "",
      glow ? "has-glow" : "",
      hasCustomSurface(surface) ? "has-surface" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const contentClass = [
      contained
        ? "sec-content sec-c-contained"
        : `sec-content sec-c-${layout.contentWidth}`,
      surface.innerBackgroundColor ? "has-inner-bg" : "",
      explicitPadX ? "sec-pad-x" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <section
        key={section.id}
        id={layout.anchor || undefined}
        data-section-id={section.id}
        className="sec"
        style={
          {
            "--sec-gap": `${gaps[index]}px`,
            ...(onSelectSection ? { cursor: "pointer" } : {}),
          } as CSSProperties
        }
        role={onSelectSection ? "button" : undefined}
        tabIndex={onSelectSection ? 0 : undefined}
        onClick={
          onSelectSection
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectSection(section.id, resolveClickedBlockId(event));
              }
            : undefined
        }
        onKeyDown={
          onSelectSection
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  // 键盘落点是段本身，选到块得靠左树的方向键
                  onSelectSection(section.id, null);
                }
              }
            : undefined
        }
      >
        <div
          className={bandClass}
          style={surfaceStyleCss(surface) as CSSProperties}
        >
          {glow ? <div className="sec-glow" aria-hidden /> : null}
          <div
            className={contentClass}
            style={
              {
                "--sec-pt": `${layout.paddingTop}px`,
                "--sec-pr": `${layout.paddingRight}px`,
                "--sec-pb": `${layout.paddingBottom}px`,
                "--sec-pl": `${layout.paddingLeft}px`,
                ...contentSurfaceStyleCss(surface),
              } as CSSProperties
            }
          >
            <View
              section={section}
              pages={pages}
              currentPath={currentPath}
              contributed={contributed}
              renderChildren={renderChildren}
            />
          </div>
        </div>
      </section>
    );
  });
}
