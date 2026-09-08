/**
 * 访问来源条的宽度。下限 4%，避免请求量很小的行看起来像「没有」。
 */
export function trafficBarPercent(
  requests: number,
  maxRequests: number,
): number {
  if (maxRequests <= 0 || requests <= 0) return 0;
  return Math.min(100, Math.max(4, Math.round((requests / maxRequests) * 100)));
}
