/**
 * Marketing SSR 的 catch-all 必须接得住「旧链接的真实形态」。
 *
 * 以前按段数挂三条参数路由：末尾斜杠和超过三段的地址进不了 renderPath，
 * 重定向规则再正确也没机会跑。这里只测路由是否到达，不把整站 SSR 拉起来。
 */

import Fastify from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  isSpaShellPath,
  parseMarketingSsrPath,
} from "../shared/site-locale.js";

const seen: Array<{ logicalPath: string; locale: string | null }> = [];
const app = Fastify({ logger: false });

app.get("/", async () => {
  seen.push({ logicalPath: "/", locale: null });
  return { ok: true };
});

app.get("/*", async (request, reply) => {
  const parsed = parseMarketingSsrPath(request.url);
  if (isSpaShellPath(parsed.logicalPath)) {
    return reply.callNotFound();
  }
  seen.push(parsed);
  return { ok: true };
});

beforeAll(async () => {
  await app.ready();
});

afterEach(() => {
  seen.length = 0;
});

afterAll(async () => {
  await app.close();
});

describe("marketing SSR catch-all", () => {
  it("末尾斜杠、语言前缀、超过三段的路径都走进同一条解析", async () => {
    await app.inject({ method: "GET", url: "/old/" });
    await app.inject({ method: "GET", url: "/en/old" });
    await app.inject({ method: "GET", url: "/en/docs/guide/intro" });
    await app.inject({ method: "GET", url: "/a/b/c/d" });

    expect(seen).toEqual([
      { logicalPath: "/old", locale: null },
      { logicalPath: "/old", locale: "en" },
      { logicalPath: "/docs/guide/intro", locale: "en" },
      { logicalPath: "/a/b/c/d", locale: null },
    ]);
  });

  it("应用区路径不进官网渲染", async () => {
    const res = await app.inject({ method: "GET", url: "/app/dashboard" });
    expect(res.statusCode).toBe(404);
    expect(seen).toEqual([]);
  });
});
