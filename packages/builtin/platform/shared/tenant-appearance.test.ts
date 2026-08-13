import { describe, expect, it } from "vitest";

import {
  DEFAULT_TENANT_APPEARANCE,
  formatTenantAppearanceAuditDetails,
} from "./tenant-appearance.js";

describe("formatTenantAppearanceAuditDetails", () => {
  it("只记录真正变动的轴", () => {
    const details = formatTenantAppearanceAuditDetails(
      "acme",
      { theme: "azure", layout: "sidebar", locale: null },
      { theme: "slate", layout: "sidebar", locale: null },
    );

    expect(details).toBe("tenant=acme，默认主题：青蓝 → 石墨");
    expect(details).not.toContain("布局");
  });

  it("多根轴都变时都记录", () => {
    expect(
      formatTenantAppearanceAuditDetails(
        "acme",
        { theme: "azure", layout: "sidebar", locale: "zh-CN" },
        { theme: "slate", layout: "topbar", locale: "en" },
      ),
    ).toBe(
      "tenant=acme，默认主题：青蓝 → 石墨，默认布局：左右 → 上下，默认语言：中文 → English",
    );
  });

  it("null 渲染成「继承平台默认」", () => {
    expect(
      formatTenantAppearanceAuditDetails(
        "acme",
        DEFAULT_TENANT_APPEARANCE,
        { theme: "slate", layout: null, locale: null },
      ),
    ).toBe("tenant=acme，默认主题：继承平台默认 → 石墨");
  });

  it("没有任何变动时明确标注，不产生空的变更串", () => {
    expect(
      formatTenantAppearanceAuditDetails(
        "acme",
        { theme: "slate", layout: "topbar", locale: "en" },
        { theme: "slate", layout: "topbar", locale: "en" },
      ),
    ).toBe("tenant=acme，无变更");
  });
});
