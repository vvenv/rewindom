import { beforeEach, describe, expect, it, vi } from "vitest";

const settingFindFirst = vi.fn();
const settingUpsert = vi.fn();

vi.mock("@rewindom/module-sdk/server", async () => {
  const actual = await vi.importActual<
    typeof import("@rewindom/module-sdk/server")
  >("@rewindom/module-sdk/server");
  return {
    ...actual,
    prisma: {
      tenantSetting: { findFirst: settingFindFirst, upsert: settingUpsert },
    },
    withTenantScope: (tenantId: string, rest: object = {}) => ({
      tenant_id: tenantId,
      ...rest,
    }),
  };
});

const { getEnabledTopics, updateEnabledTopics } = await import(
  "./topic-settings.service.js"
);
const { ENABLED_TOPICS_SETTING, EVENT_TOPICS } = await import(
  "../../shared/index.js"
);

beforeEach(() => {
  vi.clearAllMocks();
  settingFindFirst.mockResolvedValue(null);
  settingUpsert.mockResolvedValue({});
});

describe("getEnabledTopics", () => {
  it("没有设置行时全开", async () => {
    expect(await getEnabledTopics("t1")).toEqual([...EVENT_TOPICS]);
  });

  it("读出合法子集并按产品顺序排", async () => {
    settingFindFirst.mockResolvedValue({ value: ["sports", "ai"] });
    expect(await getEnabledTopics("t1")).toEqual(["ai", "sports"]);
  });
});

describe("updateEnabledTopics", () => {
  it("空列表拒绝", async () => {
    await expect(updateEnabledTopics("t1", { enabled_topics: [] })).rejects.toMatchObject({
      code: "events.topics_required",
      status: 400,
    });
    expect(settingUpsert).not.toHaveBeenCalled();
  });

  it("写入去重后的产品顺序", async () => {
    const result = await updateEnabledTopics("t1", {
      enabled_topics: ["sports", "ai", "ai"],
    });
    expect(result.enabled_topics).toEqual(["ai", "sports"]);
    expect(settingUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id_key: { tenant_id: "t1", key: ENABLED_TOPICS_SETTING },
        },
        create: expect.objectContaining({ value: ["ai", "sports"] }),
      }),
    );
  });
});
