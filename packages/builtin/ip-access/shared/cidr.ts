/**
 * CIDR 解析、归一化与匹配。
 *
 * 解析交给 `ipaddr.js`（proxy-addr 用的同一个库），匹配自己做——热路径上每个请求
 * 都要跑一次，不能是对整张名单的线性扫描。
 */
import ipaddr from "ipaddr.js";

/**
 * IPv6 允许的最短前缀长度（= 最大封禁粒度）。
 *
 * 家宽用户通常整段拿到一个 `/64`，换地址是零成本的，所以封 `/128` 约等于没封。
 * 自动封禁一律放大到 `/64`；手工规则允许更细，但界面要提示这基本无效。
 */
export const IPV6_MIN_BLOCK_PREFIX = 64;

export interface ParsedCidr {
  /** 归一化文本，如 `203.0.113.0/24`、`2001:db8::/32` */
  cidr: string;
  version: 4 | 6;
  /** 已把主机位清零的网络地址 */
  network: bigint;
  prefix: number;
}

const IPV4_BITS = 32;
const IPV6_BITS = 128;

function toBigInt(bytes: number[]): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

function maskFor(prefix: number, bits: number): bigint {
  if (prefix <= 0) return 0n;
  return ((1n << BigInt(prefix)) - 1n) << BigInt(bits - prefix);
}

/**
 * 解析 `1.2.3.4` / `1.2.3.0/24` / `2001:db8::/32`，裸地址按满前缀处理。
 *
 * 归一化会把主机位清零：`203.0.113.7/24` 存成 `203.0.113.0/24`。否则同一个网段
 * 能被写成 256 种字面量，去重和「这条规则是不是已经存在」都无从判断。
 */
export function parseCidr(input: string): ParsedCidr | null {
  const raw = input.trim().toLowerCase();
  if (raw === "") return null;

  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  let prefix: number;
  try {
    if (raw.includes("/")) {
      const [parsedAddr, parsedPrefix] = ipaddr.parseCIDR(raw);
      addr = parsedAddr;
      prefix = parsedPrefix;
    } else {
      addr = ipaddr.parse(raw);
      prefix = addr.kind() === "ipv4" ? IPV4_BITS : IPV6_BITS;
    }
  } catch {
    return null;
  }

  // IPv4-mapped IPv6 收敛成 IPv4，与 getClientIp 的归一化保持一致——
  // 否则 ::ffff:1.2.3.4/128 与 1.2.3.4/32 会是两条谁也匹配不上谁的规则。
  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      const v4 = v6.toIPv4Address();
      const mappedPrefix = prefix - (IPV6_BITS - IPV4_BITS);
      if (mappedPrefix < 0) return null;
      addr = v4;
      prefix = mappedPrefix;
    }
  }

  const version = addr.kind() === "ipv4" ? 4 : 6;
  const bits = version === 4 ? IPV4_BITS : IPV6_BITS;
  if (prefix < 0 || prefix > bits) return null;

  const network = toBigInt(addr.toByteArray()) & maskFor(prefix, bits);
  const canonical =
    version === 4
      ? bigIntToIpv4(network)
      : ipaddr.fromByteArray(bigIntToBytes(network, 16)).toString();

  return { cidr: `${canonical}/${prefix}`, version, network, prefix };
}

function bigIntToBytes(value: bigint, length: number): number[] {
  const bytes = new Array<number>(length);
  let rest = value;
  for (let i = length - 1; i >= 0; i -= 1) {
    bytes[i] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return bytes;
}

function bigIntToIpv4(value: bigint): string {
  return bigIntToBytes(value, 4).join(".");
}

/**
 * 把过细的 IPv6 规则放大到 `/64`。IPv4 与已经够宽的 IPv6 原样返回。
 */
export function widenToMinimumBlock(parsed: ParsedCidr): ParsedCidr {
  if (parsed.version !== 6 || parsed.prefix <= IPV6_MIN_BLOCK_PREFIX) {
    return parsed;
  }
  const widened = parseCidr(
    `${ipaddr
      .fromByteArray(bigIntToBytes(parsed.network, 16))
      .toString()}/${IPV6_MIN_BLOCK_PREFIX}`,
  );
  return widened ?? parsed;
}

/** 单个地址（非网段）解析成 bigint，供匹配用。 */
export function parseAddress(
  ip: string,
): { version: 4 | 6; value: bigint } | null {
  const parsed = parseCidr(ip);
  if (!parsed) return null;
  const bits = parsed.version === 4 ? IPV4_BITS : IPV6_BITS;
  if (parsed.prefix !== bits) return null;
  return { version: parsed.version, value: parsed.network };
}

/**
 * 按前缀长度分桶的匹配器。
 *
 * 每个不同的前缀长度一张 Map（网络地址 → 载荷）。查一个地址时，对每个出现过的
 * 前缀长度算一次 `addr & mask` 再查表——复杂度是「名单里有几种不同的掩码」，
 * 通常不到十次，与名单条数无关。整张名单线性扫在每请求的热路径上不可接受。
 */
export class CidrMatcher<T> {
  /** version → prefix → network → payloads */
  private readonly buckets = new Map<4 | 6, Map<number, Map<bigint, T[]>>>();

  add(parsed: ParsedCidr, payload: T): void {
    let byPrefix = this.buckets.get(parsed.version);
    if (!byPrefix) {
      byPrefix = new Map();
      this.buckets.set(parsed.version, byPrefix);
    }
    let byNetwork = byPrefix.get(parsed.prefix);
    if (!byNetwork) {
      byNetwork = new Map();
      byPrefix.set(parsed.prefix, byNetwork);
    }
    const existing = byNetwork.get(parsed.network);
    if (existing) {
      existing.push(payload);
    } else {
      byNetwork.set(parsed.network, [payload]);
    }
  }

  /** 返回所有覆盖该地址的载荷；无命中返回空数组。 */
  match(version: 4 | 6, value: bigint): T[] {
    const byPrefix = this.buckets.get(version);
    if (!byPrefix) return [];
    const bits = version === 4 ? IPV4_BITS : IPV6_BITS;
    const hits: T[] = [];
    for (const [prefix, byNetwork] of byPrefix) {
      const found = byNetwork.get(value & maskFor(prefix, bits));
      if (found) hits.push(...found);
    }
    return hits;
  }

  get size(): number {
    let total = 0;
    for (const byPrefix of this.buckets.values()) {
      for (const byNetwork of byPrefix.values()) {
        for (const payloads of byNetwork.values()) {
          total += payloads.length;
        }
      }
    }
    return total;
  }
}
