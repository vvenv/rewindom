import { describe, expect, it } from "vitest";

import {
  localDateKey,
  parseDateKey,
  shiftDateKey,
  validateThingInput,
} from "./thing.util.js";

describe("localDateKey", () => {
  it("按站点挂钟切日，不是 UTC", () => {
    // 北京时间早上八点正是 UTC 切日的时刻——这时候换东西对读者是错的
    const seven = new Date("2026-08-27T07:00:00+08:00");
    const nine = new Date("2026-08-27T09:00:00+08:00");
    expect(localDateKey(nine)).toBe(localDateKey(seven));
    expect(localDateKey(seven)).toBe("2026-08-27");
  });

  it("跨当地零点换一天", () => {
    expect(localDateKey(new Date("2026-08-27T23:59:59+08:00"))).toBe("2026-08-27");
    expect(localDateKey(new Date("2026-08-28T00:00:01+08:00"))).toBe("2026-08-28");
  });
});

describe("parseDateKey", () => {
  it("认合法日期", () => {
    expect(parseDateKey("2026-08-27")?.toISOString()).toBe(
      "2026-08-27T00:00:00.000Z",
    );
  });

  it("挡住访客乱填的东西", () => {
    // `?d=` 来自地址栏，绝不能原样带进查询
    for (const bad of [
      "2026-02-30",
      "26-08-27",
      "2026/08/27",
      "2026-08-27T00:00:00Z",
      "'; DROP TABLE",
      "",
      null,
      42,
    ]) {
      expect(parseDateKey(bad)).toBeNull();
    }
  });
});

describe("shiftDateKey", () => {
  it("跨月跨年都对", () => {
    expect(shiftDateKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("validateThingInput", () => {
  it("句子要正文", () => {
    expect(validateThingInput({ kind: "text", text: "  " })?.code).toBe(
      "useless.text_required",
    );
    expect(validateThingInput({ kind: "text", text: "有" })).toBeNull();
  });

  it("可交互的要 HTML 和名字", () => {
    expect(
      validateThingInput({ kind: "embed", title: "按钮", html: "" })?.code,
    ).toBe("useless.html_required");
    expect(
      validateThingInput({ kind: "embed", title: "", html: "<button>" })?.code,
    ).toBe("useless.title_required");
    expect(
      validateThingInput({ kind: "embed", title: "按钮", html: "<button>" }),
    ).toBeNull();
  });

  it("可交互的不要求正文——那是另一种形态的字段", () => {
    expect(
      validateThingInput({ kind: "embed", title: "按钮", html: "<button>", text: "" }),
    ).toBeNull();
  });

  it("认不出的 kind 直接挡掉", () => {
    expect(validateThingInput({ kind: "iframe" })?.code).toBe(
      "useless.kind_invalid",
    );
  });

  it("日期不合法就挡掉", () => {
    expect(
      validateThingInput({ kind: "text", text: "有", published_on: "2026-13-01" })
        ?.code,
    ).toBe("useless.date_invalid");
    expect(
      validateThingInput({ kind: "text", text: "有", published_on: null }),
    ).toBeNull();
  });
});
