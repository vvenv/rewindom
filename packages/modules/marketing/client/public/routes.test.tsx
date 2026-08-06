import { describe, expect, it } from "vitest";

import { renderMarketingPublicRoutes } from "./routes.js";

describe("renderMarketingPublicRoutes", () => {
  it("只挂 CMS 公开路由（无硬编码 Landing/Pricing/Docs）", () => {
    const tree = renderMarketingPublicRoutes();
    const paths = collectPaths(tree);
    expect(paths).toEqual(["/", "/:slug", "/:slug/*"]);
  });
});

function collectPaths(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const el = node as {
    props?: { path?: string; children?: unknown };
    type?: unknown;
  };
  const out: string[] = [];
  if (typeof el.props?.path === "string") {
    out.push(el.props.path);
  }
  const children = el.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      out.push(...collectPaths(child));
    }
  } else if (children) {
    out.push(...collectPaths(children));
  }
  return out;
}
