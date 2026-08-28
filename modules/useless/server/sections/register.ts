/**
 * 往「站点」的注册表里填本模块的贡献（SSR 侧）。
 *
 * 定义与 HTML 渲染器都住在 `shared/`，两端 import 同一份——marketing 只提供注册表，
 * 不认识 `useless.*`。**每一项在 client manifest 那边还要再登记一次**：
 * 只登记这一边的话段能渲染，但租户在 Theme Editor 的「添加区块」里找不到它。
 */
import { registerSectionContextProvider } from "@rewindom/builtin/marketing/server/section-context-providers.js";
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";

import {
  uselessTodaySection,
  USELESS_TODAY_SECTION_TYPE,
} from "../../shared/sections/today/definition.js";
import { renderUselessTodayHtml } from "../../shared/sections/today/html.js";
import { USELESS_CSS } from "../../shared/site-css.generated.js";
import { uselessContextEntry } from "../../shared/useless-section-context.js";
import { isUselessEnabled } from "../lib/entitlement.js";
import { registerUselessDayPath } from "../ssr/day-path-handler.js";
import { buildUselessContext } from "./context.js";

/** 在模块 `onBoot` 里调。 */
export function registerUselessSiteContributions(): void {
  const css = { css: USELESS_CSS };

  registerSiteSectionHtml(uselessTodaySection, renderUselessTodayHtml, css);

  // /20260826 —— 回看那一天
  registerUselessDayPath();

  registerSectionContextProvider({
    sectionTypes: [USELESS_TODAY_SECTION_TYPE],
    /*
     * 东西是纯文本 / HTML、没有 locale map，所以这里用不到 `input.locale`——不是漏了。
     * 哪天内容改成按语言存，取数就得跟着 `input.locale` 走（见 site-section skill）。
     */
    provide: async (input) => {
      if (!(await isUselessEnabled(input.tenantId))) return {};
      /*
       * `?d=` 来自访客，**必须自己校验**：`buildUselessContext` 里解不出合法日期
       * 就退回今天，绝不把原样字符串带进查询。
       */
      const context = await buildUselessContext(
        input.tenantId,
        input.query?.d,
        new Date(),
        // 导航文案要跟**当前页面的语言**走，不是工作台界面语言
        input.locale,
      );
      return uselessContextEntry(context);
    },
  });
}
