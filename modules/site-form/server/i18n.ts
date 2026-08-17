import type { ServerI18nBundle } from "@rewindom/module-sdk/server";

export const SITE_FORM_SERVER_I18N: ServerI18nBundle = {
  id: "site-form",
  messages: {
    "zh-CN": {
      "site.form_invalid": "表单内容不合法",
      "site.form_not_found": "表单不存在",
      "site.form_rate_limited": "提交过于频繁，请稍后再试",
      "site.form_submission_not_found": "提交记录不存在",
      "site-form.audit.submission_deleted": "删除官网表单提交",
    },
    en: {
      "site.form_invalid": "Invalid form",
      "site.form_not_found": "Form not found",
      "site.form_rate_limited": "Too many submissions — please try again later",
      "site.form_submission_not_found": "Submission not found",
      "site-form.audit.submission_deleted": "Deleted a form submission",
    },
  },
};
