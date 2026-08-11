/**
 * 不认识的段：读路径兜住、写路径拒收、模块回来能复活。
 *
 * 这组用例守的是一条很容易踩的路径：停用一个贡献了 section 的模块 → 租户打开编辑器
 * → 顺手保存。以前这一下就把那段内容永久烧掉了。
 */

import { describe, expect, it } from "vitest";

import {
  parseAreaSections,
  parseSections,
  safeAreaSections,
  safeSections,
  type SiteSection,
} from "./section-schema.js";

/** 某个业务模块贡献的段，当前这份代码不认识它。 */
const CONTRIBUTED = {
  id: "sec-booking",
  type: "booking.calendar",
  settings: { heading: "预约", slot_minutes: 30 },
  blocks: [{ id: "b1", type: "slot", settings: { label: "上午" } }],
};

const HERO = {
  id: "sec-hero",
  type: "hero",
  settings: { headline: "Welcome" },
  blocks: [],
};

function findUnsupported(sections: SiteSection[]): SiteSection {
  const found = sections.find((section) => section.type === "unsupported");
  expect(found, "应该兜出一个 unsupported 占位").toBeDefined();
  return found!;
}

describe("读路径：不认识的段原样兜住", () => {
  it("包成 unsupported 占位，原始条目一字不改地留着", () => {
    const sections = safeSections([HERO, CONTRIBUTED]);

    expect(sections).toHaveLength(2);
    const placeholder = findUnsupported(sections);
    expect(placeholder.source?.type).toBe("booking.calendar");
    expect(placeholder.source?.raw).toEqual(CONTRIBUTED);
    // id 沿用原始条目：编辑器里的选中态、拖拽排序都靠它
    expect(placeholder.id).toBe("sec-booking");
  });

  it("占位不带任何可编辑的东西——字段都不认识，谈不上编辑", () => {
    const placeholder = findUnsupported(safeSections([CONTRIBUTED]));
    expect(placeholder.settings).toEqual({});
    expect(placeholder.blocks).toEqual([]);
  });

  it("其余段不受牵连", () => {
    const sections = safeSections([HERO, CONTRIBUTED]);
    expect(sections[0]?.type).toBe("hero");
  });
});

describe("写路径：占位能原样回存，裸的未知 type 拒收", () => {
  it("读出来再写回去，兜着的原始条目不掉一个字段", () => {
    const roundTripped = parseSections(safeSections([CONTRIBUTED]));

    const placeholder = findUnsupported(roundTripped);
    expect(placeholder.source?.raw).toEqual(CONTRIBUTED);
  });

  it("连续多次读写不会套娃", () => {
    let sections = safeSections([CONTRIBUTED]);
    for (let i = 0; i < 3; i += 1) sections = safeSections(parseSections(sections));

    const placeholder = findUnsupported(sections);
    expect(placeholder.source?.raw).toEqual(CONTRIBUTED);
  });

  it("裸的未知 type 直接进写路径 → 拒收", () => {
    expect(() => parseSections([CONTRIBUTED])).toThrow("site.sections_invalid");
  });

  it("壳坏了（没有 source）的占位也拒收", () => {
    expect(() =>
      parseSections([{ id: "x", type: "unsupported", settings: {}, blocks: [] }]),
    ).toThrow("site.sections_invalid");
  });
});

describe("模块回来了：占位自动复活", () => {
  it("兜着的 type 重新被认识时，原样解析回真正的段", () => {
    // 用一个当前合法的 type 模拟「模块回来了、type 重新被认识」：
    // 占位兜着 source.raw.type = hero，parseSections 认出后复活成真段
    const wrapped: SiteSection[] = [
      {
        id: "sec-x",
        type: "unsupported",
        settings: {},
        blocks: [],
        source: {
          type: "hero",
          raw: { id: "sec-x", type: "hero", settings: {}, blocks: [] },
        },
      },
    ];

    const revived = parseSections(wrapped);

    expect(revived[0]?.type).toBe("hero");
    expect(revived[0]?.id).toBe("sec-x");
    expect(revived[0]?.source).toBeUndefined();
  });
});

describe("页头 / 页脚区同一口径", () => {
  const NAV = { id: "h1", type: "header", settings: {}, blocks: [] };

  it("一段不认识不再把整个区域重置掉", () => {
    const sections = safeAreaSections("header", [CONTRIBUTED, NAV]);

    // 以前这里返回的是「一个全新的默认页头」，租户配的全没了
    expect(sections.map((s) => s.type)).toContain("unsupported");
    expect(sections.map((s) => s.type)).toContain("header");
    expect(findUnsupported(sections).source?.raw).toEqual(CONTRIBUTED);
  });

  it("区域本体照常兜底：缺了补一个", () => {
    const sections = safeAreaSections("footer", [CONTRIBUTED]);
    expect(sections.filter((s) => s.type === "footer")).toHaveLength(1);
  });

  it("写路径仍然拒收裸的未知 type", () => {
    expect(() => parseAreaSections("header", [CONTRIBUTED, NAV])).toThrow(
      "site.sections_invalid",
    );
  });

  it("写路径接受占位并原样回存", () => {
    const roundTripped = parseAreaSections(
      "header",
      safeAreaSections("header", [CONTRIBUTED, NAV]),
    );
    expect(findUnsupported(roundTripped).source?.raw).toEqual(CONTRIBUTED);
  });
});
