import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { APP_LOCALES } from "@be-water/shared";
import { describe, expect, it } from "vitest";

import { DOC_PAGES } from "../lib/docs.js";
import { expandLocalizedMarketingRoutes } from "../lib/expand-localized-routes.js";
import { withMarketingLocale } from "../lib/marketing-locale-path.js";
import { MARKETING_ROUTES } from "../lib/seo-routes.js";

import {
  MARKETING_STATIC_PATHS,
  renderMarketingPublicRoutes,
} from "./routes.js";

/** 从路由树里取出声明的 path，用来和 SEO 路由表做交叉校验。 */
function declaredPaths(): string[] {
  const tree = renderMarketingPublicRoutes() as ReactElement<{
    children?: ReactNode;
  }>;

  return Children.toArray(tree.props.children)
    .filter(isValidElement<{ path?: string }>)
    .map((route) => route.props.path)
    .filter((path): path is string => typeof path === "string");
}

describe("renderMarketingPublicRoutes", () => {
  it("declares unprefixed and locale-prefixed marketing routes", () => {
    const expected = [
      "/",
      "/pricing",
      "/docs",
      "/docs/:slug",
      ...APP_LOCALES.flatMap((locale) => [
        `/${locale.slug}`,
        `/${locale.slug}/pricing`,
        `/${locale.slug}/docs`,
        `/${locale.slug}/docs/:slug`,
      ]),
      "/:slug",
      "/:slug/*",
    ];

    expect(declaredPaths()).toEqual(expected);
  });

  it("keeps MARKETING_STATIC_PATHS in sync with the logical static routes", () => {
    expect([...MARKETING_STATIC_PATHS]).toEqual(["/", "/pricing", "/docs"]);
  });

  it("prerenders every logical route for each locale", () => {
    const logical = [
      ...MARKETING_STATIC_PATHS,
      ...DOC_PAGES.map((page) => page.path),
    ];
    const expected = [
      ...logical,
      ...APP_LOCALES.flatMap((locale) =>
        logical.map((path) =>
          withMarketingLocale(path, locale.slug, { forcePrefix: true }),
        ),
      ),
    ].sort();

    expect(
      expandLocalizedMarketingRoutes()
        .map((route) => route.path)
        .sort(),
    ).toEqual(expected);
    expect(MARKETING_ROUTES.map((route) => route.path).sort()).toEqual(
      logical.sort(),
    );
  });
});
