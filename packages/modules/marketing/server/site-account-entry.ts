import type { SiteMemberSsrProfile } from "./site-member-ssr-session.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 页头账户入口的**服务端**注入点，与 client 的 `siteMemberEntrySlot` 一一对应。
 *
 * 定义在消费方（marketing）一侧：marketing 不知道会员模块的存在，由 site-member
 * 在 `onBoot` 里把实现填进来，没填就等于「本站没有账户能力」。方向与依赖图一致
 *（site-member `requires: ["marketing"]`），marketing 不反向 import。
 *
 * 有了它，三处口径才有同一个真相源：
 * - SSR 首屏直接把登录态或「登录」渲染出来；
 * - 编辑器问 `/api/site/capabilities` 决定「账户入口」开关能不能点；
 * - 预览据此决定要不要画那枚按钮。
 */
export interface SiteAccountEntry {
  /** 本站是否具备账户能力（租户未开通会员时为 false）。 */
  available: boolean;
  /** 页头入口 HTML（登录链或已登录菜单）。 */
  html: string;
}

const UNAVAILABLE: SiteAccountEntry = { available: false, html: "" };

export type SiteAccountEntryResolver = (input: {
  tenantId: string;
  locale: AppLocale;
  /** 已通过 cookie 校验的会员；访客为 null。 */
  member: SiteMemberSsrProfile | null;
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
  member?: SiteMemberSsrProfile | null;
}): Promise<SiteAccountEntry> {
  if (!input.tenantId || !resolver) return UNAVAILABLE;
  return resolver({
    tenantId: input.tenantId,
    locale: input.locale,
    member: input.member ?? null,
  });
}
