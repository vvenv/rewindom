import type { PermissionCatalogEntry, RoleDetail } from "@be-water/shared";

export interface RoleFormState {
  name: string;
  description: string;
  permissions: string[];
}

export const INITIAL_ROLE_FORM: RoleFormState = {
  name: "",
  description: "",
  permissions: [],
};

export function roleToForm(role?: RoleDetail | null): RoleFormState {
  if (!role) {
    return INITIAL_ROLE_FORM;
  }
  return {
    name: role.name,
    description: role.description ?? "",
    permissions: [...role.permissions],
  };
}

export interface RoleFormErrors {
  name?: string;
}

export function validateRoleForm(form: RoleFormState): RoleFormErrors {
  const errors: RoleFormErrors = {};
  const name = form.name.trim();

  if (!name) {
    errors.name = "请输入角色名称";
  } else if (name.length > 50) {
    errors.name = "角色名称不超过 50 个字符";
  }

  return errors;
}

export function hasRoleFormErrors(errors: RoleFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export interface RolePayload {
  name: string;
  description: string;
  permissions: string[];
}

export function buildRolePayload(form: RoleFormState): RolePayload {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    permissions: [...new Set(form.permissions)],
  };
}

export interface PermissionGroup {
  label: string;
  entries: PermissionCatalogEntry[];
}

/**
 * 按 `group` 归组，组内保持目录原始顺序。
 * 组的先后同样取目录中该组**首次出现**的位置，因此顺序由服务端模块加载序决定，
 * 前端不再另行排序——否则同一份目录在不同页面会呈现不同的组序。
 */
export function groupPermissions(
  entries: readonly PermissionCatalogEntry[],
): PermissionGroup[] {
  const order: string[] = [];
  const byGroup = new Map<string, PermissionCatalogEntry[]>();

  for (const entry of entries) {
    if (!byGroup.has(entry.group)) {
      byGroup.set(entry.group, []);
      order.push(entry.group);
    }
    byGroup.get(entry.group)!.push(entry);
  }

  return order.map((label) => ({ label, entries: byGroup.get(label)! }));
}

/** 勾选/取消单个权限，返回新数组（不修改入参）。 */
export function togglePermission(
  permissions: readonly string[],
  key: string,
): string[] {
  return permissions.includes(key)
    ? permissions.filter((p) => p !== key)
    : [...permissions, key];
}

/** 整组全选/全不选：组内已全选则移除该组，否则补齐该组。 */
export function toggleGroup(
  permissions: readonly string[],
  group: PermissionGroup,
): string[] {
  const keys = group.entries.map((e) => e.key);
  const selected = new Set(permissions);
  const allSelected = keys.every((key) => selected.has(key));

  if (allSelected) {
    return permissions.filter((p) => !keys.includes(p));
  }
  for (const key of keys) {
    selected.add(key);
  }
  // 保持原有顺序，新增的追加在后
  return [...permissions, ...keys.filter((key) => !permissions.includes(key))];
}

export type GroupSelectionState = "none" | "partial" | "all";

export function getGroupSelectionState(
  permissions: readonly string[],
  group: PermissionGroup,
): GroupSelectionState {
  const selected = new Set(permissions);
  const hit = group.entries.filter((e) => selected.has(e.key)).length;

  if (hit === 0) return "none";
  return hit === group.entries.length ? "all" : "partial";
}
