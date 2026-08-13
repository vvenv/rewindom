import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@be-water/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const ProductsPage = lazy(() =>
  import("../pages/products.js").then((module) => ({
    default: module.ProductsPage,
  })),
);
const OrdersPage = lazy(() =>
  import("../pages/orders.js").then((module) => ({
    default: module.OrdersPage,
  })),
);
const OrderDetailPage = lazy(() =>
  import("../pages/order-detail.js").then((module) => ({
    default: module.OrderDetailPage,
  })),
);
const ShippingPage = lazy(() =>
  import("../pages/shipping.js").then((module) => ({
    default: module.ShippingPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../pages/settings.js").then((module) => ({
    default: module.SettingsPage,
  })),
);

function ShopModuleRoute() {
  const { t } = useTranslation("shop");
  return <TenantModuleRoute moduleId="shop" label={t("title")} />;
}

export function renderShopRoutes(): ReactNode {
  return (
    <Route element={<ShopModuleRoute />}>
      <Route element={<PermissionRoute permission="shop.read" />}>
        <Route path="/app/shop" element={<ProductsPage />} />
        <Route path="/app/shop/orders" element={<OrdersPage />} />
        <Route path="/app/shop/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/app/shop/shipping" element={<ShippingPage />} />
        <Route path="/app/shop/settings" element={<SettingsPage />} />
      </Route>
    </Route>
  );
}
