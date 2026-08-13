/**
 * 页头的 SSR 入口。
 *
 * 结构与块的渲染全在 `_common/chrome-html.ts`（页头页脚同一个渲染器）；这里只补
 * 页头独有的那点东西：`<header>` 元素、吸顶 class、以及站点导航上下文的组装。
 */

import {
  resolveSurfaceStyle,
  settingBool,
  surfaceStyleAttr,
} from "../../section-schema.js";
import { siteNavPages, type PublicSitePage } from "../../site-cms.js";
import {
  renderChromeHtml,
  type LocaleSwitcherOption,
} from "../_common/chrome-html.js";
import {
  chromeShellVarsAttr,
  resolveChromeShell,
} from "../_common/chrome-shell.js";

import type { PublicDocSummary } from "../../marketing-doc.js";
import type { SiteNavContext } from "../../site-nav.js";
import type { SiteSection } from "../types.js";
import type { AppLocale } from "@rewindom/shared";

export type { LocaleSwitcherOption };

export interface ChromeAreaInput {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  pages?: PublicSitePage[];
  docs?: readonly PublicDocSummary[];
  hasDocs?: boolean;
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
  locales?: LocaleSwitcherOption[];
  accountEntryHtml?: string;
  contributed?: Readonly<Record<string, unknown>>;
  enabledEntitlements?: ReadonlySet<string>;
}

/** 展开导航要的内容快照；页头页脚共用。 */
export function chromeNavContext(input: ChromeAreaInput): SiteNavContext {
  const defaultLocale = input.defaultLocale ?? "zh-CN";
  return {
    navPages: siteNavPages(input.pages ?? []),
    docs: input.docs,
    locale: input.locale ?? defaultLocale,
    defaultLocale,
    currentPath: input.currentPath ?? "",
  };
}

export function renderHeaderHtml(
  input: ChromeAreaInput & { homeHref: string },
): string {
  const s = input.section.settings;
  const shell = resolveChromeShell("site-header", s);
  const className = settingBool(s, "sticky")
    ? `${shell.className} sticky`
    : shell.className;
  const style = [surfaceStyleAttr(resolveSurfaceStyle(s)), chromeShellVarsAttr(shell)]
    .filter(Boolean)
    .join(";");

  return renderChromeHtml("header", className, style, {
    section: input.section,
    siteName: input.siteName,
    logoUrl: input.logoUrl,
    homeHref: input.homeHref,
    ctx: chromeNavContext(input),
    locales: input.locales ?? [],
    hasDocs: input.hasDocs ?? (input.docs?.length ?? 0) > 0,
    accountEntryHtml: input.accountEntryHtml,
    contributed: input.contributed,
    enabledEntitlements: input.enabledEntitlements,
  });
}
