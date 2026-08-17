/**
 * 往「站点」的段注册表里填表单段（SSR 侧）。
 *
 * 定义与 HTML 渲染器都住在本模块 `shared/`，两端 import 同一份——marketing 只提供
 * 注册表，不认识 `site-form.form` 这个 type。
 */

import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";

import { formSection } from "../shared/sections/form/definition.js";
import { renderFormHtml } from "../shared/sections/form/html.js";
import { FORM_CSS } from "../shared/site-css.generated.js";

/** 在模块 `onBoot` 里调。 */
export function registerSiteFormSection(): void {
  registerSiteSectionHtml(formSection, renderFormHtml, { css: FORM_CSS });
}
