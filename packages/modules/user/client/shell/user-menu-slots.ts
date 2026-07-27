import { createComponentSlot } from "@be-water/client-kit";

/**
 * 用户菜单用量卡 slot：module-user 只声明与消费；
 * 套餐/用量能力方（settings 模块）通过 shellProviders 注入，
 * 避免基础设施模块反向依赖能力方。未注册时菜单优雅降级（不展示用量）。
 */
export const userMenuUsageSlot = createComponentSlot("UserMenuUsage");
