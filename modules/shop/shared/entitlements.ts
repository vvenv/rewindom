import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const SHOP_ENTITLEMENT: TenantModuleEntitlement = {
  key: "shop",
  label: "商店",
  description: "商品目录、购物车、结账与履约",
  disabled_hint: "该站点未开通商店",
  default_enabled: false,
};
