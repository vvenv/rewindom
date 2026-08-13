/**
 * 公开 marketing 站点交互层入口（无 React）。
 *
 * SSR 注入 `/api/public/site-enhance.js`；本文件由 assemble 打成 IIFE。
 */

import { enhanceAccount } from "./account.js";
import { enhanceForms } from "./form.js";
import { enhanceGated } from "./gated.js";
import { enhanceMemberAuth } from "./member-auth.js";
import { enhanceTheme } from "./theme.js";

function boot(): void {
  enhanceTheme();
  enhanceForms();
  enhanceAccount();
  enhanceGated();
  enhanceMemberAuth();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
