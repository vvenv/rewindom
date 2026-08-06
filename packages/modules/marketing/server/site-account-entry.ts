import type { AppLocale } from "@be-water/shared";

/**
 * 页头账户入口的**服务端**注入点，与 client 的 `siteMemberEntrySlot` 一一对应。
 *
 * 定义在消费方（marketing）一侧：marketing 不知道会员模块的存在，由 site-member
 * 在 `onBoot` 里把实现填进来，没填就等于「本站没有账户能力」。方向与依赖图一致
 *（site-member `requires: ["marketing"]`），marketing 不反向 import。
 *
 * 有了它，三处口径才有同一个真相源：
 * - SSR 首屏直接把未登录态的「登录」渲染出来，不再等 SPA 水合才长出来；
 * - 编辑器问 `/api/site/capabilities` 决定「账户入口」开关能不能点；
 * - 预览据此决定要不要画那枚按钮。
 */
export interface SiteAccountEntry {
  /** 本站是否具备账户能力（租户未开通会员时为 false）。 */
  available: boolean;
  /**
   * 未登录态入口的 HTML 片段，供 SSR 首屏内联。
   *
   * 只画未登录那一态：会员 token 存在 localStorage，不随 HTML 请求发送，服务端
   * 无从知道访客是否已登录。SPA 水合后会用真实会话替换掉它。
   */
  html: string;
}

const UNAVAILABLE: SiteAccountEntry = { available: false, html: "" };

export type SiteAccountEntryResolver = (input: {
  tenantId: string;
  locale: AppLocale;
}) => Promise<SiteAccountEntry>;

let resolver: SiteAccountEntryResolver | null = null;

export function registerSiteAccountEntry(fn: SiteAccountEntryResolver): void {
  resolver = fn;
}

/** 仅供测试：把注入点复位。 */
export function resetSiteAccountEntry(): void {
  resolver = null;
}

export async function resolveSiteAccountEntry(input: {
  tenantId: string | null;
  locale: AppLocale;
}): Promise<SiteAccountEntry> {
  if (!input.tenantId || !resolver) return UNAVAILABLE;
  return resolver({ tenantId: input.tenantId, locale: input.locale });
}
