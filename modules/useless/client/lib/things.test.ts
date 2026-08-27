import { describe, expect, it } from "vitest";

/** 校验只负责挑 key，文案由 i18n 提供——测试用恒等 t 断言 key 本身。 */
const t = (key: string) => key;

import {
  buildThingPayload,
  INITIAL_THING_FORM,
  THING_TEXT_MAX_LENGTH,
  validateThingForm,
} from "./things.js";

describe("validateThingForm", () => {
  it("rejects blank text", () => {
    expect(validateThingForm({ ...INITIAL_THING_FORM, text: "  " }, t)).toBe(
      "validation.textRequired",
    );
  });

  it("rejects overlong text", () => {
    expect(
      validateThingForm({
        ...INITIAL_THING_FORM,
        text: "x".repeat(THING_TEXT_MAX_LENGTH + 1),
      }, t),
    ).toBe("validation.textTooLong");
  });
});

describe("buildThingPayload", () => {
  it("trims text and passes other fields through", () => {
    expect(
      buildThingPayload({
        ...INITIAL_THING_FORM,
        text: "  x  ",
        enabled: true,
      }),
    ).toEqual({
      ...INITIAL_THING_FORM,
      text: "x",
      enabled: true,
    });
  });
});
