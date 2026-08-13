import type { MobileHeaderRouteDefinition } from "@rewindom/module-sdk/client";

export const SHOP_MOBILE_HEADER_ROUTES: MobileHeaderRouteDefinition[] = [
  {
    match: (pathname) => pathname === "/app/shop/products/new",
    resolve: () => ({
      title: "shop:createTitle",
      back: { to: "/app/shop", label: "shop:nav.products" },
    }),
  },
  {
    match: (pathname) =>
      /^\/app\/shop\/products\/[^/]+$/u.test(pathname) &&
      pathname !== "/app/shop/products/new",
    resolve: () => ({
      title: "shop:editTitle",
      back: { to: "/app/shop", label: "shop:nav.products" },
    }),
  },
];
