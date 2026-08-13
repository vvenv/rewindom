import {
  registerTenantGatedRoutes,
  type ServerAppModule,
} from "@rewindom/module-sdk/server";

import { SHOP_ENTITLEMENT } from "../shared/entitlements.js";

import { catalogRoutes } from "./catalog/catalog.routes.js";
import { collectionRoutes } from "./catalog/collection.routes.js";
import { discountRoutes } from "./discount/discount.routes.js";
import { SHOP_SERVER_I18N } from "./i18n.js";
import { shopAdminRoutes, shopWebhookRoutes } from "./order/shop-admin.routes.js";
import { registerShopStorefrontSections } from "./sections/register.js";
import { shopStorefrontRoutes } from "./ssr/shop.ssr.js";
import { registerShopPageTemplates } from "../shared/shop-page-templates.js";

export const shopServerModule: ServerAppModule = {
  id: "shop",
  version: "1.0.0",
  label: "Shop",
  kind: "business",
  description: "商品目录、购物车、结账与履约",
  requires: ["rbac", "audit", "marketing", "site-member"],
  tenantEntitlements: [SHOP_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "shop.read",
        label: "查看商店",
        group: "商店",
        description: "查看商品、订单与运费表",
      },
      {
        key: "shop.write",
        label: "管理商店",
        group: "商店",
        description: "编辑商品、发货、配置运费与收款",
      },
    ],
    auditActions: [
      { action: "SHOP_PRODUCT_CREATE", label: "创建商品" },
      { action: "SHOP_PRODUCT_UPDATE", label: "更新商品" },
      { action: "SHOP_PRODUCT_DELETE", label: "删除商品" },
      { action: "SHOP_COLLECTION_CREATE", label: "创建分类" },
      { action: "SHOP_COLLECTION_UPDATE", label: "更新分类" },
      { action: "SHOP_COLLECTION_DELETE", label: "删除分类" },
      { action: "SHOP_DISCOUNT_CREATE", label: "创建优惠码" },
      { action: "SHOP_DISCOUNT_UPDATE", label: "更新优惠码" },
      { action: "SHOP_DISCOUNT_DELETE", label: "删除优惠码" },
      { action: "SHOP_ORDER_FULFILL", label: "订单发货" },
      { action: "SHOP_ORDER_REFUND", label: "订单退款" },
      { action: "SHOP_SHIPPING_SAVE", label: "更新运费" },
      { action: "SHOP_SETTING_UPDATE", label: "更新商店设置" },
      { action: "SHOP_PROVIDER_UPDATE", label: "更新商店收款通道" },
      { action: "SHOP_WEBHOOK_SYNC", label: "同步商店付款 webhook" },
    ],
  },
  server: {
    i18n: SHOP_SERVER_I18N,
    registerProviders: (registry) => {
      registry.getMemberMenuLinksProvider()?.register({
        id: "shop-orders",
        href: "/member/orders",
        labels: { "zh-CN": "我的订单", en: "My orders" },
        order: 20,
      });
    },
    onBoot: async () => {
      registerShopPageTemplates();
      registerShopStorefrontSections();
    },
    registerRoutes: async (app) => {
      await app.register(shopWebhookRoutes, {
        prefix: "/api/shop/webhooks",
      });
      await app.register(shopStorefrontRoutes);
      await registerTenantGatedRoutes(app, "shop", async (scoped) => {
        await scoped.register(catalogRoutes, { prefix: "/api/shop" });
        await scoped.register(collectionRoutes, { prefix: "/api/shop" });
        await scoped.register(discountRoutes, { prefix: "/api/shop" });
        await scoped.register(shopAdminRoutes, { prefix: "/api/shop" });
      });
    },
  },
};
