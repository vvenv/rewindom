/**
 * 编排探针路径：进程存活（`/health`）与能否接流量（`/ready`）。
 *
 * 这些请求来自 Docker / CI / 负载均衡，没有 JWT，也不该计入慢请求或 IP 限流。
 * 被自己的封禁名单拦下会引发滚动重启。
 */
export const OPS_PROBE_PATHS = new Set(["/health", "/ready"]);

export function isOpsProbePath(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  return OPS_PROBE_PATHS.has(path);
}
