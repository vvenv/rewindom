import { describe, expect, it } from "vitest";

import { buildAppShellConfig } from "@/app-shell-config";
import { ENABLED_CLIENT_MODULES } from "@/enabled-modules";

/**
 * 壳层组装契约。
 *
 * 只验证「模块贡献能被正确聚合」；具体业务路由/标题由产品仓覆盖。
 */
describe("buildAppShellConfig", () => {
  const config = buildAppShellConfig(ENABLED_CLIENT_MODULES);

  it("聚合已启用模块的平台导航", () => {
    const outline = config.platformNavEntries.map((entry) =>
      entry.type === "link"
        ? { type: "link", to: entry.to }
        : {
            type: "group",
            key: entry.key,
            children: entry.children.map((child) => child.to),
          },
    );

    expect(outline).toEqual([
      { type: "link", to: "/platform" },
      {
        type: "group",
        key: "tenant-admin",
        children: ["/platform/tenants", "/platform/users"],
      },
      {
        type: "group",
        key: "commerce",
        children: ["/platform/plans", "/platform/billing"],
      },
      {
        type: "group",
        key: "observability",
        children: [
          "/platform/audit-logs",
          "/platform/error-logs",
          "/platform/slow-query-logs",
          "/platform/backup",
        ],
      },
      {
        type: "group",
        key: "settings",
        children: ["/platform/admins", "/platform/settings"],
      },
    ]);
  });

  it("聚合各模块的 shell 贡献", () => {
    expect(Array.isArray(config.shellContributions.shellProviders)).toBe(true);
    expect(Array.isArray(config.shellContributions.mobileHeaderRoutes)).toBe(
      true,
    );
  });

  it("暴露登录落地页候选（含 tenantModule，便于跳过禁用模块）", () => {
    expect(config.homePathCandidates.length).toBeGreaterThan(0);
    expect(
      config.homePathCandidates.every(
        (candidate) => typeof candidate.path === "string",
      ),
    ).toBe(true);
    expect(
      config.homePathCandidates.some(
        (candidate) => candidate.tenantModule === "notes",
      ),
    ).toBe(true);
  });

  it("未匹配任何模块路由时回退到导航标签", () => {
    const state = config.resolveMobileHeaderState("/unknown-route");
    expect(state).toHaveProperty("title");
  });
});
