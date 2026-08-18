import { LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";

import { collectPlatformNav } from "./collect-platform-nav";

import type { ClientAppModule, PlatformNavEntry } from "@rewindom/client-kit";

function summary(entries: readonly PlatformNavEntry[]): unknown[] {
  return entries.map((entry) => {
    if (entry.type === "link") {
      return { type: "link", to: entry.to, label: entry.label };
    }
    return {
      type: "group",
      key: entry.key,
      label: entry.label,
      children: entry.children.map((child) => child.to),
    };
  });
}

function moduleWithNav(
  id: string,
  platformNav: NonNullable<ClientAppModule["client"]>["platformNav"],
): ClientAppModule {
  return {
    id,
    version: "1.0.0",
    label: id,
    kind: "infrastructure",
    client: { platformNav },
  };
}

describe("collectPlatformNav", () => {
  it("assembles shell groups in operator order and hides empty ones", () => {
    const entries = collectPlatformNav([]);

    expect(summary(entries)).toEqual([
      { type: "link", to: "/platform", label: "platform:nav.dashboard" },
      {
        type: "group",
        key: "tenant-admin",
        label: "platform:nav.groupTenant",
        children: ["/platform/tenants", "/platform/users"],
      },
      {
        type: "group",
        key: "settings",
        label: "platform:nav.groupSettings",
        children: ["/platform/admins", "/platform/settings"],
      },
    ]);
  });

  it("merges commerce and observability children by order", () => {
    const entries = collectPlatformNav([
      moduleWithNav("billing", [
        {
          kind: "group-children",
          group: "commerce",
          order: 20,
          children: [{ to: "/platform/billing", label: "billing:nav.billing" }],
        },
      ]),
      moduleWithNav("platform", [
        {
          kind: "group-children",
          group: "commerce",
          order: 10,
          children: [{ to: "/platform/plans", label: "platform:nav.plans" }],
        },
        {
          kind: "group-children",
          group: "observability",
          order: 200,
          children: [{ to: "/platform/backup", label: "platform:nav.backup" }],
        },
      ]),
      moduleWithNav("audit", [
        {
          kind: "group-children",
          group: "observability",
          children: [
            { to: "/platform/audit-logs", label: "audit:nav.auditLogs" },
          ],
        },
      ]),
    ]);

    expect(summary(entries)).toEqual([
      { type: "link", to: "/platform", label: "platform:nav.dashboard" },
      {
        type: "group",
        key: "tenant-admin",
        label: "platform:nav.groupTenant",
        children: ["/platform/tenants", "/platform/users"],
      },
      {
        type: "group",
        key: "commerce",
        label: "platform:nav.groupCommerce",
        children: ["/platform/plans", "/platform/billing"],
      },
      {
        type: "group",
        key: "observability",
        label: "platform:nav.groupObservability",
        children: ["/platform/audit-logs", "/platform/backup"],
      },
      {
        type: "group",
        key: "settings",
        label: "platform:nav.groupSettings",
        children: ["/platform/admins", "/platform/settings"],
      },
    ]);
  });

  it("keeps leftover root links after the dashboard", () => {
    const entries = collectPlatformNav([
      moduleWithNav("extra", [
        {
          kind: "link",
          order: 10,
          to: "/platform/extra",
          label: "extra",
          icon: LayoutDashboard,
        },
      ]),
    ]);

    expect(summary(entries)[1]).toEqual({
      type: "link",
      to: "/platform/extra",
      label: "extra",
    });
  });
});
