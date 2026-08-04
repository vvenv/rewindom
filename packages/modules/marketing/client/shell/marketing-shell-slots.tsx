import type { ReactNode } from "react";

import { settingsBrandingExtraSlot } from "../../../platform/client/shell/settings-slots.js";
import { SiteThemeCard } from "../components/branding/SiteThemeCard.js";

/**
 * marketing 向「系统管理 → 品牌」页注入官网主题卡片。
 * `marketing` 已声明 `requires: ["platform"]`，方向合法（platform 不反向依赖）。
 */
export function MarketingShellSlots({ children }: { children: ReactNode }) {
  return (
    <settingsBrandingExtraSlot.Provider component={SiteThemeCard}>
      {children}
    </settingsBrandingExtraSlot.Provider>
  );
}
