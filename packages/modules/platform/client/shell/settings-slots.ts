import { createComponentSlot } from "@be-water/client-kit";

/**
 * 租户「系统管理 → 品牌」页的扩展槽。
 *
 * `platform` 不得 import 业务模块，但品牌是跨模块的租户视觉身份：官网主题
 * （主色 / 字体 / 站点 Logo）由 `marketing` 通过 shellProviders 注入到这里，
 * 用户看到的是一个统一的品牌页。
 *
 * 与 `tenantCardActionsSlot` 同样只开**一个**槽：提供方在其中自行渲染任意多张
 * 卡片，避免每加一个下游能力就要改 `platform`。
 */
export const settingsBrandingExtraSlot = createComponentSlot<{
  canWrite: boolean;
}>("SettingsBrandingExtraSlot");
