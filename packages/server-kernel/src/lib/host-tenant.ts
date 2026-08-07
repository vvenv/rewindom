import { DEFAULT_TENANT_ID } from "@be-water/shared";

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

function addWwwVariant(hosts: Set<string>, host: string): void {
  hosts.add(host);
  // 只给真实域名补 www.；跳过 localhost / 纯 IP
  if (
    host === "localhost" ||
    host.startsWith("www.") ||
    !host.includes(".") ||
    /^[\d.]+$/u.test(host) ||
    host.includes(":")
  ) {
    return;
  }
  hosts.add(`www.${host}`);
}

/**
 * 平台控制台 Host：不绑定任何租户，允许 `/platform` 与平台管理员 API。
 * 本地默认 `PLATFORM_URL=http://127.0.0.1:7300` → 认 `127.0.0.1`。
 */
export function getPlatformConsoleHostnames(): Set<string> {
  const hosts = new Set<string>();
  const platformHost = hostnameFromUrl(config.platform.url);
  if (platformHost) addWwwVariant(hosts, platformHost);
  return hosts;
}

/**
 * 产品站 / 默认租户 Host：隐式绑定 `DEFAULT_TENANT_ID`（不写 custom_domain）。
 * 本地默认 `FRONTEND_URL=http://localhost:7300` → 认 `localhost`。
 */
export function getDefaultTenantHostnames(): Set<string> {
  const hosts = new Set<string>();
  const frontendHost = hostnameFromUrl(config.frontend.url);
  if (frontendHost) addWwwVariant(hosts, frontendHost);
  return hosts;
}

/** 不可绑定为租户自定义域的主机名。 */
export function getReservedHostnames(): Set<string> {
  return new Set([
    ...getPlatformConsoleHostnames(),
    ...getDefaultTenantHostnames(),
  ]);
}

/** 平台通配子域基域（如 `moms.plus`）；空则关闭 slug 子域解析。 */
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
 * - 禁止产品主域、平台控制台 Host 与通配子域（`*.TENANT_BASE_DOMAIN`）
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
  if (getReservedHostnames().has(host)) {
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

async function resolveDefaultTenantHost(): Promise<HostTenantContext | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: DEFAULT_TENANT_ID },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });
  if (!tenant || tenant.status !== "active") return null;
  return toHostTenantContext(tenant);
}

/**
 * Host → 租户的短 TTL 缓存。
 *
 * auth 中间件对**每个** `/api` 请求都会解析一次 Host，未命中控制台域时要查库。
 * 那是全站最热的路径，等于给每个 API 调用附赠一次数据库往返。
 *
 * 30 秒 TTL：域名绑定改动后最迟 30 秒生效，改绑定的写路径还会显式清缓存
 *（见 `invalidateHostTenantCache`），所以正常操作是立即生效的；TTL 只是兜底
 * 多进程部署下另一个实例的缓存。
 */
const HOST_TENANT_CACHE_TTL_MS = 30_000;
/** 上限防止随手伪造的 Host 头把内存撑爆（每条只是三个短字符串）。 */
const HOST_TENANT_CACHE_MAX = 512;

interface HostTenantCacheEntry {
  value: HostTenantContext | null;
  expiresAt: number;
}

const hostTenantCache = new Map<string, HostTenantCacheEntry>();

/**
 * 清空 Host → 租户缓存。
 *
 * 改动 `custom_domain` / `slug` / `status` 的写路径必须调用它，否则最长 30 秒内
 * 旧绑定仍然生效（新绑的域名 404、刚归档的租户还能访问）。
 */
export function invalidateHostTenantCache(): void {
  hostTenantCache.clear();
}

function readHostTenantCache(hostname: string): HostTenantCacheEntry | null {
  const hit = hostTenantCache.get(hostname);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    hostTenantCache.delete(hostname);
    return null;
  }
  return hit;
}

function writeHostTenantCache(
  hostname: string,
  value: HostTenantContext | null,
): void {
  // 满了就整批丢弃：Host 数量本就有限，走到这里基本是被灌垃圾 Host，
  // 与其维护 LRU 不如直接重来一轮
  if (hostTenantCache.size >= HOST_TENANT_CACHE_MAX) {
    hostTenantCache.clear();
  }
  hostTenantCache.set(hostname, {
    value,
    expiresAt: Date.now() + HOST_TENANT_CACHE_TTL_MS,
  });
}

/**
 * 按 Host 查找已绑定且 active 的租户。
 * - 平台控制台 Host → null
 * - 产品主域 / localhost → 默认租户
 * - custom_domain / `{slug}.{TENANT_BASE_DOMAIN}` → 对应租户
 *
 * 结果按 Host 缓存（测试态不缓存，免得同一文件里换了 prisma mock 还读到旧值）。
 */
export async function resolveHostTenant(
  hostname: string | null,
): Promise<HostTenantContext | null> {
  if (!hostname) return null;
  if (getPlatformConsoleHostnames().has(hostname)) return null;

  /*
   * 只在**确知不是测试**时才缓存。
   *
   * 反过来写（`!config.server.isTest`）会有两个坑：配置里缺 `server` 段直接抛
   *（仓库里有好几份手写的 config mock，少一段就是全线 500）；而拿不准时默认开缓存
   * 又会让同一个测试文件里换了 prisma mock 还读到上一次的结果。
   * 生产配置的 `isTest` 恒为 `false`，正常路径不受影响。
   */
  const cacheable = config.server?.isTest === false;
  if (cacheable) {
    const hit = readHostTenantCache(hostname);
    if (hit) return hit.value;
  }

  const resolved = await lookupHostTenant(hostname);
  if (cacheable) {
    writeHostTenantCache(hostname, resolved);
  }
  return resolved;
}

async function lookupHostTenant(
  hostname: string,
): Promise<HostTenantContext | null> {
  if (getDefaultTenantHostnames().has(hostname)) {
    return resolveDefaultTenantHost();
  }

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
