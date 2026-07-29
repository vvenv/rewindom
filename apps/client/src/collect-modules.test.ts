import { lazy } from "react";

import { LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";

import { collectAppRouteTrees, collectModuleNav } from "./collect-modules";

import type { ClientAppModule } from "@be-water/client-kit";

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
