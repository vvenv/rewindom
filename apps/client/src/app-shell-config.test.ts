import { describe, expect, it } from "vitest";

import { buildAppShellConfig } from "@/app-shell-config";
import { ENABLED_CLIENT_MODULES } from "@/enabled-modules";

/**
 * 壳层组装契约。
 *
 * 上游不含业务模块，故不断言具体路由/标题（那属于下游产品仓）——
 * 只验证「模块贡献能被正确聚合」这条机制本身。
 */
describe("buildAppShellConfig", () => {
  const config = buildAppShellConfig(ENABLED_CLIENT_MODULES);

  it("聚合已启用模块的平台导航", () => {
    expect(config.platformNavEntries.length).toBeGreaterThan(0);
    expect(
      config.platformNavEntries.some(
        (entry) => entry.type === "link" && entry.to === "/platform/settings",
      ),
    ).toBe(true);
  });

  it("聚合各模块的 shell 贡献", () => {
    expect(Array.isArray(config.shellContributions.shellProviders)).toBe(true);
    expect(Array.isArray(config.shellContributions.mobileHeaderRoutes)).toBe(
      true,
    );
  });

  it("未匹配任何模块路由时回退到导航标签", () => {
    const state = config.resolveMobileHeaderState("/unknown-route");
    expect(state).toHaveProperty("title");
  });
});
