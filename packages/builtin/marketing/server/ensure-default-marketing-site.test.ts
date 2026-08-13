import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureDefaultMarketingDocs } from "./ensure-default-marketing-site.js";
import { loadUsageDocs } from "./load-usage-docs.js";
import { seedDocsFromFiles } from "./marketing-doc.service.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    marketingDoc: { findMany: vi.fn() },
  },
}));

vi.mock("./marketing-doc.service.js", () => ({
  seedDocsFromFiles: vi.fn(async () => []),
}));

const findMany = vi.mocked(prisma.marketingDoc.findMany);
const seed = vi.mocked(seedDocsFromFiles);

/** 已发布文档的语言（`distinct: ["locale"]` 的返回形状）。 */
function published(...locales: string[]): void {
  findMany.mockResolvedValue(
    locales.map((locale) => ({ locale })) as never,
  );
}

describe("ensureDefaultMarketingDocs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空库时铺全部语言", async () => {
    published();
    await ensureDefaultMarketingDocs();
    expect(seed).toHaveBeenCalledTimes(1);
    const [tenantId, files] = seed.mock.calls[0]!;
    expect(tenantId).toBe(DEFAULT_TENANT_ID);
    expect(files).toHaveLength(loadUsageDocs().length);
  });

  it("已有中文时只补英文——整库一刀切会让英文永远铺不进去", async () => {
    published("zh-CN");
    await ensureDefaultMarketingDocs();
    const [, files] = seed.mock.calls[0]!;
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((file) => file.locale === "en")).toBe(true);
  });

  it("两种语言都有了就完全不写——不覆盖租户后来的编辑", async () => {
    published("zh-CN", "en");
    await ensureDefaultMarketingDocs();
    expect(seed).not.toHaveBeenCalled();
  });
});
