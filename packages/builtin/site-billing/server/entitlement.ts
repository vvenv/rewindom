import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { SITE_MEMBER_ENTITLEMENT } from "../../site-member/shared/entitlements.js";
import { SITE_BILLING_ENTITLEMENT } from "../shared/entitlements.js";

/**
 * 会员付费对这个站点开着吗。
 *
 * 两个开关都要：订阅挂在**会员**身上，站点关掉会员之后 `/member/billing` 是一条死路
 * ——访客登不进来，页面只会渲染出一张谁也用不了的订阅卡。依赖方向与 manifest 一致
 *（site-billing `requires: ["site-member"]`）。
 */
export async function isSiteBillingEnabled(tenantId: string): Promise<boolean> {
  const [billing, member] = await Promise.all([
    isTenantModuleEnabled(tenantId, SITE_BILLING_ENTITLEMENT.key),
    isTenantModuleEnabled(tenantId, SITE_MEMBER_ENTITLEMENT.key),
  ]);
  return billing && member;
}
