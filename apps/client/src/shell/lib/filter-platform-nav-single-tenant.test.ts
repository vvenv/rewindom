import { describe, expect, it } from "vitest";

import { filterPlatformNavForSingleTenant } from "./filter-platform-nav-single-tenant.js";

import type { PlatformNavEntry } from "@rewindom/client-kit";

const entries: readonly PlatformNavEntry[] = [
  {
    type: "link",
    to: "/platform",
    label: "dashboard",
    icon: () => null,
    end: true,
  },
  {
    type: "group",
    key: "tenant-admin",
    label: "tenants",
    icon: () => null,
    children: [
      { to: "/platform/tenants", label: "tenants", end: true },
      { to: "/platform/users", label: "users", end: true },
    ],
  },
];

describe("filterPlatformNavForSingleTenant", () => {
  it("removes tenants nav and keeps users", () => {
    const filtered = filterPlatformNavForSingleTenant(entries);
    expect(filtered).toHaveLength(2);
    const group = filtered[1];
    expect(group?.type).toBe("group");
    if (group?.type === "group") {
      expect(group.children.map((child) => child.to)).toEqual([
        "/platform/users",
      ]);
    }
  });
});
