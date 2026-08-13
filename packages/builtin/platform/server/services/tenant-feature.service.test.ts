import { getServerTenantCatalog } from "@rewindom/server-kernel/runtime/tenant-catalog.js";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { createDefaultTenantFeatureFlags, TENANT_FEATURES_STORAGE_KEY } from "../../shared/index.js";

vi.mock("@rewindom/server-kernel/runtime/tenant-catalog.js", () => ({
  getServerTenantCatalog: vi.fn(),
}));

vi.mock("./tenant-json-setting.service.js", () => ({
  getTenantJsonSetting: vi.fn(),
  saveTenantJsonSetting: vi.fn(),
}));

import {
  getTenantFeatureFlags,
  saveTenantFeatureFlags,
} from "./tenant-feature.service.js";
import {
  getTenantJsonSetting,
  saveTenantJsonSetting,
} from "./tenant-json-setting.service.js";

const sampleCatalog = {
  modules: [],
  features: [
    {
      key: "advanced_analysis",
      label: "高级分析",
      description: "",
      disabled_hint: "",
      default_enabled: false,
      module_id: "notes",
    },
    {
      key: "custom_reports",
      label: "自定义报告",
      description: "",
      disabled_hint: "",
      default_enabled: false,
      module_id: "evidence-pack",
    },
  ],
};

describe("tenant-feature.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerTenantCatalog).mockReturnValue(sampleCatalog);
    vi.mocked(getTenantJsonSetting).mockResolvedValue({});
    vi.mocked(saveTenantJsonSetting).mockResolvedValue({});
  });

  it("should default all features when tenant_features is missing", async () => {
    const flags = await getTenantFeatureFlags("tenant-new");

    expect(flags).toEqual(createDefaultTenantFeatureFlags(sampleCatalog));
  });

  it("should read enabled flags from tenant_features storage", async () => {
    vi.mocked(getTenantJsonSetting).mockResolvedValue({
      advanced_analysis: true,
      custom_reports: true,
    });

    const flags = await getTenantFeatureFlags("tenant-a");

    expect(flags.advanced_analysis).toBe(true);
    expect(flags.custom_reports).toBe(true);
  });

  it("should save partial feature updates to tenant_features", async () => {
    vi.mocked(getTenantJsonSetting)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ custom_reports: true });
    vi.mocked(saveTenantJsonSetting).mockImplementation(
      async (_tenantId, key, value) => {
        expect(key).toBe(TENANT_FEATURES_STORAGE_KEY);
        expect(value).toEqual({ custom_reports: true });
        return value;
      },
    );

    const saved = await saveTenantFeatureFlags("tenant-a", {
      custom_reports: true,
    });

    expect(saved.custom_reports).toBe(true);
    expect(saveTenantJsonSetting).toHaveBeenCalledWith(
      "tenant-a",
      TENANT_FEATURES_STORAGE_KEY,
      { custom_reports: true },
    );
  });
});
