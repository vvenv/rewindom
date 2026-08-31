import { describe, expect, it } from "vitest";

import { validateThingInput } from "./thing.util.js";

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

  it("slug 不合法就挡掉", () => {
    expect(
      validateThingInput({ kind: "text", text: "有", slug: "a/b" })?.code,
    ).toBe("useless.slug_invalid");
    expect(
      validateThingInput({ kind: "text", text: "有", slug: "hello" }),
    ).toBeNull();
  });

  it("系统占用的一级路径不能当 slug", () => {
    expect(
      validateThingInput({ kind: "text", text: "有", slug: "login" })?.code,
    ).toBe("useless.slug_reserved");
    expect(
      validateThingInput({ kind: "text", text: "有", slug: "app" })?.code,
    ).toBe("useless.slug_reserved");
  });
});
