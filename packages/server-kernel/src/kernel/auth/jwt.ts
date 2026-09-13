/**
 * JWT 签发策略的单一真相源。
 *
 * ## 为什么不让调用方自己 `app.jwt.sign`
 *
 * 曾经就是这么做的：`app.register(jwt, { secret })` 之外不给任何选项，
 * 十几个调用点各自 `app.jwt.sign.bind(app.jwt)`。`@fastify/jwt` 在没有
 * `expiresIn` 时**不会**写入 `exp` 声明——于是签出来的每一个 access / refresh
 * token 都永不过期。refresh 在库里还有一行记录可以吊销，access 则完全没有：
 * 泄露一次就是永久有效，改密码和登出都追不回来。
 *
 * 所以签发这件事只留一个入口：TTL 由 payload 的 `type` 决定，调用方无从绕过。
 *
 * ## 为什么 verify 要求 `exp`
 *
 * 只在签发侧补 `expiresIn`，存量的无 `exp` token 仍然永久有效——那批恰恰是
 * 最该失效的。`requiredClaims: ["exp"]` 让它们在验签阶段直接不合法，
 * 代价是这次发布后所有人重新登录一次。
 *
 * 租户 API Key 不受影响：它不是 JWT，验签失败后由 `auth.middleware` 的
 * `isApiKeyToken` 分支接住。
 */
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@rewindom/shared";
import fastifyJwt from "@fastify/jwt";

import type { JwtSignPayload } from "./auth.service.js";
import type { FastifyInstance } from "fastify";

export { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS };

/** 2FA 挑战令牌存活时间（秒）。 */
export const TWO_FACTOR_CHALLENGE_TTL_SECONDS = 5 * 60;

/** 从现在起算的 refresh token 过期时刻，供写库用。 */
export function refreshTokenExpiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

function ttlForJwtType(type: string): number {
  if (type === "refresh") return REFRESH_TOKEN_TTL_SECONDS;
  if (type === "2fa_challenge") return TWO_FACTOR_CHALLENGE_TTL_SECONDS;
  return ACCESS_TOKEN_TTL_SECONDS;
}

/**
 * 注册 `@fastify/jwt`。组装层与测试夹具都走这里，
 * 否则测试签出来的 token 会比生产宽松，验签策略等于没被测过。
 */
export async function registerJwt(
  app: FastifyInstance,
  secret: string,
): Promise<void> {
  await app.register(fastifyJwt, {
    secret,
    // 兜底：任何没走 createJwtSigner 的签发也拿不到永久 token。
    sign: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    verify: { requiredClaims: ["exp"] },
  });
}

/**
 * 按 payload 的 `type` 选 TTL 的签发函数，形状与既有的 `JwtSignFn` 一致，
 * 调用点只需把 `app.jwt.sign.bind(app.jwt)` 换成 `createJwtSigner(app)`。
 */
export function createJwtSigner(
  app: FastifyInstance,
): (payload: JwtSignPayload) => string {
  return (payload: JwtSignPayload): string =>
    app.jwt.sign(payload, {
      expiresIn: ttlForJwtType(payload.type),
    });
}
