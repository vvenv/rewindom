import { TRANSLATION_I18N } from "./i18n.js";
import { TRANSLATION_SETTINGS_PANELS } from "./tenant-settings-panels.js";

import type { ClientAppModule } from "@rewindom/client-kit";

/**
 * 前端只贡献一张设置面板。
 *
 * 公开站的翻译控件**不在这里**——那是无 React 的 enhance 层，由
 * `client/enhance/index.ts` 被 marketing 的 assemble 扫进公开站脚本。
 */
export const translationClientModule: ClientAppModule = {
  id: "translation",
  version: "1.0.0",
  label: "Content Translation",
  kind: "infrastructure",
  description: "访客侧按需内容翻译",
  client: {
    i18n: TRANSLATION_I18N,
    tenantSettingsPanels: TRANSLATION_SETTINGS_PANELS,
  },
};
