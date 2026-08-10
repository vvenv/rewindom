import { Children, isValidElement, type ReactNode } from "react";

import { describe, expect, it } from "vitest";

import { getAppNavItems } from "./app-nav";
import { collectAppRouteTrees } from "./collect-modules";
import { ENABLED_CLIENT_MODULES } from "./enabled-modules";

/**
 * 侧栏每一项都必须真的有一条路由接得住。
 *
 * 这类不一致 typecheck 与普通单测都发现不了——nav 里的 `path` 只是个字符串，
 * 点下去才 404。租户路由整体迁到 `/app/*` 时就漏了两处：`rbac` / `user` 的
 * `client/tenant/routes.tsx`（它们挂在 superUser 树上），
 * 批量改动没覆盖到，于是 nav 指向 `/app/roles` 而路由还停在 `/roles`，
 * 侧栏那两个入口直接点不开。
 *
 * 直接遍历模块交出来的 `<Route>` 元素树，而不是拿正则扫源码：路由树才是运行时
 * 真正生效的东西，正则会漏掉任何非字面量写法。
 */
function collectRoutePaths(node: ReactNode, out: Set<string>): void {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    const props = child.props as { path?: unknown; children?: ReactNode };
    if (typeof props.path === "string") {
      out.add(props.path);
    }
    if (props.children) {
      collectRoutePaths(props.children, out);
    }
  }
}

function declaredRoutePaths(): Set<string> {
  const trees = collectAppRouteTrees(ENABLED_CLIENT_MODULES);
  const paths = new Set<string>();
  for (const tree of Object.values(trees)) {
    collectRoutePaths(tree, paths);
  }
  return paths;
}

/** `/app/site/pages/:pageId` 这类带参数的路由，按静态前缀匹配。 */
function isCoveredBy(navPath: string, routePaths: Set<string>): boolean {
  if (routePaths.has(navPath)) return true;
  for (const route of routePaths) {
    if (!route.includes(":") && !route.includes("*")) continue;
    const prefix = route.split(/[:*]/u)[0]!.replace(/\/$/u, "");
    if (prefix && navPath.startsWith(prefix)) return true;
  }
  return false;
}

describe("侧栏导航与路由对齐", () => {
  it("每个 nav path 都有对应的 <Route>", () => {
    const routes = declaredRoutePaths();
    // 先确认真的扫到了路由，否则下面的断言会因为空集合而假通过
    expect(routes.size).toBeGreaterThan(5);

    const orphans = getAppNavItems()
      .map((item) => item.path)
      .filter((navPath) => !isCoveredBy(navPath, routes));

    expect(orphans).toEqual([]);
  });

  // 租户工作台入口一律在 /app 之下（见 AGENTS.md「租户路由一律挂在 /app/*」）
  it("租户 nav 一律指向 /app/* 或 /platform/*", () => {
    const stray = getAppNavItems()
      .map((item) => item.path)
      .filter((p) => !p.startsWith("/app/") && !p.startsWith("/platform/"));

    expect(stray).toEqual([]);
  });
});
