import { createComponentSlot } from "@be-water/client-kit";

/**
 * 站点会员相关的注入点，放在 marketing（消费方）一侧。
 *
 * 公开站页头账户由 SSR + site-enhance 处理；本 slot 只服务 Theme Editor 预览
 *（`SiteChrome` / `SiteAccountEntryPreview`）。
 */
export const siteMemberEntrySlot = createComponentSlot<{
  className?: string;
}>("SiteMemberEntrySlot");
