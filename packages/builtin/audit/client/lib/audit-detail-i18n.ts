import type { TFunction } from "i18next";

/**
 * 将 `notes.audit.created` 渲染为当前语言。
 * 约定：首段为模块 ns（`notes` / `todos`…），其余为该 ns 下的 key 路径；
 * 内核认证等放在 `audit:detailTemplates.<fullKey>`。
 */
export function translateAuditDetail(
  t: TFunction,
  detailKey: string | null | undefined,
  detailParams: Record<string, unknown> | null | undefined,
  fallback: string | null | undefined,
): string {
  if (!detailKey) {
    return fallback?.trim() ? fallback : "—";
  }

  const params = (detailParams ?? {}) as Record<string, unknown>;
  const firstDot = detailKey.indexOf(".");
  if (firstDot > 0) {
    const ns = detailKey.slice(0, firstDot);
    const key = detailKey.slice(firstDot + 1);
    const fromModule = t(key, {
      ns,
      ...params,
      defaultValue: "",
    });
    if (fromModule) {
      return fromModule;
    }
  }

  const fromAudit = t(`detailTemplates.${detailKey}`, {
    ns: "audit",
    ...params,
    defaultValue: "",
  });
  if (fromAudit) {
    return fromAudit;
  }

  return fallback?.trim() ? fallback : detailKey;
}
