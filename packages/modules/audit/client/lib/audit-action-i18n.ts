import {
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABELS,
  type AuditActionType,
} from "../../shared/index.js";

import type { TFunction } from "i18next";

/** 分组稳定 id，避免用中文 label 当 React key / i18n key。 */
export const AUDIT_ACTION_GROUP_IDS = [
  "auth",
  "users",
  "system",
  "notes",
  "todos",
  "billing",
] as const;

export type AuditActionGroupId = (typeof AUDIT_ACTION_GROUP_IDS)[number];

export function translateAuditAction(
  t: TFunction,
  action: string,
): string {
  const key = `actions.${action}`;
  const translated = t(key, { defaultValue: "" });
  if (translated) return translated;
  return (
    AUDIT_ACTION_LABELS[action as AuditActionType] ?? action
  );
}

export function translateAuditActionGroup(
  t: TFunction,
  groupId: AuditActionGroupId,
): string {
  return t(`groups.${groupId}`);
}

/** 带稳定 id 的分组视图，供筛选下拉使用。 */
export function getAuditActionGroupViews(): ReadonlyArray<{
  id: AuditActionGroupId;
  actions: readonly AuditActionType[];
}> {
  return AUDIT_ACTION_GROUPS.map((group, index) => ({
    id: AUDIT_ACTION_GROUP_IDS[index]!,
    actions: group.actions,
  }));
}
