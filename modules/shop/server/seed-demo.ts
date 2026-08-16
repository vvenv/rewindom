/**
 * 给指定站点铺一套可逛、可加购、可看订单的商店 demo。
 *
 * 幂等：已有 slug / 优惠码 / 运费区 / 订单号会跳过，不覆盖租户后来的编辑。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";
import type { AppLocale } from "@rewindom/module-sdk";

import {
  getOrCreateSite,
  publishSiteDraft,
  updateSite,
} from "@rewindom/builtin/marketing/server/site.service.js";
import {
  createNavItemId,
  type SiteNavItem,
} from "@rewindom/builtin/marketing/shared/site-nav.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

import {
  createCollection,
  getCollection,
} from "./catalog/collection.service.js";
import { createProduct, getProduct } from "./catalog/catalog.service.js";
import { createDiscount } from "./discount/discount.service.js";
import { updateShopSetting } from "./payment/credentials.js";
import {
  createShippingRate,
  createShippingZone,
  listShippingZones,
} from "./shipping/shipping.service.js";
import type {
  CreateShopProductBody,
  ShopCollection,
  ShopProduct,
  ShopProductOption,
} from "../shared/index.js";

const LOCALE: AppLocale = "zh-CN";
const TENANT_MODULES_KEY = "tenant_modules";
const SHOP_PATH = "/shop";

function i18n(zh: string, en: string): Record<string, string> {
  return { "zh-CN": zh, en };
}

function image(
  url: string,
  zh: string,
  en: string,
): {
  id: string;
  url: string;
  alt: Record<string, string>;
} {
  return { id: crypto.randomUUID(), url, alt: i18n(zh, en) };
}

function option(
  id: string,
  zh: string,
  en: string,
  values: Array<{ id: string; zh: string; en: string }>,
): ShopProductOption {
  return {
    id,
    name: i18n(zh, en),
    values: values.map((value) => ({
      id: value.id,
      name: i18n(value.zh, value.en),
    })),
  };
}

function navLink(label: Record<string, string>, href: string): SiteNavItem {
  return {
    id: createNavItemId(),
    source: "link",
    label: { __i18n: label },
    href,
    category: "",
    expand: "children",
    children: [],
  };
}

function shopNavItem(): SiteNavItem {
  return {
    ...navLink(i18n("商店", "Shop"), SHOP_PATH),
    children: [
      navLink(i18n("全部商品", "All products"), SHOP_PATH),
      navLink(i18n("服饰", "Apparel"), "/shop/collections/apparel"),
      navLink(i18n("生活", "Home"), "/shop/collections/home"),
      navLink(i18n("数字商品", "Digital"), "/shop/collections/digital"),
      navLink(i18n("购物车", "Cart"), "/shop/cart"),
    ],
  };
}

function navTouchesShop(item: SiteNavItem): boolean {
  if (item.href === SHOP_PATH || item.href.startsWith(`${SHOP_PATH}/`)) {
    return true;
  }
  return item.children.some(navTouchesShop);
}

function ensureShopNav(header: SiteSection[]): {
  header: SiteSection[];
  changed: boolean;
} {
  let changed = false;
  const next = header.map((section) => {
    if (section.type !== "header") return section;
    return {
      ...section,
      blocks: section.blocks.map((block) => {
        if (block.type !== "chrome_nav") return block;
        const items = Array.isArray(block.settings.items)
          ? (block.settings.items as SiteNavItem[])
          : [];
        if (items.some(navTouchesShop)) return block;
        changed = true;
        return {
          ...block,
          settings: { ...block.settings, items: [...items, shopNavItem()] },
        };
      }),
    };
  });
  return { header: next, changed };
}

export interface SeedShopDemoResult {
  tenant_id: string;
  enabled_shop: boolean;
  settings: boolean;
  collections_created: number;
  products_created: number;
  discounts_created: number;
  shipping_zones_created: number;
  orders_created: number;
  nav_updated: boolean;
}

async function enableShopModule(tenantId: string): Promise<boolean> {
  const row = await prisma.tenantSetting.findUnique({
    where: { tenant_id_key: { tenant_id: tenantId, key: TENANT_MODULES_KEY } },
  });
  const current =
    row?.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? { ...(row.value as Record<string, unknown>) }
      : {};
  if (current.shop === true) return false;
  const value = { ...current, shop: true };
  await prisma.tenantSetting.upsert({
    where: { tenant_id_key: { tenant_id: tenantId, key: TENANT_MODULES_KEY } },
    create: {
      tenant_id: tenantId,
      key: TENANT_MODULES_KEY,
      value,
      secret: null,
    },
    update: { value },
  });
  return true;
}

async function findCollection(
  tenantId: string,
  slug: string,
): Promise<ShopCollection | null> {
  const row = await prisma.shopCollection.findFirst({
    where: withTenantScope(tenantId, { slug }),
    select: { id: true },
  });
  if (!row) return null;
  return getCollection(tenantId, row.id);
}

async function findProduct(
  tenantId: string,
  slug: string,
): Promise<ShopProduct | null> {
  const row = await prisma.shopProduct.findFirst({
    where: withTenantScope(tenantId, { slug }),
    select: { id: true },
  });
  return row ? getProduct(tenantId, row.id) : null;
}

async function ensureCollection(
  tenantId: string,
  body: Parameters<typeof createCollection>[0]["body"],
): Promise<{ collection: ShopCollection; created: boolean }> {
  const existing = await findCollection(tenantId, body.slug);
  if (existing) return { collection: existing, created: false };
  return {
    collection: await createCollection({
      tenant_id: tenantId,
      locale: LOCALE,
      body,
    }),
    created: true,
  };
}

async function ensureProduct(
  tenantId: string,
  userId: string,
  body: CreateShopProductBody,
): Promise<{ product: ShopProduct; created: boolean }> {
  const existing = await findProduct(tenantId, body.slug);
  if (existing) return { product: existing, created: false };
  return {
    product: await createProduct({
      tenant_id: tenantId,
      user_id: userId,
      locale: LOCALE,
      body,
    }),
    created: true,
  };
}

const SIZE = option("opt-size", "尺码", "Size", [
  { id: "val-s", zh: "S", en: "S" },
  { id: "val-m", zh: "M", en: "M" },
  { id: "val-l", zh: "L", en: "L" },
]);
const COLOR = option("opt-color", "颜色", "Color", [
  { id: "val-natural", zh: "原色", en: "Natural" },
  { id: "val-ink", zh: "墨色", en: "Ink" },
]);

function shirtVariant(
  sku: string,
  sizeId: string,
  colorId: string,
  price_cents: number,
  stock_qty: number,
): CreateShopProductBody["variants"][number] {
  return {
    sku,
    option_values: { "opt-size": sizeId, "opt-color": colorId },
    price_cents,
    compare_at_price_cents: colorId === "val-ink" ? 5800 : null,
    currency: "USD",
    stock_qty,
    weight_g: 280,
    hs_code: "610910",
    origin_country: "CN",
    barcode: sku.replaceAll("-", ""),
  };
}

async function seedCatalog(
  tenantId: string,
  userId: string,
): Promise<{
  collections_created: number;
  products_created: number;
  products: Record<string, ShopProduct>;
}> {
  const apparel = await ensureCollection(tenantId, {
    slug: "apparel",
    status: "published",
    title: i18n("服饰", "Apparel"),
    description: i18n(
      "日常穿着：亚麻衬衫与即将上架的帆布袋。",
      "Everyday wear: linen shirts and a tote on the way.",
    ),
    image_url:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80",
    sort_order: 0,
  });
  const shirts = await ensureCollection(tenantId, {
    slug: "shirts",
    status: "published",
    title: i18n("衬衫", "Shirts"),
    description: i18n("服饰下的衬衫。", "Shirts under apparel."),
    parent_id: apparel.collection.id,
    sort_order: 0,
  });
  const home = await ensureCollection(tenantId, {
    slug: "home",
    status: "published",
    title: i18n("生活", "Home"),
    description: i18n(
      "杯子与笔记本，给日常桌面用。",
      "Mugs and notebooks for the desk.",
    ),
    image_url:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1200&q=80",
  });
  const digital = await ensureCollection(tenantId, {
    slug: "digital",
    status: "published",
    title: i18n("数字商品", "Digital"),
    description: i18n(
      "无需配送，结账后即可使用。",
      "No shipping — available right after checkout.",
    ),
  });

  const shirt = await ensureProduct(tenantId, userId, {
    slug: "linen-shirt",
    status: "published",
    title: i18n("亚麻衬衫", "Linen shirt"),
    subtitle: i18n("透气、可机洗", "Breathable, machine-washable"),
    description: i18n(
      "中等克重亚麻，适合春秋。两色三码，墨色略贵一档。\n\n- 100% 亚麻\n- 建议 30℃ 轻柔洗涤\n- 中国制造",
      "Mid-weight linen for spring and fall. Two colours, three sizes; ink is a step up.\n\n- 100% linen\n- Wash at 30°C, gentle cycle\n- Made in China",
    ),
    images: [
      image(
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
        "亚麻衬衫正面",
        "Linen shirt front",
      ),
      image(
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80",
        "亚麻衬衫细节",
        "Linen shirt detail",
      ),
    ],
    product_type: "Apparel",
    vendor: "Rewindom Studio",
    tags: ["linen", "shirt", "new"],
    seo_title: i18n("亚麻衬衫", "Linen shirt"),
    seo_description: i18n(
      "两色三码亚麻衬衫，可机洗。",
      "Linen shirt in two colours and three sizes.",
    ),
    options: [SIZE, COLOR],
    variants: [
      shirtVariant("SHIRT-S-NAT", "val-s", "val-natural", 4800, 12),
      shirtVariant("SHIRT-M-NAT", "val-m", "val-natural", 4800, 18),
      shirtVariant("SHIRT-L-NAT", "val-l", "val-natural", 4800, 9),
      shirtVariant("SHIRT-S-INK", "val-s", "val-ink", 5200, 6),
      shirtVariant("SHIRT-M-INK", "val-m", "val-ink", 5200, 11),
      shirtVariant("SHIRT-L-INK", "val-l", "val-ink", 5200, 4),
    ],
    collection_ids: [apparel.collection.id, shirts.collection.id],
  });

  const mug = await ensureProduct(tenantId, userId, {
    slug: "ceramic-mug",
    status: "published",
    title: i18n("陶瓷马克杯", "Ceramic mug"),
    subtitle: i18n("350 ml，哑光釉", "350 ml, matte glaze"),
    description: i18n(
      "日常喝水、喝咖啡都合适。釉面哑光，杯底有防滑圈。\n\n可进洗碗机，微波炉加热请避开金属描边。",
      "For coffee or water. Matte glaze, non-slip foot.\n\nDishwasher safe. Keep the metallic rim out of the microwave.",
    ),
    images: [
      image(
        "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1200&q=80",
        "陶瓷马克杯",
        "Ceramic mug",
      ),
    ],
    product_type: "Home",
    vendor: "Rewindom Studio",
    tags: ["mug", "sale"],
    variants: [
      {
        sku: "MUG-CLASSIC",
        price_cents: 1800,
        compare_at_price_cents: 2400,
        currency: "USD",
        stock_qty: 40,
        weight_g: 420,
        hs_code: "691200",
        origin_country: "CN",
        barcode: "MUGCLASSIC",
      },
    ],
    collection_ids: [home.collection.id],
  });

  const notebook = await ensureProduct(tenantId, userId, {
    slug: "travel-notebook",
    status: "published",
    title: i18n("旅行笔记本", "Travel notebook"),
    subtitle: i18n("A5，点阵内页", "A5, dotted pages"),
    description: i18n(
      "硬壳、弹性绑带、内袋。192 页点阵，适合出门记。",
      "Hard cover, elastic band, inner pocket. 192 dotted pages.",
    ),
    images: [
      image(
        "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=1200&q=80",
        "旅行笔记本",
        "Travel notebook",
      ),
    ],
    product_type: "Stationery",
    vendor: "Rewindom Studio",
    tags: ["notebook"],
    variants: [
      {
        sku: "NOTE-TRAVEL",
        price_cents: 1200,
        currency: "USD",
        stock_qty: 60,
        weight_g: 180,
        hs_code: "482010",
        origin_country: "CN",
      },
    ],
    collection_ids: [home.collection.id],
  });

  const gift = await ensureProduct(tenantId, userId, {
    slug: "gift-card",
    status: "published",
    title: i18n("电子礼品卡", "Gift card"),
    subtitle: i18n("无需配送", "No shipping"),
    description: i18n(
      "结账后发到邮箱。纯数字商品，不填地址、不收运费。",
      "Delivered by email after checkout. Digital — no address, no shipping.",
    ),
    images: [
      image(
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
        "电子礼品卡",
        "Gift card",
      ),
    ],
    product_type: "Gift card",
    vendor: "Rewindom Studio",
    tags: ["digital", "gift"],
    variants: [
      {
        sku: "GIFT-50",
        price_cents: 5000,
        currency: "USD",
        stock_qty: 0,
        track_inventory: false,
        requires_shipping: false,
        taxable: false,
        weight_g: 0,
      },
    ],
    collection_ids: [digital.collection.id],
  });

  const poster = await ensureProduct(tenantId, userId, {
    slug: "limited-poster",
    status: "published",
    title: i18n("限量海报", "Limited poster"),
    subtitle: i18n(
      "已售罄，用来看缺货态",
      "Sold out — to demo the empty shelf",
    ),
    description: i18n(
      "库存为 0 且不允许超卖，店面会显示售罄。工作台仍能改库存重新上架。",
      "Stock is 0 with deny-on-empty, so the storefront shows sold out. Restock it from the workspace.",
    ),
    images: [
      image(
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80",
        "限量海报",
        "Limited poster",
      ),
    ],
    product_type: "Print",
    vendor: "Rewindom Studio",
    tags: ["poster", "sold-out"],
    variants: [
      {
        sku: "POSTER-LIMITED",
        price_cents: 3600,
        currency: "USD",
        stock_qty: 0,
        inventory_policy: "deny",
        weight_g: 90,
        hs_code: "491191",
        origin_country: "CN",
      },
    ],
    collection_ids: [home.collection.id],
  });

  const tote = await ensureProduct(tenantId, userId, {
    slug: "canvas-tote",
    status: "draft",
    title: i18n("帆布袋（草稿）", "Canvas tote (draft)"),
    subtitle: i18n(
      "未发布，店面看不到",
      "Unpublished — hidden on the storefront",
    ),
    description: i18n(
      "用来看工作台草稿态。发布后会出现在服饰分类。",
      "A workspace draft. Publish it to show it under Apparel.",
    ),
    product_type: "Apparel",
    vendor: "Rewindom Studio",
    tags: ["tote", "draft"],
    variants: [
      {
        sku: "TOTE-DRAFT",
        price_cents: 2200,
        currency: "USD",
        stock_qty: 25,
        weight_g: 200,
        hs_code: "420292",
        origin_country: "CN",
      },
    ],
    collection_ids: [apparel.collection.id],
  });

  return {
    collections_created: [apparel, shirts, home, digital].filter((row) => row.created)
      .length,
    products_created: [shirt, mug, notebook, gift, poster, tote].filter(
      (row) => row.created,
    ).length,
    products: {
      shirt: shirt.product,
      mug: mug.product,
      notebook: notebook.product,
      gift: gift.product,
      poster: poster.product,
      tote: tote.product,
    },
  };
}

async function seedDiscounts(tenantId: string): Promise<number> {
  let created = 0;
  const codes: Array<Parameters<typeof createDiscount>[0]["body"]> = [
    {
      code: "WELCOME10",
      type: "percent",
      value: 10,
      min_subtotal_cents: 0,
      status: "active",
    },
    {
      code: "SAVE15",
      type: "fixed",
      value: 1500,
      min_subtotal_cents: 5000,
      max_uses: 100,
      status: "active",
    },
  ];
  for (const body of codes) {
    const existing = await prisma.shopDiscount.findFirst({
      where: withTenantScope(tenantId, { code: body.code }),
      select: { id: true },
    });
    if (existing) continue;
    await createDiscount({ tenant_id: tenantId, body });
    created += 1;
  }
  return created;
}

async function seedShipping(tenantId: string): Promise<number> {
  const existing = await listShippingZones(tenantId);
  if (existing.length > 0) return 0;

  const domestic = await createShippingZone(tenantId, {
    name: "中国 / 港澳台",
    countries: ["CN", "HK", "MO", "TW"],
  });
  await createShippingRate(tenantId, domestic.id, {
    name: "标准",
    carrier_code: "china-post",
    price_cents: 600,
    min_days: 2,
    max_days: 5,
  });
  await createShippingRate(tenantId, domestic.id, {
    name: "加急",
    carrier_code: "sf-express",
    price_cents: 1400,
    min_days: 1,
    max_days: 2,
  });

  const northAmerica = await createShippingZone(tenantId, {
    name: "北美",
    countries: ["US", "CA"],
  });
  await createShippingRate(tenantId, northAmerica.id, {
    name: "标准",
    carrier_code: "usps",
    price_cents: 1600,
    min_days: 8,
    max_days: 14,
  });
  await createShippingRate(tenantId, northAmerica.id, {
    name: "加急",
    carrier_code: "dhl",
    price_cents: 3200,
    min_days: 4,
    max_days: 7,
  });

  const europe = await createShippingZone(tenantId, {
    name: "欧洲",
    countries: ["GB", "DE", "FR", "NL"],
  });
  await createShippingRate(tenantId, europe.id, {
    name: "标准",
    carrier_code: "dhl",
    price_cents: 1800,
    min_days: 7,
    max_days: 12,
  });

  const apac = await createShippingZone(tenantId, {
    name: "亚太",
    countries: ["JP", "KR", "SG", "AU"],
  });
  await createShippingRate(tenantId, apac.id, {
    name: "标准",
    carrier_code: "japan-post",
    price_cents: 1200,
    min_days: 5,
    max_days: 10,
  });

  return 4;
}

function variantBySku(
  product: ShopProduct,
  sku: string,
): {
  id: string;
  sku: string;
  price_cents: number;
  weight_g: number;
  hs_code: string | null;
  origin_country: string | null;
} {
  const variant = product.variants.find((item) => item.sku === sku);
  if (!variant) {
    throw new Error(`demo SKU missing: ${sku}`);
  }
  return variant;
}

async function seedOrders(
  tenantId: string,
  products: Record<string, ShopProduct>,
): Promise<number> {
  const zones = await listShippingZones(tenantId);
  const domesticStandard =
    zones
      .find((zone) => zone.countries.includes("CN"))
      ?.rates.find((rate) => rate.carrier_code === "china-post") ??
    zones[0]?.rates[0];
  const usStandard =
    zones
      .find((zone) => zone.countries.includes("US"))
      ?.rates.find((rate) => rate.carrier_code === "usps") ??
    zones[0]?.rates[0];

  const mug = variantBySku(products.mug, "MUG-CLASSIC");
  const shirt = variantBySku(products.shirt, "SHIRT-M-NAT");
  const gift = variantBySku(products.gift, "GIFT-50");
  const notebook = variantBySku(products.notebook, "NOTE-TRAVEL");

  const cnAddress = {
    name: "陈晓",
    line1: "天河路 88 号",
    city: "广州",
    state: "广东",
    postal_code: "510000",
    country: "CN",
    phone: "+86 13800000000",
  };
  const usAddress = {
    name: "Alex Chen",
    line1: "120 Market St",
    city: "San Francisco",
    state: "CA",
    postal_code: "94103",
    country: "US",
    phone: "+1 4155550100",
  };

  const specs: Array<{
    number: string;
    status: string;
    email: string;
    paid: boolean;
    shipping_cents: number;
    discount_code: string | null;
    discount_cents: number;
    address: typeof cnAddress;
    rate_id: string | null;
    rate_name: string | null;
    carrier_code: string | null;
    note: string | null;
    days_ago: number;
    lines: Array<{
      variant: ReturnType<typeof variantBySku>;
      title: string;
      quantity: number;
    }>;
    shipment?: { carrier_code: string; tracking_number: string };
    payment_status: "paid" | "refunded" | null;
  }> = [
    {
      number: "DEMO-1001",
      status: "paid",
      email: "buyer@example.com",
      paid: true,
      shipping_cents: domesticStandard?.price_cents ?? 600,
      discount_code: "WELCOME10",
      discount_cents: 180,
      address: cnAddress,
      rate_id: domesticStandard?.id ?? null,
      rate_name: domesticStandard?.name ?? "标准",
      carrier_code: domesticStandard?.carrier_code ?? "china-post",
      note: "可以放门口",
      days_ago: 2,
      lines: [{ variant: mug, title: "陶瓷马克杯", quantity: 1 }],
      payment_status: "paid",
    },
    {
      number: "DEMO-1002",
      status: "shipped",
      email: "alex@example.com",
      paid: true,
      shipping_cents: usStandard?.price_cents ?? 1600,
      discount_code: null,
      discount_cents: 0,
      address: usAddress,
      rate_id: usStandard?.id ?? null,
      rate_name: usStandard?.name ?? "标准",
      carrier_code: usStandard?.carrier_code ?? "usps",
      note: null,
      days_ago: 8,
      lines: [
        { variant: shirt, title: "亚麻衬衫 · M / 原色", quantity: 1 },
        { variant: notebook, title: "旅行笔记本", quantity: 2 },
      ],
      shipment: {
        carrier_code: "usps",
        tracking_number: "9400111899223199999999",
      },
      payment_status: "paid",
    },
    {
      number: "DEMO-1003",
      status: "pending_payment",
      email: "wait@example.com",
      paid: false,
      shipping_cents: domesticStandard?.price_cents ?? 600,
      discount_code: null,
      discount_cents: 0,
      address: cnAddress,
      rate_id: domesticStandard?.id ?? null,
      rate_name: domesticStandard?.name ?? "标准",
      carrier_code: domesticStandard?.carrier_code ?? "china-post",
      note: null,
      days_ago: 1,
      lines: [{ variant: mug, title: "陶瓷马克杯", quantity: 2 }],
      payment_status: null,
    },
    {
      number: "DEMO-1004",
      status: "completed",
      email: "gift@example.com",
      paid: true,
      shipping_cents: 0,
      discount_code: null,
      discount_cents: 0,
      address: cnAddress,
      rate_id: null,
      rate_name: null,
      carrier_code: null,
      note: "数字礼品卡",
      days_ago: 20,
      lines: [{ variant: gift, title: "电子礼品卡", quantity: 1 }],
      payment_status: "paid",
    },
    {
      number: "DEMO-1005",
      status: "refunded",
      email: "refund@example.com",
      paid: true,
      shipping_cents: domesticStandard?.price_cents ?? 600,
      discount_code: "SAVE15",
      discount_cents: 1500,
      address: cnAddress,
      rate_id: domesticStandard?.id ?? null,
      rate_name: domesticStandard?.name ?? "标准",
      carrier_code: domesticStandard?.carrier_code ?? "china-post",
      note: "已全额退款（demo）",
      days_ago: 12,
      lines: [{ variant: shirt, title: "亚麻衬衫 · M / 原色", quantity: 1 }],
      payment_status: "refunded",
    },
  ];

  let created = 0;
  for (const spec of specs) {
    const exists = await prisma.shopOrder.findFirst({
      where: withTenantScope(tenantId, { number: spec.number }),
      select: { id: true },
    });
    if (exists) continue;

    const subtotal = spec.lines.reduce(
      (sum, line) => sum + line.variant.price_cents * line.quantity,
      0,
    );
    const total = Math.max(
      0,
      subtotal - spec.discount_cents + spec.shipping_cents,
    );
    const createdAt = new Date(Date.now() - spec.days_ago * 86_400_000);
    const paidAt = spec.paid ? new Date(createdAt.getTime() + 3_600_000) : null;

    await prisma.shopOrder.create({
      data: {
        tenant_id: tenantId,
        number: spec.number,
        status: spec.status,
        email: spec.email,
        guest_token: `demo-${spec.number.toLowerCase()}`,
        currency: "USD",
        subtotal_cents: subtotal,
        shipping_cents: spec.shipping_cents,
        tax_cents: 0,
        discount_code: spec.discount_code,
        discount_cents: spec.discount_cents,
        total_cents: total,
        note: spec.note,
        shipping_address: spec.address,
        shipping_rate_id: spec.rate_id,
        shipping_rate_name: spec.rate_name,
        carrier_code: spec.carrier_code,
        created_at: createdAt,
        updated_at: paidAt ?? createdAt,
        paid_at: paidAt,
        lines: {
          create: spec.lines.map((line) => ({
            tenant_id: tenantId,
            variant_id: line.variant.id,
            sku: line.variant.sku,
            title: line.title,
            quantity: line.quantity,
            unit_price_cents: line.variant.price_cents,
            weight_g: line.variant.weight_g,
            hs_code: line.variant.hs_code,
            origin_country: line.variant.origin_country,
          })),
        },
        ...(spec.shipment
          ? {
              shipments: {
                create: {
                  tenant_id: tenantId,
                  carrier_code: spec.shipment.carrier_code,
                  tracking_number: spec.shipment.tracking_number,
                  shipped_at: new Date(createdAt.getTime() + 2 * 86_400_000),
                  customs_snapshot: {
                    origin_country: "CN",
                    ioss_number: "IM0000000001",
                    lines: spec.lines.map((line) => ({
                      sku: line.variant.sku,
                      hs_code: line.variant.hs_code,
                      origin_country: line.variant.origin_country,
                    })),
                  },
                },
              },
            }
          : {}),
        ...(spec.payment_status
          ? {
              payments: {
                create: {
                  tenant_id: tenantId,
                  provider: "stripe",
                  provider_ref: `demo_${spec.number}`,
                  amount_cents: total,
                  currency: "USD",
                  status: spec.payment_status,
                  paid_at: paidAt,
                },
              },
            }
          : {}),
      },
    });
    created += 1;
  }
  return created;
}

async function seedStorefrontNav(tenantId: string): Promise<boolean> {
  const site = await getOrCreateSite(tenantId);
  const { header, changed } = ensureShopNav(site.header);
  if (changed) {
    await updateSite(tenantId, { header, published: true });
    await publishSiteDraft(tenantId);
    return true;
  }
  if (!site.published) {
    await updateSite(tenantId, { published: true });
    return false;
  }
  return false;
}

export async function seedShopDemo(
  tenantId: string,
  userId: string,
): Promise<SeedShopDemoResult> {
  const enabled_shop = await enableShopModule(tenantId);
  const existingSetting = await prisma.shopSetting.findUnique({
    where: { tenant_id: tenantId },
    select: { id: true },
  });
  if (!existingSetting) {
    await updateShopSetting(tenantId, {
      currency: "USD",
      origin_country: "CN",
      ioss_number: "IM0000000001",
      eori_number: "GB123456789000",
      stripe_tax_enabled: false,
    });
  }
  const catalog = await seedCatalog(tenantId, userId);
  const discounts_created = await seedDiscounts(tenantId);
  const shipping_zones_created = await seedShipping(tenantId);
  const orders_created = await seedOrders(tenantId, catalog.products);
  const nav_updated = await seedStorefrontNav(tenantId);

  return {
    tenant_id: tenantId,
    enabled_shop,
    settings: !existingSetting,
    collections_created: catalog.collections_created,
    products_created: catalog.products_created,
    discounts_created,
    shipping_zones_created,
    orders_created,
    nav_updated,
  };
}
