import { MARKETING_SITE_CSS } from "@be-water/modules/marketing/shared/marketing-site-css.js";
import { isMarketingPublicPath } from "@be-water/modules/marketing/shared/site-locale.js";

function isPlatformConsoleHost(): boolean {
  const host = window.location.hostname;
  return host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

/** 首屏是否应加载工作台 `index.css`（官网公开路径走语义 CSS）。 */
export function shouldLoadAppShellCss(
  pathname = window.location.pathname,
): boolean {
  return isPlatformConsoleHost() || !isMarketingPublicPath(pathname);
}

let appShellCssLoaded = false;
let marketingCssLoaded = false;

/** 从官网公开页跳进 `/app` / `/login` 等应用区时补载工作台样式。 */
export async function ensureAppShellCss(): Promise<void> {
  if (appShellCssLoaded) return;
  await import("./index.css");
  appShellCssLoaded = true;
}

/** 官网公开面：注入语义 CSS（无 Tailwind 构建）。 */
export function ensureMarketingSiteCss(): void {
  if (marketingCssLoaded) return;
  if (typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-marketing-site-style", "");
  style.textContent = MARKETING_SITE_CSS;
  document.head.append(style);
  marketingCssLoaded = true;
}

export async function loadInitialShellCss(): Promise<void> {
  if (shouldLoadAppShellCss()) {
    await ensureAppShellCss();
    return;
  }
  ensureMarketingSiteCss();
}
