import { lazy } from "react";

import { LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  collectAppRouteTrees,
  collectDashboardWidgets,
  collectModuleNav,
  collectPlatformDashboardSections,
  collectTenantSettingsPanels,
} from "./collect-modules";
import { ENABLED_CLIENT_MODULES } from "./enabled-modules";

import type { ClientAppModule } from "@rewindom/client-kit";

const StubPage = lazy(() => Promise.resolve({ default: () => null }));

describe("collect-modules", () => {
  it("merges nav sections from enabled modules", () => {
    const modules: ClientAppModule[] = [
      {
        id: "a",
        version: "1.0.0",
        label: "A",
        kind: "business",
        client: {
          nav: [
            {
              label: "Section A",
              items: [{ icon: LayoutDashboard, label: "Dash", path: "/a" }],
            },
          ],
        },
      },
      {
        id: "b",
        version: "1.0.0",
        label: "B",
        kind: "business",
        client: {
          nav: [
            {
              label: "Section B",
              items: [{ icon: LayoutDashboard, label: "B", path: "/b" }],
            },
          ],
        },
      },
    ];

    const nav = collectModuleNav(modules);
    expect(nav).toHaveLength(2);
    expect(nav[0]!.label).toBe("Section A");
    expect(nav[1]!.label).toBe("Section B");
  });

  it("merges nav items under the same section label", () => {
    const modules: ClientAppModule[] = [
      {
        id: "a",
        version: "1.0.0",
        label: "A",
        kind: "business",
        client: {
          nav: [
            {
              label: "知识",
              items: [{ icon: LayoutDashboard, label: "A", path: "/a" }],
            },
          ],
        },
      },
      {
        id: "b",
        version: "1.0.0",
        label: "B",
        kind: "business",
        client: {
          nav: [
            {
              label: "知识",
              items: [{ icon: LayoutDashboard, label: "B", path: "/b" }],
            },
          ],
        },
      },
    ];

    const nav = collectModuleNav(modules);
    expect(nav).toHaveLength(1);
    expect(nav[0]!.items).toHaveLength(2);
  });

  it("preserves placement:end when merging sections with the same label", () => {
    const modules: ClientAppModule[] = [
      {
        id: "rbac",
        version: "1.0.0",
        label: "RBAC",
        kind: "infrastructure",
        client: {
          nav: [
            {
              label: "系统管理",
              placement: "end",
              items: [{ icon: LayoutDashboard, label: "角色", path: "/roles" }],
            },
          ],
        },
      },
      {
        id: "user",
        version: "1.0.0",
        label: "User",
        kind: "infrastructure",
        client: {
          nav: [
            {
              label: "系统管理",
              placement: "end",
              items: [{ icon: LayoutDashboard, label: "用户", path: "/users" }],
            },
          ],
        },
      },
      {
        id: "notes",
        version: "1.0.0",
        label: "Notes",
        kind: "business",
        client: {
          nav: [
            {
              label: "示例",
              items: [{ icon: LayoutDashboard, label: "笔记", path: "/notes" }],
            },
          ],
        },
      },
    ];

    const nav = collectModuleNav(modules);
    expect(nav.find((s) => s.label === "系统管理")?.placement).toBe("end");
    expect(nav.find((s) => s.label === "示例")?.placement).toBeUndefined();
  });

  it("sorts sections by order, not module registration order", () => {
    const modules: ClientAppModule[] = [
      {
        id: "shop",
        version: "1.0.0",
        label: "Shop",
        kind: "business",
        client: {
          nav: [
            {
              label: "商店",
              order: 40,
              items: [{ icon: LayoutDashboard, label: "商品", path: "/shop" }],
            },
          ],
        },
      },
      {
        id: "dashboard",
        version: "1.0.0",
        label: "Dashboard",
        kind: "infrastructure",
        client: {
          nav: [
            {
              label: "概览",
              order: 10,
              items: [
                { icon: LayoutDashboard, label: "工作台", path: "/dashboard" },
              ],
            },
          ],
        },
      },
      {
        id: "audience",
        version: "1.0.0",
        label: "Audience",
        kind: "business",
        client: {
          nav: [
            {
              label: "受众",
              order: 30,
              items: [{ icon: LayoutDashboard, label: "会员", path: "/members" }],
            },
          ],
        },
      },
    ];

    expect(collectModuleNav(modules).map((section) => section.label)).toEqual([
      "概览",
      "受众",
      "商店",
    ]);
  });

  it("takes the minimum declared order when merging the same label", () => {
    const modules: ClientAppModule[] = [
      {
        id: "later",
        version: "1.0.0",
        label: "Later",
        kind: "business",
        client: {
          nav: [
            {
              label: "受众",
              order: 80,
              items: [{ icon: LayoutDashboard, label: "收款", path: "/pay" }],
            },
          ],
        },
      },
      {
        id: "canonical",
        version: "1.0.0",
        label: "Canonical",
        kind: "business",
        client: {
          nav: [
            {
              label: "受众",
              order: 30,
              items: [{ icon: LayoutDashboard, label: "会员", path: "/members" }],
            },
          ],
        },
      },
    ];

    const nav = collectModuleNav(modules);
    expect(nav).toHaveLength(1);
    expect(nav[0]!.order).toBe(30);
    expect(nav[0]!.items).toHaveLength(2);
  });

  it("ignores undeclared order so a later explicit order is not pinned to 100", () => {
    const modules: ClientAppModule[] = [
      {
        id: "ip-access",
        version: "1.0.0",
        label: "IP Access",
        kind: "infrastructure",
        client: {
          nav: [
            {
              label: "系统管理",
              items: [{ icon: LayoutDashboard, label: "访问控制", path: "/ip" }],
            },
          ],
        },
      },
      {
        id: "user",
        version: "1.0.0",
        label: "User",
        kind: "infrastructure",
        client: {
          nav: [
            {
              label: "系统管理",
              placement: "end",
              order: 900,
              items: [{ icon: LayoutDashboard, label: "用户", path: "/users" }],
            },
          ],
        },
      },
      {
        id: "notes",
        version: "1.0.0",
        label: "Notes",
        kind: "business",
        client: {
          nav: [
            {
              label: "示例",
              order: 200,
              items: [{ icon: LayoutDashboard, label: "笔记", path: "/notes" }],
            },
          ],
        },
      },
    ];

    const nav = collectModuleNav(modules);
    expect(nav.map((section) => section.label)).toEqual(["示例", "系统管理"]);
    expect(nav.find((section) => section.label === "系统管理")).toMatchObject({
      placement: "end",
      order: 900,
    });
  });

  it("assembles tenant nav in product IA order", () => {
    const nav = collectModuleNav(ENABLED_CLIENT_MODULES);
    expect(nav.map((section) => section.label)).toEqual([
      "dashboard:nav.sectionOverview",
      "marketing:cms.navSection",
      "common:nav.audience",
      "shop:nav.shop",
      "events:nav.section",
      "content:nav.section",
      "common:nav.examples",
      "common:nav.systemManagement",
      "common:nav.systemMonitoring",
    ]);
    expect(
      nav
        .find((section) => section.label === "marketing:cms.navSection")
        ?.items.map((item) => item.path),
    ).toEqual(["/app/site", "/app/site/media", "/app/docs", "/app/site-form"]);
    expect(
      nav
        .find((section) => section.label === "common:nav.audience")
        ?.items.map((item) => item.path),
    ).toEqual([
      "/app/site-members",
      "/app/site-billing",
      "/app/site-billing/records",
      "/app/newsletter",
    ]);
    expect(nav.find((section) => section.label === "common:nav.systemManagement")?.placement).toBe(
      "end",
    );
    expect(nav.find((section) => section.label === "common:nav.systemMonitoring")?.placement).toBe(
      "end",
    );
  });

  it("collects dashboard widgets in module order and drops duplicate ids", () => {
    const Widget = () => null;
    const modules: ClientAppModule[] = [
      {
        id: "notes",
        version: "1.0.0",
        label: "Notes",
        kind: "business",
        client: {
          dashboardWidgets: [
            {
              id: "notes.recent",
              title: "notes:dashboardTitle",
              component: Widget,
              order: 20,
            },
          ],
        },
      },
      {
        id: "todos",
        version: "1.0.0",
        label: "Todos",
        kind: "business",
        client: {
          dashboardWidgets: [
            {
              id: "todos.pending",
              title: "todos:dashboardTitle",
              component: Widget,
            },
            // 复制粘贴出来的重复 id：只保留先注册的那个
            {
              id: "notes.recent",
              title: "notes:dashboardTitle",
              component: Widget,
              order: 99,
            },
          ],
        },
      },
      {
        id: "rbac",
        version: "1.0.0",
        label: "RBAC",
        kind: "infrastructure",
        client: {},
      },
    ];

    const widgets = collectDashboardWidgets(modules);
    expect(widgets.map((widget) => widget.id)).toEqual([
      "notes.recent",
      "todos.pending",
    ]);
    expect(widgets[0]!.order).toBe(20);
  });

  it("collects platform dashboard sections in module order and drops duplicate ids", () => {
    const Section = () => null;
    const modules: ClientAppModule[] = [
      {
        id: "slow-query",
        version: "1.0.0",
        label: "Slow Query",
        kind: "infrastructure",
        client: {
          platformDashboardSections: [
            {
              id: "slow-query.stats",
              order: 10,
              component: Section,
            },
          ],
        },
      },
      {
        id: "slow-request",
        version: "1.0.0",
        label: "Slow Request",
        kind: "infrastructure",
        client: {
          platformDashboardSections: [
            {
              id: "slow-request.stats",
              order: 20,
              component: Section,
            },
            {
              id: "slow-query.stats",
              order: 99,
              component: Section,
            },
          ],
        },
      },
    ];

    const sections = collectPlatformDashboardSections(modules);
    expect(sections.map((section) => section.id)).toEqual([
      "slow-query.stats",
      "slow-request.stats",
    ]);
    expect(sections[0]!.order).toBe(10);
  });

  it("collects tenant settings panels in module order and drops duplicate ids", () => {
    const Panel = () => null;
    const Other = () => null;
    const modules: ClientAppModule[] = [
      {
        id: "translation",
        version: "1.0.0",
        label: "Content Translation",
        kind: "infrastructure",
        client: {
          tenantSettingsPanels: [
            { id: "translation.settings", order: 120, component: Panel },
          ],
        },
      },
      {
        id: "other",
        version: "1.0.0",
        label: "Other",
        kind: "infrastructure",
        client: {
          tenantSettingsPanels: [
            { id: "other.settings", order: 130, component: Other },
            { id: "translation.settings", order: 99, component: Other },
          ],
        },
      },
    ];

    const panels = collectTenantSettingsPanels(modules);
    expect(panels.map((panel) => panel.id)).toEqual([
      "translation.settings",
      "other.settings",
    ]);
    expect(panels[0]!.component).toBe(Panel);
  });

  it("collects route trees by mount point", () => {
    const modules: ClientAppModule[] = [
      {
        id: "kernel",
        version: "1",
        label: "Kernel",
        kind: "infrastructure",
        client: {
          renderGuestRoutes: () => "guest",
        },
      },
      {
        id: "marketing",
        version: "1",
        label: "Marketing",
        kind: "infrastructure",
        client: {
          renderPublicRoutes: () => "public",
        },
      },
      {
        id: "notes",
        version: "1",
        label: "Notes",
        kind: "business",
        client: {
          renderRoutes: () => "tenant",
        },
      },
      {
        id: "user",
        version: "1",
        label: "User",
        kind: "infrastructure",
        client: {
          renderSuperUserRoutes: () => "superuser",
        },
      },
      {
        id: "platform",
        version: "1",
        label: "Platform",
        kind: "infrastructure",
        client: {
          renderPlatformRoutes: () => "platform",
        },
      },
    ];

    expect(collectAppRouteTrees(modules)).toEqual({
      publicRoutes: ["public"],
      guestRoutes: ["guest"],
      tenantRoutes: ["tenant"],
      superUserRoutes: ["superuser"],
      platformRoutes: ["platform"],
    });
  });

  it("prefers renderTenantRoutes over renderRoutes for tenant mount", () => {
    const modules: ClientAppModule[] = [
      {
        id: "notes",
        version: "1",
        label: "Notes",
        kind: "business",
        client: {
          renderTenantRoutes: () => "tenant-specific",
          renderRoutes: () => "tenant-alias",
        },
      },
    ];

    expect(collectAppRouteTrees(modules).tenantRoutes).toEqual([
      "tenant-specific",
    ]);
  });

  it("collects declarative tenant routes alongside imperative routes", () => {
    const modules: ClientAppModule[] = [
      {
        id: "notes",
        version: "1",
        label: "Notes",
        kind: "business",
        client: {
          renderRoutes: () => "imperative",
          routes: [{ path: "/notes", element: StubPage }],
        },
      },
    ];

    const tenantRoutes = collectAppRouteTrees(modules).tenantRoutes;
    expect(tenantRoutes).toHaveLength(2);
    expect((tenantRoutes as unknown[])[0]).toBe("imperative");
    expect((tenantRoutes as unknown[])[1]).toBeTruthy();
  });
});
