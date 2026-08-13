import { beforeAll, describe, expect, it } from "vitest";

import { registerShopStorefrontSections } from "./register.js";
import { productGridSection } from "../../shared/product-grid-section.js";
import { checkoutSection } from "../../shared/checkout-section.js";
import {
  emptyShopContext,
  shopContextEntry,
} from "../../shared/shop-section-context.js";

import { createSection } from "../../../../packages/builtin/marketing/shared/section-schema.js";
import { SECTION_HTML } from "../../../../packages/builtin/marketing/shared/sections/html.js";

describe("shop storefront section html", () => {
  beforeAll(() => {
    registerShopStorefrontSections();
  });

  it("商品列表在有商品时输出卡片链接", () => {
    const section = createSection(productGridSection.type);
    const html = SECTION_HTML[productGridSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          products: [
            { slug: "mug", href: "/shop/mug", title: "Mug", price: "$12.00" },
          ],
        }),
      ),
    });
    expect(html).toContain("/shop/mug");
    expect(html).toContain("Mug");
    expect(html).toContain("$12.00");
  });

  it("结账段是一张包含收件地址与付款按钮的 form", () => {
    const section = createSection(checkoutSection.type);
    const html = SECTION_HTML[checkoutSection.type]?.(section, {
      contributed: shopContextEntry(
        emptyShopContext({
          checkout: {
            email: "a@b.c",
            canceled: false,
            rates: [{ id: "r1", label: "Standard", price: "$5.00" }],
            values: {
              email: "a@b.c",
              name: "",
              line1: "",
              city: "",
              state: "",
              postal_code: "",
              country: "",
              phone: "",
              shipping_rate_id: "r1",
            },
          },
        }),
      ),
    });
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/shop/checkout"');
    expect(html).toContain('name="line1"');
    expect(html).toContain('name="shipping_rate_id"');
    expect(html).toContain('type="submit"');
  });
});
