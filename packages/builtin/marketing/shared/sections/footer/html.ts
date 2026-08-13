/**
 * 页脚的 SSR 入口。
 *
 * 结构与块的渲染全在 `_common/chrome-html.ts`（页头页脚同一个渲染器）；这里只补
 * 页脚独有的那点东西：`<footer>` 元素与 `spacing_above`。
 */

import {
  resolveSurfaceStyle,
  settingNumber,
  surfaceStyleAttr,
} from "../../section-schema.js";
import { renderChromeHtml } from "../_common/chrome-html.js";
import {
  chromeShellVarsAttr,
  resolveChromeShell,
} from "../_common/chrome-shell.js";
import { chromeNavContext, type ChromeAreaInput } from "../header/html.js";

export function renderFooterHtml(
  input: ChromeAreaInput & { homeHref?: string },
): string {
  const s = input.section.settings;
  const shell = resolveChromeShell("site-footer", s);
  const style = [
    surfaceStyleAttr(resolveSurfaceStyle(s)),
    chromeShellVarsAttr(shell),
    `--chrome-mt:${settingNumber(s, "spacing_above", 48)}px`,
  ]
    .filter(Boolean)
    .join(";");

  return renderChromeHtml("footer", shell.className, style, {
    section: input.section,
    siteName: input.siteName,
    logoUrl: input.logoUrl,
    homeHref: input.homeHref ?? "/",
    ctx: chromeNavContext(input),
    locales: input.locales ?? [],
    accountEntryHtml: input.accountEntryHtml,
    contributed: input.contributed,
    enabledEntitlements: input.enabledEntitlements,
  });
}
