import { describe, expect, it } from "vitest";

import {
  buildThingPayload,
  INITIAL_THING_FORM,
  THING_TEXT_MAX_LENGTH,
  validateThingForm,
} from "./things.js";

/** 校验只负责挑 key，文案由 i18n 提供——测试用恒等 t 断言 key 本身。 */
const t = (key: string) => key;

describe("validateThingForm", () => {
  it("句子要正文", () => {
    expect(validateThingForm({ ...INITIAL_THING_FORM, text: "  " }, t)).toBe(
      "validation.textRequired",
    );
  });

  it("正文过长", () => {
    expect(
      validateThingForm(
        { ...INITIAL_THING_FORM, text: "x".repeat(THING_TEXT_MAX_LENGTH + 1) },
        t,
      ),
    ).toBe("validation.textTooLong");
  });

  it("可交互的要名字与 HTML", () => {
    const embed = { ...INITIAL_THING_FORM, kind: "embed" as const };
    expect(validateThingForm({ ...embed, title: "", html: "<b>" }, t)).toBe(
      "validation.titleRequired",
    );
    expect(validateThingForm({ ...embed, title: "按钮", html: " " }, t)).toBe(
      "validation.htmlRequired",
    );
    expect(
      validateThingForm({ ...embed, title: "按钮", html: "<button>" }, t),
    ).toBeNull();
  });
});

describe("buildThingPayload", () => {
  it("切到可交互时清掉正文，反之亦然——避免留上一次的残留", () => {
    expect(
      buildThingPayload({
        ...INITIAL_THING_FORM,
        kind: "embed",
        title: " 按钮 ",
        text: "上一次填的句子",
        html: " <button>x</button> ",
      }),
    ).toEqual({
      kind: "embed",
      title: "按钮",
      text: "",
      html: "<button>x</button>",
      published_on: null,
      enabled: true,
    });
  });

  it("日期留空 = 不排期，交给系统随机绑", () => {
    expect(
      buildThingPayload({ ...INITIAL_THING_FORM, text: "有", published_on: "  " })
        .published_on,
    ).toBeNull();
  });
});
