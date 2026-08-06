import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SITE_APP_PREFIXES } from "../shared/site-locale.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");

/**
 * nginx 的 SPA 前缀正则必须覆盖 `SITE_APP_PREFIXES`。
 *
 * 漏一个的后果不是「少一条规则」而是**那条路径 404**：请求落进 `location /`
 * 被反代给 Marketing SSR，SSR 认出它属于应用区就 `callNotFound()`，
 * 访客拿到的是 404 JSON。`member` 加进前缀表时就漏了这一处，
 * 会员登录页在绑定域上一直打不开。
 */
describe("nginx SPA 前缀与 SITE_APP_PREFIXES 对齐", () => {
  // 只有 HTML 路径需要交回 SPA；这几个由各自的 location 处理
  const NOT_ROUTED_TO_SPA = new Set(["api", "assets", "health"]);

  it("每个应用区前缀都在 location 正则里", () => {
    const template = readFileSync(
      path.join(REPO_ROOT, "docker/nginx/default.conf.template"),
      "utf8",
    );
    const spaLocation = /location\s+~\s+\^\/\(([^)]+)\)\(\/\|\$\)/u.exec(
      template,
    );
    expect(spaLocation).not.toBeNull();

    const routed = new Set(spaLocation![1]!.split("|"));
    const missing = SITE_APP_PREFIXES.filter(
      (prefix) => !NOT_ROUTED_TO_SPA.has(prefix) && !routed.has(prefix),
    );
    expect(missing).toEqual([]);
  });
});
