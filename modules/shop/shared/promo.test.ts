import { describe, expect, it } from "vitest";

import {
  fillShopPromoText,
  isShopPromoLive,
  pickShopPromo,
  type ShopPromoCandidate,
} from "./promo.js";
import { renderPromoHtml } from "./sections/promo-html.js";
import { emptyShopContext, shopContextEntry } from "./shop-section-context.js";

const NOW = new Date("2026-08-16T00:00:00.000Z");

function candidate(
  code: string,
  overrides: Partial<ShopPromoCandidate> = {},
): ShopPromoCandidate {
  return {
    code,
    type: "percent",
    value: 10,
    status: "active",
    max_uses: null,
    used_count: 0,
    starts_at: null,
    ends_at: null,
    ...overrides,
  };
}

describe("isShopPromoLive", () => {
  it("只认启用中的码", () => {
    expect(isShopPromoLive(candidate("A", { status: "draft" }), NOW)).toBe(
      false,
    );
    expect(isShopPromoLive(candidate("A", { status: "disabled" }), NOW)).toBe(
      false,
    );
    expect(isShopPromoLive(candidate("A"), NOW)).toBe(true);
  });

  it("还没开始 / 已经结束的不算", () => {
    expect(
      isShopPromoLive(candidate("A", { starts_at: "2026-09-01" }), NOW),
    ).toBe(false);
    expect(
      isShopPromoLive(candidate("A", { ends_at: "2026-08-01" }), NOW),
    ).toBe(false);
    expect(
      isShopPromoLive(candidate("A", { ends_at: "2026-09-01" }), NOW),
    ).toBe(true);
  });

  it("次数用尽的不算", () => {
    expect(
      isShopPromoLive(candidate("A", { max_uses: 5, used_count: 5 }), NOW),
    ).toBe(false);
    expect(
      isShopPromoLive(candidate("A", { max_uses: 5, used_count: 4 }), NOW),
    ).toBe(true);
  });

  /* 小计门槛是文案该讲清楚的事，不是「现在能不能展示」的条件——公告条那儿还没有购物车。 */
  it("坏数据挡掉（0 值、超过 100% 的百分比）", () => {
    expect(isShopPromoLive(candidate("A", { value: 0 }), NOW)).toBe(false);
    expect(isShopPromoLive(candidate("A", { value: 120 }), NOW)).toBe(false);
    expect(
      isShopPromoLive(candidate("A", { type: "fixed", value: 12000 }), NOW),
    ).toBe(true);
  });
});

describe("pickShopPromo", () => {
  it("百分比优先于固定金额", () => {
    const best = pickShopPromo(
      [
        candidate("FIXED", { type: "fixed", value: 9900 }),
        candidate("PCT", { value: 5 }),
      ],
      NOW,
    );
    expect(best?.code).toBe("PCT");
  });

  it("同类型取数值最大的", () => {
    const best = pickShopPromo(
      [candidate("SMALL", { value: 10 }), candidate("BIG", { value: 30 })],
      NOW,
    );
    expect(best?.code).toBe("BIG");
  });

  /* 同一份数据每次渲染要挑出同一个码：页头不该刷一次换一个。 */
  it("完全打平时按 code 升序，结果稳定", () => {
    const items = [candidate("BBB"), candidate("AAA")];
    expect(pickShopPromo(items, NOW)?.code).toBe("AAA");
    expect(pickShopPromo([...items].reverse(), NOW)?.code).toBe("AAA");
  });

  it("没有生效的码就是 null", () => {
    expect(
      pickShopPromo([candidate("A", { status: "draft" })], NOW),
    ).toBeNull();
    expect(pickShopPromo([], NOW)).toBeNull();
  });
});

describe("fillShopPromoText", () => {
  const promo = {
    code: "SUMMER20",
    type: "percent" as const,
    value_label: "20%",
    ends_at: null,
  };

  it("填 {code} 与 {value}", () => {
    expect(fillShopPromoText("输入 {code} 立减 {value}", promo)).toBe(
      "输入 SUMMER20 立减 20%",
    );
  });

  it("认不出的占位符原样留着", () => {
    expect(fillShopPromoText("到 {until} 截止", promo)).toBe("到 {until} 截止");
  });
});

describe("renderPromoHtml", () => {
  const section = {
    id: "s1",
    type: "shop.promo",
    settings: {
      text: "输入 {code} 立减 {value}",
      href: "/shop",
      align: "center",
    },
  };

  function ctx(promo: ReturnType<typeof emptyShopContext>["promo"]) {
    return {
      locale: "zh-CN" as const,
      defaultLocale: "zh-CN" as const,
      contributed: shopContextEntry(emptyShopContext({ promo })),
    };
  }

  it("画出文案与码，整条可点", () => {
    const html = renderPromoHtml(
      section,
      ctx({
        code: "SUMMER20",
        type: "percent",
        value_label: "20%",
        ends_at: null,
      }) as Parameters<typeof renderPromoHtml>[1],
    );
    expect(html).toContain("输入 SUMMER20 立减 20%");
    expect(html).toContain('href="/shop"');
    expect(html).toContain("SUMMER20</code>");
  });

  /* 挂着一个空公告条比不挂更糟。 */
  it("没有可推的码时整段不渲染", () => {
    expect(
      renderPromoHtml(
        section,
        ctx(null) as Parameters<typeof renderPromoHtml>[1],
      ),
    ).toBe("");
  });
});
