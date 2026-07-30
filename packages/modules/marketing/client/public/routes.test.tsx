import { Children, isValidElement, type ReactElement } from "react";

import { describe, expect, it } from "vitest";

import { DOC_PAGES } from "../lib/docs.js";
import { MARKETING_ROUTES } from "../lib/seo-routes.js";

import {
  MARKETING_STATIC_PATHS,
  renderMarketingPublicRoutes,
} from "./routes.js";

/** 从路由树里取出声明的 path，用来和 SEO 路由表做交叉校验。 */
function declaredPaths(): string[] {
  const tree = renderMarketingPublicRoutes() as ReactElement<{
    children?: unknown;
  }>;

  return Children.toArray(tree.props.children)
    .filter(isValidElement<{ path?: string }>)
    .map((route) => route.props.path)
    .filter((path): path is string => typeof path === "string");
}

describe("renderMarketingPublicRoutes", () => {
  it("declares the landing, pricing and docs routes", () => {
    expect(declaredPaths()).toEqual(["/", "/pricing", "/docs", "/docs/:slug"]);
  });

  it("keeps MARKETING_STATIC_PATHS in sync with the static routes", () => {
    const staticRoutes = declaredPaths().filter((path) => !path.includes(":"));

    expect([...MARKETING_STATIC_PATHS]).toEqual(staticRoutes);
  });

  it("prerenders every route it declares", () => {
    // 动态段 `/docs/:slug` 由 DOC_PAGES 展开，其余是静态路径
    const expected = [
      ...MARKETING_STATIC_PATHS,
      ...DOC_PAGES.map((page) => page.path),
    ].sort();

    expect(MARKETING_ROUTES.map((route) => route.path).sort()).toEqual(
      expected,
    );
  });
});
