import { describe, expect, it } from "vitest";

import { isThingSlug, slugifyThing } from "./slug.js";

describe("slugifyThing", () => {
  it("中文名字原样留下，只收空白", () => {
    expect(slugifyThing("一口气")).toBe("一口气");
    expect(slugifyThing(" 时钟在撒谎 ")).toBe("时钟在撒谎");
  });

  it("拉丁收成 kebab-case", () => {
    expect(slugifyThing("Hello World")).toBe("hello-world");
  });

  it("空串表示请服务端自己起", () => {
    expect(slugifyThing("   ")).toBe("");
  });
});

describe("isThingSlug", () => {
  it("认合法 slug", () => {
    expect(isThingSlug("一口气")).toBe(true);
    expect(isThingSlug("hello-world")).toBe(true);
  });

  it("空串、斜杠、问号都不认", () => {
    expect(isThingSlug("")).toBe(false);
    expect(isThingSlug("a/b")).toBe(false);
    expect(isThingSlug("a?x")).toBe(false);
  });
});
