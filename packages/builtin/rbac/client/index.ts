export { rbacClientModule } from "./module.js";
export { PERMISSIONS_QUERY_KEY } from "./shell/rbac-permission-provider.js";
export {
  usePermissionCatalog,
  type PermissionCatalogResponse,
} from "./hooks/usePermissionCatalog.js";
export { useRoles, ROLES_KEY } from "./hooks/useRoles.js";
export {
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from "./hooks/useRoleMutations.js";
export { RBAC_NAV_SECTIONS } from "./shell/rbac-nav.js";
