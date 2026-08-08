import { configureServerTenantCatalog, getServerTenantCatalog  } from "@be-water/server-kernel/runtime/tenant-catalog.js";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { TENANT_MODULES_STORAGE_KEY, createDefaultTenantModuleFlags } from "../../shared/index.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

/**
 * 本地 fixture：platform 是基础设施模块，既不能依赖业务模块（be-water），
 * 也不能依赖宿主 app（@be-water/server）。这里只声明本测试断言所需的
 * entitlement / feature，与真实 catalog 的具体内容解耦。
 */
const FIXTURE_MODULES: readonly ServerAppModule[] = [
  {
    id: "fixture-business",
    version: "1.0.0",
    label: "Fixture Business",
    kind: "business",
    tenantEntitlements: [
      {
        key: "chat",
        label: "对话",
        description: "fixture",
        disabled_hint: "未开通",
        default_enabled: true,
        features: [
          {
            key: "chat",
            label: "对话功能",
            description: "fixture",
            disabled_hint: "未开通",
            default_enabled: true,
          },
        ],
      },
      {
        key: "notes",
        label: "分析",
        description: "fixture",
        disabled_hint: "未开通",
        default_enabled: true,
        features: [
          {
            key: "advanced_analysis",
            label: "高级分析",
            description: "fixture",
            disabled_hint: "未开通",
            default_enabled: false,
          },
        ],
      },
    ],
  },
];

configureServerTenantCatalog(FIXTURE_MODULES);

vi.mock("./tenant-json-setting.service.js", () => ({
  getTenantJsonSetting: vi.fn(),
  saveTenantJsonSetting: vi.fn(),
}));

import {
  isTenantFeatureEnabled,
  getTenantFeatureFlags,
} from "./tenant-feature.service.js";
import { getTenantJsonSetting } from "./tenant-json-setting.service.js";
import { getTenantModuleFlags } from "./tenant-module.service.js";

describe("tenant-module.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantJsonSetting).mockResolvedValue({});
  });

  it("should default all modules when tenant_modules is missing", async () => {
    const flags = await getTenantModuleFlags("tenant-new");
    const defaults = createDefaultTenantModuleFlags(
      getServerTenantCatalog().modules,
    );

    expect(flags).toEqual(defaults);
  });
});

describe("tenant feature module inheritance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantJsonSetting).mockImplementation(async (_tenantId, key) => {
      if (key === TENANT_MODULES_STORAGE_KEY) {
        return { chat: false };
      }
      return { chat: true };
    });
  });

  it("should treat feature as disabled when owning module is disabled", async () => {
    const enabled = await isTenantFeatureEnabled("tenant-a", "chat");
    expect(enabled).toBe(false);
  });

  it("should still resolve stored feature flags when module is enabled", async () => {
    vi.mocked(getTenantJsonSetting).mockImplementation(async (_tenantId, key) => {
      if (key === TENANT_MODULES_STORAGE_KEY) {
        return {};
      }
      return { advanced_analysis: true };
    });

    const flags = await getTenantFeatureFlags("tenant-a");
    expect(flags.advanced_analysis).toBe(true);
  });
});
