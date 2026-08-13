import { prismaMock } from "@rewindom/server-test/register-prisma-mock";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getDashboardPreference,
  resetDashboardPreference,
  saveDashboardPreference,
} from "./dashboard-preference.service.js";

import type { PrismaClient } from "@rewindom/server-kernel/generated/prisma/client/client.js";

const prisma = prismaMock as unknown as PrismaClient;
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const WHERE = {
  where: { tenant_id_user_id: { tenant_id: TENANT_ID, user_id: USER_ID } },
};

describe("getDashboardPreference", () => {
  beforeEach(() => {
    prismaMock.__reset();
  });

  it("returns an empty preference when the user never configured anything", async () => {
    prismaMock.dashboardPreference.findUnique.mockResolvedValueOnce(null);

    await expect(
      getDashboardPreference(prisma, TENANT_ID, USER_ID),
    ).resolves.toEqual({
      hidden_widgets: [],
      widget_order: [],
      updated_at: null,
    });
    expect(prismaMock.dashboardPreference.findUnique).toHaveBeenCalledWith(
      WHERE,
    );
  });

  it("normalizes rows left behind by uninstalled modules", async () => {
    prismaMock.dashboardPreference.findUnique.mockResolvedValueOnce({
      hidden_widgets: ["a", "a", "  "],
      widget_order: ["a", "b", "a"],
      updated_at: new Date("2026-08-10T00:00:00.000Z"),
    });

    await expect(
      getDashboardPreference(prisma, TENANT_ID, USER_ID),
    ).resolves.toEqual({
      hidden_widgets: ["a"],
      widget_order: ["a", "b"],
      updated_at: "2026-08-10T00:00:00.000Z",
    });
  });
});

describe("saveDashboardPreference", () => {
  beforeEach(() => {
    prismaMock.__reset();
  });

  it("upserts one row per (tenant, user) and normalizes the payload", async () => {
    prismaMock.dashboardPreference.upsert.mockResolvedValueOnce({
      hidden_widgets: ["note.recent"],
      widget_order: ["todo.pending", "note.recent"],
      updated_at: new Date("2026-08-10T00:00:00.000Z"),
    });

    await saveDashboardPreference(prisma, TENANT_ID, USER_ID, {
      hidden_widgets: ["note.recent", "note.recent"],
      widget_order: ["todo.pending", "note.recent"],
    });

    expect(prismaMock.dashboardPreference.upsert).toHaveBeenCalledWith({
      ...WHERE,
      create: {
        tenant_id: TENANT_ID,
        user_id: USER_ID,
        hidden_widgets: ["note.recent"],
        widget_order: ["todo.pending", "note.recent"],
      },
      update: {
        hidden_widgets: ["note.recent"],
        widget_order: ["todo.pending", "note.recent"],
      },
    });
  });
});

describe("resetDashboardPreference", () => {
  beforeEach(() => {
    prismaMock.__reset();
  });

  it("deletes the row so the user falls back to module defaults", async () => {
    prismaMock.dashboardPreference.deleteMany.mockResolvedValueOnce({
      count: 1,
    });

    await expect(
      resetDashboardPreference(prisma, TENANT_ID, USER_ID),
    ).resolves.toEqual({
      hidden_widgets: [],
      widget_order: [],
      updated_at: null,
    });
    expect(prismaMock.dashboardPreference.deleteMany).toHaveBeenCalledWith({
      where: { tenant_id: TENANT_ID, user_id: USER_ID },
    });
  });
});
