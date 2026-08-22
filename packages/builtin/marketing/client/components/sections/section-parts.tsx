/**
 * 各段 React 视图的复用片段，与 SSR 侧 `shared/sections/_common/html.ts` 一一对应。
 *
 * 两边共用同一套 class 名与同一份 schema 读取；改了一边就该改另一边——段的两处渲染
 * 已按段并置（`views/<type>.tsx` ↔ `shared/sections/<type>/html.ts`），漏改在 diff 里看得见。
 */

import { type CSSProperties, type ReactElement, type ReactNode } from "react";

import {
  resolveSurfaceStyle,
  settingText,
  surfaceStyleCss,
  type SettingValues,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { type PublicSitePage } from "../../../shared/site-cms.js";
import { MarkdownProse } from "../MarkdownProse.js";

import { SiteLink } from "./SiteLink.js";

/** 一段视图拿到的全部输入。加段时照抄这个签名即可，不必碰 `SiteSections`。 */
export interface SectionViewProps {
  section: SiteSection;
  pages: PublicSitePage[];
  currentPath: string;
  /**
   * 贡献段的按请求数据——与 SSR 的 `SectionRenderContext.contributed` 同一份。
   */
  contributed?: Readonly<Record<string, unknown>>;
  /**
   * 正在渲染的页面正文段树。贡献段按同页兄弟分配内容时用。
   */
  pageSections?: readonly SiteSection[];
  /**
   * 渲染一串子段——**只有容器段用得上**，由 `SiteSections` 注入。
   *
   * 注入而不是让 `views/group.tsx` 直接 import `SiteSections`：那条边会成环
   *（`SiteSections` → 视图表 → group → `SiteSections`），而模块包的
   * `import-x/no-cycle` 是 error。SSR 侧的 `ctx.renderSection` 是同一手法。
   */
  renderChildren: (sections: SiteSection[]) => ReactNode;
}

export function gridClass(columns: number): string {
  return `grid cols-${columns === 2 || columns === 4 ? columns : 3}`;
}

export function blockCardProps(
  settings: SettingValues,
  plain = false,
): { className: string; style: CSSProperties } {
  const surface = resolveSurfaceStyle(settings);
  return {
    className: plain ? "card card-plain" : "card",
    style: surfaceStyleCss(surface) as CSSProperties,
  };
}

/** 富文本区块：与文档页共用一套 markdown 排版（见 MarkdownProse）。 */
export function MarkdownBlock({
  body_md,
}: {
  body_md: string;
}): ReactElement | null {
  if (!body_md) return null;
  return (
    <div className="prose">
      <MarkdownProse markdown={body_md} />
    </div>
  );
}

export function ButtonRow({
  settings,
  align,
}: {
  settings: SettingValues;
  align?: string;
}): ReactElement | null {
  const buttons = (["primary", "secondary"] as const)
    .map((prefix) => ({
      prefix,
      label: settingText(settings, `${prefix}_label`),
      href: settingText(settings, `${prefix}_href`),
    }))
    .filter((item) => item.label && item.href);

  if (buttons.length === 0) return null;

  return (
    <p className={`btn-row${align === "center" ? " center" : ""}`}>
      {buttons.map((item) => (
        <SiteLink
          key={item.prefix}
          href={item.href}
          className={item.prefix === "secondary" ? "btn btn-secondary" : "btn"}
        >
          {item.label}
        </SiteLink>
      ))}
    </p>
  );
}

/** 区块抬头：标题 + 描述 + 可选的右上角按钮。 */
export function SectionHeading({
  settings,
  action,
}: {
  settings: SettingValues;
  action?: boolean;
}): ReactElement | null {
  const heading = settingText(settings, "heading");
  const subheading = settingText(settings, "subheading");
  const label = settingText(settings, "primary_label");
  const href = settingText(settings, "primary_href");
  const hasAction = Boolean(action && label && href);

  if (!heading && !subheading && !hasAction) return null;

  return (
    <div className="sec-head">
      <div>
        {heading ? <h2>{heading}</h2> : null}
        {subheading ? <p className="lead">{subheading}</p> : null}
      </div>
      {hasAction ? (
        <SiteLink href={href} className="btn btn-secondary">
          {label}
        </SiteLink>
      ) : null}
    </div>
  );
}
