import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  SITE_APP_PREFIXES,
  SITE_SSR_EXCEPTION_PATHS,
  SITE_SSR_PREFIX_EXCEPTIONS,
  isSiteSsrExceptionPath,
} from "../shared/site-locale.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");

function read(relative: string): string {
  return readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

/**
 * 应用区前缀在**三处**各写了一遍，必须一致：
 *
 * | 位置                                  | 作用                                   |
 * | ------------------------------------- | -------------------------------------- |
 * | `SITE_APP_PREFIXES`（`site-app-prefixes.ts`） | SSR 认出应用区路径后交回 SPA           |
 * | `docker/nginx/default.conf.template`  | 生产：这些路径直接发静态 SPA，不进 SSR |
 * | `apps/client/vite-marketing-ssr-proxy.ts` | 开发：从 `SITE_APP_PREFIXES` 生成代理白名单 |
 *
 * 任何一处漏掉一个前缀，那条路径就会落进 Marketing SSR，而 SSR 认出它属于应用区
 * 就 `callNotFound()`——访客拿到的是 404 JSON 而不是页面。`member` 加进前缀表时
 * 就漏了 nginx 那一处，会员登录页在绑定域上一直打不开。
 */
describe("SPA 前缀三处对齐", () => {
  // 只有 HTML 文档路径需要交回 SPA；这几个由各自的 location / 中间件处理
  const NOT_ROUTED_TO_SPA = new Set(["api", "assets", "health"]);

  function expectCoveredBy(routed: Set<string>): void {
    const missing = SITE_APP_PREFIXES.filter(
      (prefix) => !NOT_ROUTED_TO_SPA.has(prefix) && !routed.has(prefix),
    );
    expect(missing).toEqual([]);
  }

  it("nginx location 正则覆盖全部前缀", () => {
    const matched = /location\s+~\s+\^\/\(([^)]+)\)\(\/\|\$\)/u.exec(
      read("docker/nginx/default.conf.template"),
    );
    expect(matched).not.toBeNull();
    expectCoveredBy(new Set(matched![1]!.split("|")));
  });

  /*
   * 例外路径反过来：它们落在应用区前缀下，却**必须**打到后端 SSR。
   * 少一处的后果是登录页在那个环境下渲染成 SPA 的 404——SPA 上已经没有这两条路由了。
   */
  it("nginx 为 SSR 例外路径单开了 location", () => {
    const conf = read("docker/nginx/default.conf.template");
    const matched = /location\s+~\s+\^\/member\/\(([^)]+)\)\$/u.exec(conf);
    expect(matched).not.toBeNull();
    const covered = new Set(
      matched![1]!.split("|").map((name) => `/member/${name}`),
    );
    expect(
      SITE_SSR_EXCEPTION_PATHS.filter((path) => !covered.has(path)),
    ).toEqual([]);
    // 顺序要紧：写在应用壳层那条 location 之后就永远匹配不到
    expect(conf.indexOf("location ~ ^/member/")).toBeLessThan(
      conf.indexOf("location ~ ^/(app|"),
    );
    for (const prefix of SITE_SSR_PREFIX_EXCEPTIONS) {
      expect(conf).toContain(`location ~ ^${prefix}(/|$)`);
      expect(conf.indexOf(`location ~ ^${prefix}(/|$)`)).toBeLessThan(
        conf.indexOf("location ~ ^/(app|"),
      );
    }
  });

  it("vite dev 代理放行 SSR 例外路径", () => {
    const src = read("apps/client/vite-marketing-ssr-proxy.ts");
    expect(src).toContain("isSiteSsrExceptionPath");
    expect(src).not.toContain("SSR_EXCEPTION_PATHS");
  });

  it("vite dev 代理的 SPA_PREFIX_RE 覆盖全部前缀", () => {
    const matched = /SPA_ROUTE_PREFIXES\s*=\s*\[([\s\S]*?)\]\s*as const/u.exec(
      read("apps/client/vite-marketing-ssr-proxy.ts"),
    );
    expect(matched).not.toBeNull();
    const routed = new Set(
      [...matched![1]!.matchAll(/"([^"]+)"/gu)].map((m) => m[1]!),
    );
    expectCoveredBy(routed);
  });

  it("isSiteSsrExceptionPath 前缀匹配店面并精确匹配会员例外", () => {
    expect(isSiteSsrExceptionPath("/shop")).toBe(true);
    expect(isSiteSsrExceptionPath("/shop/mug")).toBe(true);
    expect(isSiteSsrExceptionPath("/member/orders")).toBe(true);
    expect(isSiteSsrExceptionPath("/member/oauth/callback")).toBe(false);
  });
});
