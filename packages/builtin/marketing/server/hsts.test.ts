import { describe, expect, it } from "vitest";

import { HSTS_HEADER_VALUE, hstsHeaderForOrigin } from "./hsts.js";

describe("hstsHeaderForOrigin", () => {
  it("sets HSTS on https origins", () => {
    expect(hstsHeaderForOrigin("https://yestino.com")).toBe(HSTS_HEADER_VALUE);
  });

  it("stays off on http so local dev is not pinned to https", () => {
    expect(hstsHeaderForOrigin("http://localhost:7300")).toBeNull();
  });
});
