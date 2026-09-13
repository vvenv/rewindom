/**
 * 工作台 JWT TTL（秒）。与 `packages/server-kernel/.../jwt.ts` 保持同值；
 * 放 shared 是为了 cookie maxAge 常量不依赖 server-kernel。
 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
