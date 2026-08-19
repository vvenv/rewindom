/**
 * HTTPS 响应的 Strict-Transport-Security。
 *
 * 只在 origin 已是 https 时返回值——本地 `http://localhost` 不能发这颗头，
 * 否则浏览器会把后续访问也升成 https，开发直接打不开。
 */

export const HSTS_MAX_AGE_SECONDS = 31_536_000;

export const HSTS_HEADER_VALUE = `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`;

export function hstsHeaderForOrigin(origin: string): string | null {
  return origin.startsWith("https://") ? HSTS_HEADER_VALUE : null;
}
