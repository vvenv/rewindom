/** Default tenant slug; login may omit `@default`. */
export const DEFAULT_TENANT_SLUG = "default";

/**
 * Fixed UUID for the default tenant (see migration 20260611120000_add_multi_tenant).
 * Phase 0 used slug placeholder `"default"`; Phase 1 uses this id in JWT / DB.
 */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
