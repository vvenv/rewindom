/**
 * 把「我的订阅」挂进会员页头菜单 / 账户页次要入口。
 *
 * 注册表在 site-member（消费方）；本模块只贡献一条链接。server `onBoot` 与 client
 * manifest 各调一次，两端清单一致。
 */

import { registerMemberMenuLink } from "../../site-member/shared/member-menu-links.js";

import { MEMBER_BILLING_PATH } from "./plans-section.js";

export function registerSiteBillingMemberMenuLink(): void {
  registerMemberMenuLink({
    id: "billing",
    href: MEMBER_BILLING_PATH,
    labels: {
      "zh-CN": "我的订阅",
      en: "Billing",
    },
    label_key: "site-billing:entry.billing",
    order: 10,
  });
}
