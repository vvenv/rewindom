import { FolderOpen, Package, Receipt, Settings, Tag, Truck } from "lucide-react";

import type { AppNavSection } from "@rewindom/module-sdk/client";

export const SHOP_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "shop:nav.shop",
    items: [
      {
        icon: Package,
        label: "shop:nav.products",
        path: "/app/shop",
        title: "shop:nav.products",
        end: true,
        tenantModule: "shop",
        anyPermission: ["shop.read"],
      },
      {
        icon: FolderOpen,
        label: "shop:nav.collections",
        path: "/app/shop/collections",
        title: "shop:nav.collections",
        tenantModule: "shop",
        anyPermission: ["shop.read"],
      },
      {
        icon: Tag,
        label: "shop:nav.discounts",
        path: "/app/shop/discounts",
        title: "shop:nav.discounts",
        tenantModule: "shop",
        anyPermission: ["shop.read"],
      },
      {
        icon: Receipt,
        label: "shop:nav.orders",
        path: "/app/shop/orders",
        title: "shop:nav.orders",
        tenantModule: "shop",
        anyPermission: ["shop.read"],
      },
      {
        icon: Truck,
        label: "shop:nav.shipping",
        path: "/app/shop/shipping",
        title: "shop:nav.shipping",
        tenantModule: "shop",
        anyPermission: ["shop.read"],
      },
      {
        icon: Settings,
        label: "shop:nav.settings",
        path: "/app/shop/settings",
        title: "shop:nav.settings",
        tenantModule: "shop",
        anyPermission: ["shop.read"],
      },
    ],
  },
];
