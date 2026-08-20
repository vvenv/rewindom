import { describe, expect, it } from "vitest";

import {
  assertValidTenantSlug,
  generateTenantSlugFromName,
  InvalidTenantSlugError,
  ReservedTenantSlugError,
} from "./platform-admin.js";

describe("assertValidTenantSlug", () => {
  it("accepts valid slugs", () => {
    expect(assertValidTenantSlug("acme")).toBe("acme");
    expect(assertValidTenantSlug("Acme-Corp")).toBe("acme-corp");
  });

  it("rejects reserved slugs", () => {
    expect(() => assertValidTenantSlug("default")).toThrow(
      ReservedTenantSlugError,
    );
    expect(() => assertValidTenantSlug("rewindom")).toThrow(
      ReservedTenantSlugError,
    );
    expect(() => assertValidTenantSlug("platform")).toThrow(
      ReservedTenantSlugError,
    );
  });

  it("rejects invalid format", () => {
    expect(() => assertValidTenantSlug("a")).toThrow(InvalidTenantSlugError);
    expect(() => assertValidTenantSlug("-acme")).toThrow(
      InvalidTenantSlugError,
    );
  });
});

describe("generateTenantSlugFromName", () => {
  it("converts latin names to slug", () => {
    expect(generateTenantSlugFromName("Acme Corp")).toBe("acme-corp");
  });

  it("converts chinese names to hyphen-separated pinyin syllables", () => {
    expect(generateTenantSlugFromName("张三的小店")).toBe(
      "zhang-san-de-xiao-dian",
    );
    expect(generateTenantSlugFromName("XX科技有限公司")).toBe(
      "xx-ke-ji-you-xian-gong-si",
    );
  });

  it("prefixes numeric-only slugs", () => {
    expect(generateTenantSlugFromName("123")).toBe("t-123");
  });

  it("does not append random suffix", () => {
    const slug = generateTenantSlugFromName("Test Shop");
    expect(slug).toBe("test-shop");
    expect(slug).not.toMatch(/-[0-9a-f]{4}$/);
  });
});
