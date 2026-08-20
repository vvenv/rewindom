/**
 * Product-domain tenant slug; login may omit `@{slug}`.
 * Host binding uses {@link DEFAULT_TENANT_ID}, not the slug string.
 */
export const DEFAULT_TENANT_SLUG = "rewindom";

/**
 * Fixed UUID for the default tenant (see migration 20260611120000_add_multi_tenant).
 * Phase 0 used slug placeholder `"default"`; Phase 1 uses this id in JWT / DB.
 * Slug was later renamed to {@link DEFAULT_TENANT_SLUG} (`rewindom`).
 */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/** Legacy slug kept in reserved lists so nobody re-registers it. */
export const LEGACY_DEFAULT_TENANT_SLUG = "default";
