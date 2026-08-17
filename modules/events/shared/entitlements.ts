import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const EVENTS_ENTITLEMENT: TenantModuleEntitlement = {
  key: "events",
  label: "事件雷达",
  description: "跨来源发现事件、重建时间线并持续追踪",
  disabled_hint: "该组织未开通事件雷达模块",
  default_enabled: true,
};
