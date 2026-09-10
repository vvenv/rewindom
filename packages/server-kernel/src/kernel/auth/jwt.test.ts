import { createHmac } from "node:crypto";

import Fastify, { type FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  createJwtSigner,
  refreshTokenExpiryDate,
  REFRESH_TOKEN_TTL_SECONDS,
  registerJwt,
} from "./jwt.js";

import type { JwtSignPayload } from "./auth.service.js";

const SECRET = "test-secret";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerJwt(app, SECRET);
  await app.ready();
  return app;
}

/** 手工签一个没有 `exp` 的 token——正是这次修复之前签发的那种。 */
function signWithoutExp(payload: Record<string, unknown>): string {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}`;
  const signature = createHmac("sha256", SECRET)
    .update(head)
    .digest("base64url");
  return `${head}.${signature}`;
}

const basePayload: JwtSignPayload = {
  userId: "user-1",
  actor_type: "user",
  is_system_admin: false,
  type: "access",
};

describe("jwt 签发策略", () => {
  it("access token 带 exp，且是 15 分钟", async () => {
    const app = await buildApp();
    const decoded = app.jwt.verify<{ exp: number; iat: number }>(
      createJwtSigner(app)(basePayload),
    );

    expect(decoded.exp - decoded.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
    await app.close();
  });

  it("refresh token 走 7 天那一档", async () => {
    const app = await buildApp();
    const decoded = app.jwt.verify<{ exp: number; iat: number }>(
      createJwtSigner(app)({ ...basePayload, type: "refresh" }),
    );

    expect(decoded.exp - decoded.iat).toBe(REFRESH_TOKEN_TTL_SECONDS);
    await app.close();
  });

  it("没走 createJwtSigner 的裸 sign 也拿不到永久 token", async () => {
    const app = await buildApp();
    const decoded = app.jwt.verify<{ exp?: number }>(app.jwt.sign(basePayload));

    expect(decoded.exp).toBeDefined();
    await app.close();
  });

  it("无 exp 的存量 token 验签失败", async () => {
    const app = await buildApp();
    const legacy = signWithoutExp({ ...basePayload, iat: 1_700_000_000 });

    expect(() => app.jwt.verify(legacy)).toThrow();
    await app.close();
  });

  it("过期的 token 验签失败", async () => {
    const app = await buildApp();
    const expired = app.jwt.sign(basePayload, { expiresIn: -1 });

    expect(() => app.jwt.verify(expired)).toThrow();
    await app.close();
  });

  it("库里的 refresh 过期时刻与 JWT 同一档，不会一边还活着一边已作废", () => {
    const drift = Math.abs(
      refreshTokenExpiryDate().getTime() -
        (Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    );

    expect(drift).toBeLessThan(1000);
  });
});
