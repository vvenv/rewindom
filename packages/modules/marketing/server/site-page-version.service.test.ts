/**
 * 版本历史。
 *
 * 守的是三条口径：只在发布时留档、按 version 修剪、恢复只落草稿不动线上。
 */

import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  recordPageVersion,
  restorePageVersion,
} from "./site-page-version.service.js";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingPageVersion: { findFirst: vi.fn() },
    marketingPage: { updateMany: vi.fn() },
  },
}));

const TENANT = "tenant-1";
const PAGE = "page-1";

/** 事务客户端的最小替身：只要能记下调用参数即可。 */
function makeTx() {
  return {
    marketingPageVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

const input = {
  tenant_id: TENANT,
  page_id: PAGE,
  title: "定价",
  description: "",
  sections: [{ id: "s1", type: "hero" }],
  settings: {},
  created_by: "amy",
};

beforeEach(() => vi.clearAllMocks());

describe("recordPageVersion", () => {
  it("第一版从 1 开始", async () => {
    const tx = makeTx();
    tx.marketingPageVersion.findFirst.mockResolvedValue(null);

    await recordPageVersion(tx as never, input);

    expect(tx.marketingPageVersion.create.mock.calls[0]![0].data.version).toBe(1);
  });

  it("在最新一版之后递增", async () => {
    const tx = makeTx();
    tx.marketingPageVersion.findFirst.mockResolvedValueOnce({ version: 7 });

    await recordPageVersion(tx as never, input);

    expect(tx.marketingPageVersion.create.mock.calls[0]![0].data.version).toBe(8);
  });

  it("存完整正文，不是 diff——任何一版都要能独立读出来", async () => {
    const tx = makeTx();
    tx.marketingPageVersion.findFirst.mockResolvedValue(null);

    await recordPageVersion(tx as never, input);

    const data = tx.marketingPageVersion.create.mock.calls[0]![0].data;
    expect(data.sections).toEqual(input.sections);
    expect(data.created_by).toBe("amy");
  });

  it("超出保留上限时按 version 修剪，不按时间戳", async () => {
    const tx = makeTx();
    tx.marketingPageVersion.findFirst
      .mockResolvedValueOnce({ version: 60 }) // 当前最新
      .mockResolvedValueOnce({ version: 10 }); // 第 50 版之外的那条

    await recordPageVersion(tx as never, input);

    const where = tx.marketingPageVersion.deleteMany.mock.calls[0]![0].where;
    expect(where.version).toEqual({ lte: 10 });
  });

  it("没超上限就不删任何东西", async () => {
    const tx = makeTx();
    tx.marketingPageVersion.findFirst
      .mockResolvedValueOnce({ version: 3 })
      .mockResolvedValueOnce(null);

    await recordPageVersion(tx as never, input);

    expect(tx.marketingPageVersion.deleteMany).not.toHaveBeenCalled();
  });
});

describe("restorePageVersion", () => {
  it("只写草稿列，线上正文一个字都不动", async () => {
    vi.mocked(prisma.marketingPageVersion.findFirst).mockResolvedValue({
      title: "旧标题",
      description: "旧描述",
      sections: [{ id: "s1", type: "hero" }],
      settings: {},
    } as never);
    vi.mocked(prisma.marketingPage.updateMany).mockResolvedValue({
      count: 1,
    } as never);

    await expect(restorePageVersion(TENANT, PAGE, 3)).resolves.toBe(true);

    const data = vi.mocked(prisma.marketingPage.updateMany).mock.calls[0]![0]!
      .data as Record<string, unknown>;
    expect(Object.keys(data).sort()).toEqual([
      "description_draft",
      "sections_draft",
      "settings_draft",
      "title_draft",
    ]);
  });

  it("版本不存在时不写任何东西", async () => {
    vi.mocked(prisma.marketingPageVersion.findFirst).mockResolvedValue(null);

    await expect(restorePageVersion(TENANT, PAGE, 99)).resolves.toBe(false);
    expect(prisma.marketingPage.updateMany).not.toHaveBeenCalled();
  });
});
