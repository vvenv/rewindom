import { describe, expect, it } from "vitest";

import {
  buildEventUpdatePayload,
  validateEventEditForm,
} from "./event-edit.js";

const t = (key: string) => key;

describe("validateEventEditForm", () => {
  it("标题为空时报错", () => {
    expect(
      validateEventEditForm({ title: "  ", summary: "", topic: "tech" }, t),
    ).toBe("edit.validation.titleRequired");
  });

  it("合法输入通过", () => {
    expect(
      validateEventEditForm(
        { title: "Stripe acquires OpenRouter", summary: "Deal closed.", topic: "ai" },
        t,
      ),
    ).toBeNull();
  });
});

describe("buildEventUpdatePayload", () => {
  it("去掉首尾空白", () => {
    expect(
      buildEventUpdatePayload({
        title: "  Hello  ",
        summary: "  World  ",
        topic: "tech",
      }),
    ).toEqual({ title: "Hello", summary: "World", topic: "tech" });
  });
});
