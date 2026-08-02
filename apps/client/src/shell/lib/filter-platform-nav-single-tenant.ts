import type { PlatformNavEntry } from "@be-water/client-kit";

const TENANTS_PATH = "/platform/tenants";

/** 单租户部署：从平台导航中移除租户管理入口。 */
export function filterPlatformNavForSingleTenant(
  entries: readonly PlatformNavEntry[],
): readonly PlatformNavEntry[] {
  return entries
    .map((entry) => {
      if (entry.type !== "group") {
        return entry.to === TENANTS_PATH ? null : entry;
      }
      const children = entry.children.filter(
        (child) => child.to !== TENANTS_PATH,
      );
      if (children.length === 0) {
        return null;
      }
      return { ...entry, children };
    })
    .filter((entry): entry is PlatformNavEntry => entry != null);
}
