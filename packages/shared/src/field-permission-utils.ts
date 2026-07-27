import { hasPermission, type Permission } from "./permissions.js";

export type FieldPermissionMap = Record<string, Permission>;

export function canUpdateField(
  isSystemAdmin: boolean | undefined,
  permissions: readonly string[],
  required: Permission,
): boolean {
  return hasPermission(isSystemAdmin, permissions, required);
}

/** 收集 presentFields 中用户无权修改的字段名 */
export function collectForbiddenUpdateFields(
  presentFields: readonly string[],
  fieldPermissions: FieldPermissionMap,
  hasGrant: (permission: Permission) => boolean,
): string[] {
  const forbidden: string[] = [];
  for (const field of presentFields) {
    const required = fieldPermissions[field];
    if (required === undefined) continue;
    if (!hasGrant(required)) {
      forbidden.push(field);
    }
  }
  return [...new Set(forbidden)];
}

export function formatForbiddenFieldsMessage(
  forbiddenFields: readonly string[],
): string {
  return `权限不足，无法修改以下字段：${[...new Set(forbiddenFields)].join(", ")}`;
}
