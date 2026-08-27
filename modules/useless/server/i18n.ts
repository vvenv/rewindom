import type { ServerI18nBundle } from "@rewindom/module-sdk/server";

export const USELESS_SERVER_I18N: ServerI18nBundle = {
  id: "useless",
  messages: {
    "zh-CN": {
      "useless.not_found": "句子不存在",
      "useless.text_required": "请输入正文",
      "useless.text_too_long": "正文不能超过 {{max}} 个字符",
      "useless.audit.created": "创建无用句子：{{text}}",
      "useless.audit.updated": "更新无用句子：{{text}}",
      "useless.audit.deleted": "删除无用句子：{{text}}",
    },
    en: {
      "useless.not_found": "Line not found",
      "useless.text_required": "Text is required",
      "useless.text_too_long": "Text must be at most {{max}} characters",
      "useless.audit.created": "Created line: {{text}}",
      "useless.audit.updated": "Updated line: {{text}}",
      "useless.audit.deleted": "Deleted line: {{text}}",
    },
  },
};
