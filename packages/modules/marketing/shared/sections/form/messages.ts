/**
 * 公开表单校验反馈文案（跟随站点语言，不走工作台 i18n）。
 *
 * React `FormSection` 与 site-enhance 共用，避免两端各写一份。
 */

import type { AppLocale } from "@be-water/shared";

export const FORM_ERROR_TEXT: Record<AppLocale, Record<string, string>> = {
  "zh-CN": {
    "site.form.required": "必填",
    "site.form.email": "邮箱格式不对",
    "site.form.tel": "电话格式不对",
    "site.form.too_long": "内容过长",
    "site.form.option": "请从列表中选择",
    "site.form.failed": "提交失败，请稍后重试",
  },
  en: {
    "site.form.required": "Required",
    "site.form.email": "Enter a valid email address",
    "site.form.tel": "Enter a valid phone number",
    "site.form.too_long": "Too long",
    "site.form.option": "Choose one of the listed options",
    "site.form.failed": "Couldn't submit — please try again",
  },
};

export function formErrorText(locale: AppLocale, code: string): string {
  return FORM_ERROR_TEXT[locale]?.[code] ?? FORM_ERROR_TEXT["zh-CN"][code] ?? code;
}
