import { pinyin } from "pinyin-pro";

/** Synthetic user id for platform admin JWT / audit (bootstrap system admin). */
export const PLATFORM_ADMIN_USER_ID =
  "00000000-0000-0000-0000-000000000000";

export const RESERVED_TENANT_SLUGS = [
  "default",
  "platform",
  "admin",
  "api",
  "www",
] as const;

const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export class InvalidTenantSlugError extends Error {
  constructor(message = "租户标识格式无效") {
    super(message);
    this.name = "InvalidTenantSlugError";
  }
}

export class ReservedTenantSlugError extends Error {
  constructor(message = "该租户标识为系统保留，不可使用") {
    super(message);
    this.name = "ReservedTenantSlugError";
  }
}

export function normalizeTenantSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function assertValidTenantSlug(slug: string): string {
  const normalized = normalizeTenantSlug(slug);
  if (normalized.length < 2 || normalized.length > 63) {
    throw new InvalidTenantSlugError("租户标识长度应为 2–63 个字符");
  }
  if (!TENANT_SLUG_PATTERN.test(normalized)) {
    throw new InvalidTenantSlugError(
      "租户标识仅允许小写字母、数字和连字符，且不能以连字符开头或结尾",
    );
  }
  if (
    (RESERVED_TENANT_SLUGS as readonly string[]).includes(normalized)
  ) {
    throw new ReservedTenantSlugError();
  }
  return normalized;
}

/** Suggest a tenant slug from organization name (frontend prefill; server does not auto-generate). */
export function generateTenantSlugFromName(name: string): string {
  let slug = pinyin(name.trim(), {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  })
    .join(" ")
    .toLowerCase();

  slug = slug.replace(/[^a-z0-9_-]/g, "-");
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-|-$/g, "");

  if (slug.length === 0 || /^\d+$/.test(slug)) {
    slug = `t-${slug}`;
  }

  return slug.slice(0, 63);
}
