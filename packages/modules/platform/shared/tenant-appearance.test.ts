import { describe, expect, it } from "vitest";

import {
  DEFAULT_TENANT_APPEARANCE,
  formatTenantAppearanceAuditDetails,
} from "./tenant-appearance.js";

describe("formatTenantAppearanceAuditDetails", () => {
  it("只记录真正变动的轴", () => {
    const details = formatTenantAppearanceAuditDetails(
      "acme",
      { theme: "water", layout: "sidebar" },
      { theme: "slate", layout: "sidebar" },
    );

    expect(details).toBe("tenant=acme，默认主题：水蓝 → 石墨");
    expect(details).not.toContain("布局");
  });

  it("两根轴都变时都记录", () => {
    expect(
      formatTenantAppearanceAuditDetails(
        "acme",
        { theme: "water", layout: "sidebar" },
        { theme: "slate", layout: "topbar" },
      ),
    ).toBe("tenant=acme，默认主题：水蓝 → 石墨，默认布局：左右 → 上下");
  });

  it("null 渲染成「继承平台默认」", () => {
    expect(
      formatTenantAppearanceAuditDetails(
        "acme",
        DEFAULT_TENANT_APPEARANCE,
        { theme: "slate", layout: null },
      ),
    ).toBe("tenant=acme，默认主题：继承平台默认 → 石墨");
  });

  it("没有任何变动时明确标注，不产生空的变更串", () => {
    expect(
      formatTenantAppearanceAuditDetails(
        "acme",
        { theme: "slate", layout: "topbar" },
        { theme: "slate", layout: "topbar" },
      ),
    ).toBe("tenant=acme，无变更");
  });
});
