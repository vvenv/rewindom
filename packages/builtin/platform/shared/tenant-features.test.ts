import { describe, expect, it } from "vitest";

import {
  createDefaultTenantFeatureFlags,
  formatTenantFeatureAuditDetails,
} from "./tenant-features.js";

const sampleCatalog = {
  features: [
    {
      key: "chat",
      label: "示例功能",
      disabled_hint: "未开通",
      default_enabled: true,
      module_id: "chat",
    },
    {
      key: "api_access",
      label: "API 访问",
      disabled_hint: "未开通",
      default_enabled: false,
      module_id: "settings",
    },
  ],
};

describe("tenant-features", () => {
  it("createDefaultTenantFeatureFlags uses catalog defaults", () => {
    expect(createDefaultTenantFeatureFlags(sampleCatalog)).toEqual({
      chat: true,
      api_access: false,
    });
  });

  it("formatTenantFeatureAuditDetails renders changed features", () => {
    expect(
      formatTenantFeatureAuditDetails(
        "acme",
        { api_access: true },
        sampleCatalog,
      ),
    ).toBe("tenant=acme，API 访问=开启");
  });
});
