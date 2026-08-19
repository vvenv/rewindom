import { TranslationSettingsPanel } from "./components/TranslationSettingsPanel.js";

import type { TenantSettingsPanel } from "@rewindom/client-kit";

/**
 * 贡献给 `/app/settings` 的设置面板。
 *
 * 排在 AI 设置（platform 自带，order 默认 100）之后。
 */
export const TRANSLATION_SETTINGS_PANELS: readonly TenantSettingsPanel[] = [
  {
    id: "translation.settings",
    order: 120,
    anyPermission: ["settings.read"],
    component: TranslationSettingsPanel,
  },
];
