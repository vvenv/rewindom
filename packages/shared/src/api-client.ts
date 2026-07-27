/** API Key 认证角色（第三方集成，非人类用户） */
export const API_CLIENT_ROLE = "API_CLIENT" as const;

/** API Key 可调用的权限子集 */
export const API_CLIENT_PERMISSIONS = [
  "documents.read",
  "documents.write",
  "products.read",
  "products.write",
  "analyses.read",
  "analyses.write",
] as const;

export const API_KEY_PREFIX = "rga_";

export function isApiKeyToken(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

const API_KEY_BLOCKED_PREFIXES = [
  "/api/settings",
  "/api/users",
  "/api/platform",
  "/api/auth",
] as const;

export function isApiKeyBlockedPath(path: string): boolean {
  return API_KEY_BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
