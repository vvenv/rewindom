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
    "site.form.too_short": "内容过短",
    "site.form.too_long": "内容过长",
    "site.form.option": "请从列表中选择",
    "site.form.url": "请填写网址（以 http:// 或 https:// 开头）",
    "site.form.number": "请填写数字",
    "site.form.integer": "请填写整数",
    "site.form.id_card": "身份证号格式不对",
    "site.form.postal_code": "邮编为 6 位数字",
    "site.form.regex": "格式不符合要求",
    "site.form.failed": "提交失败，请稍后重试",
  },
  en: {
    "site.form.required": "Required",
    "site.form.email": "Enter a valid email address",
    "site.form.tel": "Enter a valid phone number",
    "site.form.too_short": "Too short",
    "site.form.too_long": "Too long",
    "site.form.option": "Choose one of the listed options",
    "site.form.url": "Enter a URL starting with http:// or https://",
    "site.form.number": "Enter a number",
    "site.form.integer": "Enter a whole number",
    "site.form.id_card": "Enter a valid ID card number",
    "site.form.postal_code": "Enter a 6-digit postal code",
    "site.form.regex": "Doesn't match the required format",
    "site.form.failed": "Couldn't submit — please try again",
  },
};

export function formErrorText(locale: AppLocale, code: string): string {
  return FORM_ERROR_TEXT[locale]?.[code] ?? FORM_ERROR_TEXT["zh-CN"][code] ?? code;
}
