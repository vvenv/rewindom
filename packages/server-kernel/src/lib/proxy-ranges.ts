/**
 * 已知反向代理 / CDN 的出口网段。
 *
 * 两个用途：
 *
 * 1. **`trustProxy`**：站点挂在 Cloudflare 橙云后面时，到达 origin 的每一个请求，
 *    socket 对端都是 CF 边缘节点。不把这些段声明为可信代理，`request.ip` 就会
 *    停在那一跳——所有访客坍缩成几百个 CF 边缘 IP。
 * 2. **护栏**：解析出的 client IP 若落在这些段里，说明代理链配错了。这种地址
 *    绝不能进封禁名单——封一个 CF 边缘节点等于封掉它服务的一大片真实用户。
 *
 * ## 为什么这份名单必须能被覆盖
 *
 * Cloudflare 会增删网段（历史上一年内改过若干次）。硬编码的快照迟早过期，
 * 而过期的后果是静默的：新段不被信任 → 那部分流量的 client IP 又变成边缘 IP。
 * 所以 `IP_ACCESS_PROXY_RANGES` 可以补充，运维也应定期核对：
 *
 * ```
 * curl -s https://www.cloudflare.com/ips-v4
 * curl -s https://www.cloudflare.com/ips-v6
 * ```
 *
 * 刻意**不**在启动时联网拉取：一个外部 HTTP 依赖挡在进程启动路径上，
 * 换来的只是省掉一次人工核对。
 */

/** 取自 https://www.cloudflare.com/ips-v4，快照日期 2026-09-08。 */
export const CLOUDFLARE_IPV4_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
] as const;

/** 取自 https://www.cloudflare.com/ips-v6，快照日期 2026-09-08。 */
export const CLOUDFLARE_IPV6_RANGES = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
] as const;

export const CLOUDFLARE_PROXY_RANGES: readonly string[] = [
  ...CLOUDFLARE_IPV4_RANGES,
  ...CLOUDFLARE_IPV6_RANGES,
];
