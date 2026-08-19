/** 本模块的 API 错误 code 与审计模板。契约是 code，不是中文句子。 */

import type { ServerI18nBundle } from "@rewindom/server-kernel/lib/i18n/types.js";

export const TRANSLATION_SERVER_I18N: ServerI18nBundle = {
  id: "translation",
  messages: {
    "zh-CN": {
      "translation.invalid_body": "翻译请求参数不合法",
      "translation.not_configured": "尚未配置翻译服务",
      "translation.rate_limited": "翻译请求过于频繁，请稍后再试",
      "translation.audit.settings_updated": "更新了翻译设置（引擎：{{engine}}）",
    },
    en: {
      "translation.invalid_body": "Invalid translation request",
      "translation.not_configured": "Translation is not configured",
      "translation.rate_limited":
        "Too many translation requests, try again later",
      "translation.audit.settings_updated":
        "Updated translation settings (engine: {{engine}})",
    },
  },
};
