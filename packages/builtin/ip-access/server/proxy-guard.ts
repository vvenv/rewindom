/**
 * 代理链错配护栏。
 *
 * ## 它防的是什么
 *
 * 自定义域名的流程是「客户配 DNS」。任何一个租户都能把自己的域名挂到**他自己的**
 * Cloudflare 账号下、开橙云、回源指向本站——不需要通知平台，平台也拦不住。
 *
 * 那一刻起，这个域名上所有请求到达 origin 时，socket 对端都是 CF 边缘节点。
 * 若 `TRUSTED_PROXIES` 不含 CF 段，`request.ip` 就停在那一跳，于是：
 *
 * - 该域名上十个人各输错一次密码 → 计数全落在同一个边缘 IP 上 → 触发自动封禁
 * - 那条规则写进**平台全局**名单，而那个边缘 IP 服务着 Cloudflare 的一大片流量
 *
 * 一次配置疏忽就能把封禁系统变成打击无辜用户的放大器。
 *
 * ## 为什么是护栏而不是「配对就行了」
 *
 * 「把 CF 段加进 TRUSTED_PROXIES」能修好当下，但修不了下一次：CF 会增删网段、
 * 租户会换用别的 CDN、云 LB 也会换出口。护栏不依赖名单是否最新——它只问一句
 * 「这个地址看起来像基础设施吗」，像就拒绝自动封禁并告警。
 */
import { getRedisClient } from "@rewindom/server-kernel/infra/redis.service.js";
import { normalizeIp } from "@rewindom/server-kernel/lib/client-ip.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { createModuleLogger } from "@rewindom/server-kernel/lib/logger.js";
import { CLOUDFLARE_PROXY_RANGES } from "@rewindom/server-kernel/lib/proxy-ranges.js";

import { CidrMatcher, parseAddress, parseCidr } from "../shared/index.js";

/** CDN 回源时声明「这才是访客」的头。CF 橙云用前者，部分企业套餐还有后者。 */
const VISITOR_IP_HEADERS = ["cf-connecting-ip", "true-client-ip"] as const;

const log = createModuleLogger("ip-access");

let matcher: CidrMatcher<string> | null = null;

/**
 * proxy-addr 预置名展开成实际网段，好让配置里写关键字时护栏也能覆盖。
 *
 * **`loopback` 刻意不在其中。** 回环不是「挡在访客前面的一跳」，它就是本机；
 * 本地开发时 `127.0.0.1` 是货真价实的 client IP，把它算成代理会让每次 dev 启动
 * 都报一条假告警，还会拦掉「封掉自己来验证规则」这种正当操作。
 */
const PRESET_RANGES: Record<string, readonly string[]> = {
  loopback: [],
  linklocal: ["169.254.0.0/16", "fe80::/10"],
  uniquelocal: [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "fc00::/7",
  ],
};

/** 回环永远不算代理，无论它是怎么被配进来的。 */
const NEVER_PROXY = ["127.0.0.0/8", "::1/128"];

/** 把 `TRUSTED_PROXIES` 的取值摊平成 CIDR 列表；跳数模式没有网段可言，返回空。 */
function configuredTrustedRanges(): string[] {
  const value = config.server.trustedProxies;
  if (typeof value === "number") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => PRESET_RANGES[entry.toLowerCase()] ?? [entry])
    .filter((entry) => !NEVER_PROXY.includes(entry));
}

function getMatcher(): CidrMatcher<string> {
  if (matcher) return matcher;
  const next = new CidrMatcher<string>();
  const sources = [
    // Cloudflare 段无条件纳入。即使本部署没开 CLOUDFLARE_PROXY，租户也可能
    // 自己把域名挂到 CF 后面——护栏要在那一刻就生效，而不是等运维发现。
    ...CLOUDFLARE_PROXY_RANGES,
    ...config.ipAccess.extraProxyRanges,
    ...configuredTrustedRanges(),
  ];
  for (const raw of sources) {
    const parsed = parseCidr(raw);
    if (!parsed) {
      log.warn({ entry: raw }, "代理段条目不是合法 CIDR，已跳过");
      continue;
    }
    next.add(parsed, parsed.cidr);
  }
  matcher = next;
  return next;
}

/**
 * 该地址是否落在已知代理 / CDN 出口段里。
 *
 * 返回命中的网段而不是 boolean：告警时说得出「像什么」，运维才知道该去改哪一段配置。
 */
export function matchProxyRange(ip: string): string | null {
  const addr = parseAddress(ip);
  if (!addr) return null;
  return getMatcher().match(addr.version, addr.value)[0] ?? null;
}

export function isKnownProxyIp(ip: string): boolean {
  return matchProxyRange(ip) !== null;
}

function headerFirstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 读 CDN 声明的访客 IP。没有这颗头就谈不上「少信了一跳」。
 *
 * 刻意不读 `X-Forwarded-For`：客户端能随便填，nginx 只是在末尾追加真实对端。
 * 用 XFF 长度当证据，等于让扫描器加一行头就能拉响平台告警。
 */
export function readClaimedVisitorIp(
  headers: Record<string, string | string[] | undefined> | undefined,
): string | null {
  if (!headers) return null;
  for (const name of VISITOR_IP_HEADERS) {
    const ip = normalizeIp(headerFirstValue(headers[name]));
    if (ip) return ip;
  }
  return null;
}

/**
 * 是不是「前面有一跳 CDN，我们没拆开」。
 *
 * `request.ip` 落在代理段有两种完全不同的含义：
 *
 * 1. **真·代理链错配**：橙云 / 同类 CDN 回源，头里带着真正的访客 IP，但
 *    `TRUSTED_PROXIES` 没覆盖那一跳，解析停在边缘节点。
 * 2. **对端自己就在该网段**：Cloudflare Workers 出站、扫 WordPress 的机器人、
 *    WARP 出口。这是货真价实的 client IP，开 `CLOUDFLARE_PROXY` 反而让它们
 *    能借可信跳伪造 XFF。
 *
 * 自动封禁两种都要拒（封边缘 IP 会误伤一大片人）。平台红告警只该在 1。
 */
export function isUnwrappedProxyHop(
  ip: string,
  headers?: Record<string, string | string[] | undefined>,
): boolean {
  if (!matchProxyRange(ip)) return false;
  const visitor = readClaimedVisitorIp(headers);
  return visitor !== null && visitor !== ip;
}

/** 仅供测试：配置变了要重建。 */
export function resetProxyGuardForTest(): void {
  matcher = null;
}

const MISCONFIG_KEY = "ip-access:proxy-misconfig";
/** 保留一天：够运维隔天上班时还看得见，又不会长期挂着一条陈年告警 */
const MISCONFIG_TTL_SECONDS = 24 * 60 * 60;

/**
 * 记一次「client IP 看起来像代理」。
 *
 * 只写日志是不够的——**没人会盯着日志**。计到 Redis 里，平台首页据此挂一条
 * 红色告警，那才是运维真会看到的地方。
 */
export function recordProxyMisconfig(range: string): void {
  void (async () => {
    try {
      const redis = getRedisClient();
      await redis
        .pipeline()
        .hincrby(MISCONFIG_KEY, "count", 1)
        .hset(MISCONFIG_KEY, "range", range, "at", new Date().toISOString())
        .expire(MISCONFIG_KEY, MISCONFIG_TTL_SECONDS)
        .exec();
    } catch {
      // 告警计数本身失败时，日志那条还在
    }
  })();
}

export interface ProxyMisconfigStatus {
  count: number;
  /** 最近一次命中的网段，告诉运维「像什么」，才知道该改哪段配置 */
  range: string | null;
  at: string | null;
}

export async function getProxyMisconfigStatus(): Promise<ProxyMisconfigStatus> {
  try {
    const raw = await getRedisClient().hgetall(MISCONFIG_KEY);
    const count = Number(raw?.count ?? 0);
    return {
      count: Number.isFinite(count) ? count : 0,
      range: raw?.range ?? null,
      at: raw?.at ?? null,
    };
  } catch {
    return { count: 0, range: null, at: null };
  }
}
