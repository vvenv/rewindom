import { describe, expect, it } from "vitest";

import { collectTenantCatalogFromManifests } from "./tenant-catalog.js";

import type { ModuleManifestBase } from "./module-contract.js";

describe("collectTenantCatalogFromManifests", () => {
  it("keys the catalog by entitlement key, not by module id", () => {
    const catalog = collectTenantCatalogFromManifests([
      {
        id: "notes",
        version: "1.0.0",
        label: "Notes",
        kind: "business",
        tenantEntitlements: [
          {
            key: "notes",
            label: "笔记",
            description: "租户内笔记管理",
            disabled_hint: "未开通笔记模块",
            default_enabled: true,
            features: [
              {
                key: "notes_export",
                label: "笔记导出",
                description: "批量导出",
                disabled_hint: "未开通笔记导出",
                default_enabled: false,
              },
            ],
          },
          {
            key: "reports",
            label: "报表",
            description: "租户报表",
            disabled_hint: "未开通报表",
            default_enabled: true,
          },
        ],
      } satisfies ModuleManifestBase,
    ]);

    expect(catalog.modules.map((m) => m.module_id).sort()).toEqual([
      "notes",
      "reports",
    ]);
    expect(catalog.features).toHaveLength(1);
    expect(catalog.features[0]?.module_id).toBe("notes");
  });

  it("collects features from an entitlement that gates nothing else", () => {
    const catalog = collectTenantCatalogFromManifests([
      {
        id: "notes",
        version: "1.0.0",
        label: "Notes",
        kind: "business",
        tenantEntitlements: [
          {
            key: "settings",
            label: "租户设置与 API",
            description: "租户设置",
            disabled_hint: "未开通",
            default_enabled: true,
            features: [
              {
                key: "reports_export",
                label: "API 访问",
                description: "对外 API",
                disabled_hint: "未开通 API 访问",
                default_enabled: false,
              },
            ],
          },
        ],
      } satisfies ModuleManifestBase,
    ]);

    expect(catalog.features.map((f) => f.key)).toEqual(["reports_export"]);
  });

  it("ignores modules that declare no entitlements", () => {
    const catalog = collectTenantCatalogFromManifests([
      {
        id: "rbac",
        version: "1.0.0",
        label: "RBAC",
        kind: "infrastructure",
      } satisfies ModuleManifestBase,
    ]);

    expect(catalog.modules).toHaveLength(0);
    expect(catalog.features).toHaveLength(0);
  });
});
