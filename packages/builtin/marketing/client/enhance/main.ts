/**
 * 公开 marketing 站点交互层入口（无 React）。
 *
 * SSR 注入 `/api/public/site-enhance.js`；本文件由 assemble 打成 IIFE。
 *
 * **贡献方的脚本不写在这里**：模块在自己的 `client/enhance/index.ts` 里导出
 * `enhanceSite(ctx)`，assemble 扫到就拼进同一个 IIFE 并在 `boot()` 里调用
 *（见 `shared/site-enhance/assemble.mjs`）。marketing 不 import 任何业务模块——
 * 那条边由构建期的虚拟入口拼，依赖图上仍只有「业务模块 → marketing」一条。
 */

import { enhanceAccount } from "./account.js";
import { enhanceGated } from "./gated.js";
import { enhanceMemberAuth } from "./member-auth.js";
import { siteEnhanceContext, type SiteEnhanceContext } from "./page-context.js";
import { enhanceTheme } from "./theme.js";

export type { SiteEnhanceContext } from "./page-context.js";

/** 贡献方 `client/enhance/index.ts` 必须导出的函数形状。 */
export type SiteEnhancer = (context: SiteEnhanceContext) => void;

function boot(contributed: readonly SiteEnhancer[]): void {
  enhanceTheme();
  enhanceAccount();
  enhanceGated();
  enhanceMemberAuth();

  const context = siteEnhanceContext();
  for (const enhance of contributed) {
    /*
     * 逐个兜住：一个模块的脚本抛错不该让后面的（以及已经跑完的）跟着停摆——
     * 访客看到的会是「明暗切换好了、表单点了没反应」这种更难查的半残状态。
     */
    try {
      enhance(context);
    } catch (err) {
      console.error("[site-enhance] contributed enhancer failed", err);
    }
  }
}

/** 由生成的虚拟入口调用，参数是扫到的贡献方 enhancer。 */
export function bootSiteEnhance(
  contributed: readonly SiteEnhancer[] = [],
): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot(contributed), {
      once: true,
    });
  } else {
    boot(contributed);
  }
}
