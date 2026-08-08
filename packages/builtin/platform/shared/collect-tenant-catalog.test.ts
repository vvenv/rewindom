import { describe, expect, it } from "vitest";

import { getFeatureModuleId } from "./collect-tenant-catalog.js";

import type { TenantEntitlementCatalog } from "@be-water/shared";

const catalog: TenantEntitlementCatalog = {
  modules: [
    {
      module_id: "notes",
      label: "笔记",
      description: "示例笔记模块",
      disabled_hint: "未开通笔记",
      default_enabled: true,
    },
  ],
  features: [
    {
      key: "notes_feature",
      label: "笔记功能",
      description: "启用笔记",
      disabled_hint: "未开通",
      default_enabled: true,
      module_id: "notes",
    },
  ],
};

describe("getFeatureModuleId", () => {
  it("resolves the owning entitlement key for a feature", () => {
    expect(getFeatureModuleId(catalog, "notes_feature")).toBe("notes");
  });

  it("returns undefined for an unknown feature", () => {
    expect(getFeatureModuleId(catalog, "nope")).toBeUndefined();
  });
});
