import { emptyShopContext, type ShopRenderContext } from "./shop-section-context.js";

/** 取一条库存文案；调用方按**当前选中页面的 locale** 绑定（`i18n.getFixedT(locale, "shop")`）。 */
export type SampleText = (key: string) => string;

/**
 * 编辑器预览占位：模板页没有真实请求数据时，喂给同一套 HTML 渲染器。
 *
 * 文案由调用方按页面 locale 绑定后传进来——占位样张也是访客会看到的那个语言版本，
 * 不能跟工作台界面语言走（真实数据那一支同理，见 `client/editor-context.ts`）。
 * 价格串保持样例常量：真实路径由 `formatMoney` 按 locale 定稿，样张不模拟它。
 */
export function sampleShopContext(t: SampleText): ShopRenderContext {
  return emptyShopContext({
    products: [
      {
        slug: "sample",
        href: "/shop/sample",
        title: t("editor.sample.product"),
        price: "$12.00",
        compare_at_price: "$15.00",
        image_url: null,
        image_alt: "",
        collection_slugs: ["summer"],
      },
    ],
    collections: [
      {
        slug: "summer",
        parent_slug: null,
        href: "/shop/collections/summer",
        title: t("editor.sample.collectionSummer"),
        product_count: 1,
        sort_order: 0,
      },
      {
        slug: "kitchen",
        parent_slug: "summer",
        href: "/shop/collections/kitchen",
        title: t("editor.sample.collectionKitchen"),
        product_count: 0,
        sort_order: 0,
      },
      {
        slug: "home",
        parent_slug: null,
        href: "/shop/collections/home",
        title: t("editor.sample.collectionHome"),
        product_count: 2,
        sort_order: 1,
      },
    ],
    collection: {
      slug: "summer",
      title: t("editor.sample.collectionSummer"),
      description: t("editor.sample.collectionDescription"),
    },
    /*
     * 公告条样张：编辑器里永远画得出来，实站是渲染期从生效的码里挑。列表接口不带
     * 起止时间与用尽次数，判不出「现在还能不能用」——与其在预览里挑错一个码，
     * 不如摆个一眼是样张的占位。
     */
    promo: {
      code: "SAMPLE20",
      type: "percent",
      value_label: "20%",
      ends_at: null,
    },
    product: {
      title: t("editor.sample.product"),
      subtitle: t("editor.sample.subtitle"),
      description: t("editor.sample.description"),
      images: [],
      variants: [
        {
          id: "v1",
          label: t("editor.sample.variant"),
          price: "$12.00",
          compare_at_price: "$15.00",
          stock: 8,
          sold_out: false,
        },
      ],
    },
    cart: {
      item_count: 1,
      subtotal: "$12.00",
      discount_code: null,
      discount: null,
      items: [
        {
          id: "line-1",
          title: t("editor.sample.product"),
          sku: "SKU-001",
          image_url: null,
          quantity: 1,
          line_total: "$12.00",
        },
      ],
    },
    checkout: {
      email: "buyer@example.com",
      canceled: false,
      requires_shipping: true,
      rates: [
        { id: "rate-1", label: t("editor.sample.shipping"), price: "$5.00" },
      ],
      values: {
        email: "buyer@example.com",
        name: "",
        line1: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        phone: "",
        shipping_rate_id: "rate-1",
        note: "",
      },
    },
    order: {
      number: "1001",
      status: "paid",
      pending: false,
      note: null,
      subtotal: "$12.00",
      discount_code: null,
      discount: null,
      shipping: "$5.00",
      tax: "$0.00",
      total: "$17.00",
      lines: [
        { title: t("editor.sample.product"), quantity: 1, line_total: "$12.00" },
      ],
      shipments: [],
    },
    orders: [
      {
        number: "1001",
        href: "/shop/orders/1001",
        status: "paid",
        total: "$17.00",
      },
    ],
  });
}
