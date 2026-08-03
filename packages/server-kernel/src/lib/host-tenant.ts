import { ValidationError } from "./app-errors.js";
import { config } from "./config.js";
import { prisma } from "./prisma.js";

export interface HostTenantContext {
  tenant_id: string;
  tenant_slug: string;
  name: string;
}

/** Hostname：标签用字母数字与连字符，总长 ≤253，至少含一个点（或 localhost）。 */
const HOSTNAME_RE =
  /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/u;

/** 通配基域下不映射为租户的前缀（即便库里碰巧有同名 slug 也不走 Host 绑定）。 */
const RESERVED_SUBDOMAIN_LABELS = new Set([
  "www",
  "app",
  "api",
  "platform",
  "admin",
  "mail",
  "status",
  "cdn",
  "static",
  "assets",
]);

/**
 * 从请求头取出 hostname（小写，无 port）。
 * 优先 `x-forwarded-host`（反代），再 `host`。
 */
export function resolveRequestHostname(headers: {
  host?: string | string[];
  "x-forwarded-host"?: string | string[];
}): string | null {
  const raw = headers["x-forwarded-host"] ?? headers.host;
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(",")[0]?.trim();
  if (!first) return null;
  // 去掉端口（IPv6 `[::1]:7300` 或 `example.com:443`）
  const withoutBrackets = first.replace(/^\[([^\]]+)\](?::\d+)?$/u, "$1");
  const host =
    withoutBrackets.includes(":") && !withoutBrackets.includes("::")
      ? withoutBrackets.replace(/:\d+$/u, "")
      : withoutBrackets;
  const normalized = host.trim().toLowerCase().replace(/\.$/u, "");
  return normalized.length > 0 ? normalized : null;
}

/** 从 URL 字符串解析 hostname；非法则 null。 */
export function hostnameFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return parsed.hostname.toLowerCase().replace(/\.$/u, "") || null;
  } catch {
    return null;
  }
}

/** 平台主域名（FRONTEND_URL 等），这些 Host 不走租户绑定。 */
export function getPlatformHostnames(): Set<string> {
  const hosts = new Set<string>();
  const frontendHost = hostnameFromUrl(config.frontend.url);
  if (frontendHost) hosts.add(frontendHost);
  // 本地开发常见
  hosts.add("localhost");
  hosts.add("127.0.0.1");
  return hosts;
}

/** 平台通配子域基域（如 `water.moms.plus`）；空则关闭 slug 子域解析。 */
export function getTenantBaseDomain(): string | null {
  const raw = config.tenant.baseDomain.trim().toLowerCase().replace(/\.$/u, "");
  return raw.length > 0 ? raw : null;
}

/**
 * 若 hostname 为 `{label}.{base}`，返回单标签 label；否则 null。
 * 不接受多级（`a.b.base`）与基域本身。
 */
export function extractTenantSubdomainLabel(
  hostname: string,
  baseDomain: string,
): string | null {
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const label = hostname.slice(0, -suffix.length);
  if (!label || label.includes(".")) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)) return null;
  if (RESERVED_SUBDOMAIN_LABELS.has(label)) return null;
  return label;
}

/** 租户默认访问 URL（平台通配子域）；未配置基域时返回 null。 */
export function buildTenantDefaultUrl(slug: string): string | null {
  const base = getTenantBaseDomain();
  if (!base) return null;
  return `https://${slug}.${base}`;
}

/**
 * 规范化并校验自定义域名。
 * - 空 / null → null（清除绑定）
 * - 禁止 scheme、path、port、通配符
 * - 禁止平台主域名与平台通配子域（`*.TENANT_BASE_DOMAIN`）
 */
export function normalizeCustomDomain(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/[/:?#\\*]/.test(trimmed) || trimmed.includes("://")) {
    throw new ValidationError("tenant.domain_invalid");
  }
  const host = resolveRequestHostname({ host: trimmed });
  if (!host || host.length > 253 || !HOSTNAME_RE.test(host)) {
    throw new ValidationError("tenant.domain_invalid");
  }
  if (getPlatformHostnames().has(host)) {
    throw new ValidationError("tenant.domain_reserved");
  }
  const base = getTenantBaseDomain();
  if (base && (host === base || host.endsWith(`.${base}`))) {
    throw new ValidationError("tenant.domain_reserved");
  }
  return host;
}

async function toHostTenantContext(tenant: {
  id: string;
  slug: string;
  name: string;
}): Promise<HostTenantContext> {
  return {
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    name: tenant.name,
  };
}

/** 按 Host 查找已绑定且 active 的租户；平台主域名或未绑定返回 null。 */
export async function resolveHostTenant(
  hostname: string | null,
): Promise<HostTenantContext | null> {
  if (!hostname) return null;
  if (getPlatformHostnames().has(hostname)) return null;

  const byCustomDomain = await prisma.tenant.findFirst({
    where: {
      custom_domain: hostname,
      status: "active",
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
  if (byCustomDomain) {
    return toHostTenantContext(byCustomDomain);
  }

  const base = getTenantBaseDomain();
  if (!base) return null;

  const label = extractTenantSubdomainLabel(hostname, base);
  if (!label) return null;

  const bySlug = await prisma.tenant.findFirst({
    where: {
      slug: label,
      status: "active",
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
  if (!bySlug) return null;
  return toHostTenantContext(bySlug);
}
