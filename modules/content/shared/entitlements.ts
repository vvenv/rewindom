import type { TenantModuleEntitlement } from "@rewindom/module-sdk";

export const CONTENT_ENTITLEMENT: TenantModuleEntitlement = {
  key: "contents",
  label: "内容生成",
  description: "用图片、视频和文字生成笔记与文章",
  disabled_hint: "该组织未开通内容生成",
  default_enabled: true,
};
