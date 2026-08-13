import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const ProductsPage = lazy(() =>
  import("../pages/products.js").then((module) => ({
    default: module.ProductsPage,
  })),
);
const ProductEditorPage = lazy(() =>
  import("../pages/product-editor.js").then((module) => ({
    default: module.ProductEditorPage,
  })),
);
const CollectionsPage = lazy(() =>
  import("../pages/collections.js").then((module) => ({
    default: module.CollectionsPage,
  })),
);
const CollectionEditorPage = lazy(() =>
  import("../pages/collection-editor.js").then((module) => ({
    default: module.CollectionEditorPage,
  })),
);
const DiscountsPage = lazy(() =>
  import("../pages/discounts.js").then((module) => ({
    default: module.DiscountsPage,
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
        <Route path="/app/shop/products/new" element={<ProductEditorPage />} />
        <Route path="/app/shop/products/:productId" element={<ProductEditorPage />} />
        <Route path="/app/shop/collections" element={<CollectionsPage />} />
        <Route path="/app/shop/collections/new" element={<CollectionEditorPage />} />
        <Route path="/app/shop/collections/:collectionId" element={<CollectionEditorPage />} />
        <Route path="/app/shop/discounts" element={<DiscountsPage />} />
        <Route path="/app/shop/orders" element={<OrdersPage />} />
        <Route path="/app/shop/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/app/shop/shipping" element={<ShippingPage />} />
        <Route path="/app/shop/settings" element={<SettingsPage />} />
      </Route>
    </Route>
  );
}
