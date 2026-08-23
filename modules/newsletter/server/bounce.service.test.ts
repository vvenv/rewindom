import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const findFirst = vi.fn();

vi.mock("@rewindom/module-sdk/server", () => ({
  prisma: {
    newsletterSubscriber: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
    },
  },
  withTenantScope: (tenantId: string, where: Record<string, unknown>) => ({
    tenant_id: tenantId,
    ...where,
  }),
}));

const {
  clearBounceCount,
  handleBounce,
  handleComplaint,
  reactivateSubscriber,
} = await import("./bounce.service.js");

const TENANT = "t1";
const EMAIL = "reader@example.com";

beforeEach(() => {
  findFirst.mockReset();
  updateMany.mockReset();
  updateMany.mockResolvedValue({ count: 1 });
});

/** 最近一次 updateMany 写进去的 data。 */
function lastData(): Record<string, unknown> {
  return updateMany.mock.calls.at(-1)![0].data as Record<string, unknown>;
}

describe("handleBounce", () => {
  it("硬退信一次就停发", () => {
    findFirst.mockResolvedValue({
      id: "s1",
      bounce_count: 0,
      status: "confirmed",
    });
    return handleBounce({
      tenant_id: TENANT,
      email: EMAIL,
      bounce_type: "hard",
    }).then((result) => {
      expect(result).toBe("suppressed");
      expect(lastData().status).toBe("bounced");
      expect(lastData().suppressed_reason).toBe(
        "newsletter.suppressed.hard_bounce",
      );
    });
  });

  it("软退信前两次只计数，不停发", async () => {
    /*
     * 一次就停的话，对方邮箱满一天、或者他们的服务器抽风一次，
     * 我们就永久丢掉一个真实读者。
     */
    findFirst.mockResolvedValue({
      id: "s1",
      bounce_count: 0,
      status: "confirmed",
    });
    expect(
      await handleBounce({
        tenant_id: TENANT,
        email: EMAIL,
        bounce_type: "soft",
      }),
    ).toBe("counted");
    expect(lastData().status).toBeUndefined();
    expect(lastData().bounce_count).toBe(1);

    findFirst.mockResolvedValue({
      id: "s1",
      bounce_count: 1,
      status: "confirmed",
    });
    expect(
      await handleBounce({
        tenant_id: TENANT,
        email: EMAIL,
        bounce_type: "soft",
      }),
    ).toBe("counted");
  });

  it("软退信第三次才停发", async () => {
    findFirst.mockResolvedValue({
      id: "s1",
      bounce_count: 2,
      status: "confirmed",
    });
    expect(
      await handleBounce({
        tenant_id: TENANT,
        email: EMAIL,
        bounce_type: "soft",
      }),
    ).toBe("suppressed");
    expect(lastData().status).toBe("bounced");
    expect(lastData().suppressed_reason).toBe(
      "newsletter.suppressed.soft_bounce",
    );
  });

  it("找不到订阅者不算错误——这封信可能跟订阅无关", async () => {
    findFirst.mockResolvedValue(null);
    expect(
      await handleBounce({
        tenant_id: TENANT,
        email: EMAIL,
        bounce_type: "hard",
      }),
    ).toBe("unknown");
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("handleComplaint", () => {
  it("立刻停发，没有累计", async () => {
    expect(await handleComplaint({ tenant_id: TENANT, email: EMAIL })).toBe(
      "suppressed",
    );
    expect(lastData().status).toBe("complained");
    expect(lastData().suppressed_reason).toBe(
      "newsletter.suppressed.complaint",
    );
  });

  it("与退信是两个状态，不能混为一谈", async () => {
    // 投诉是内容/频率问题，退信是地址问题；混作一谈会让人改错方向
    await handleComplaint({ tenant_id: TENANT, email: EMAIL });
    expect(lastData().status).not.toBe("bounced");
  });
});

describe("clearBounceCount", () => {
  it("只清 confirmed 且计数大于零的行", async () => {
    await clearBounceCount({ tenant_id: TENANT, email: EMAIL });
    const where = updateMany.mock.calls.at(-1)![0].where as Record<
      string,
      unknown
    >;
    expect(where.status).toBe("confirmed");
    expect(where.bounce_count).toEqual({ gt: 0 });
    expect(lastData().bounce_count).toBe(0);
  });
});

describe("reactivateSubscriber", () => {
  it("退信的可以恢复，且回到当初确认过的状态", async () => {
    findFirst.mockResolvedValue({
      id: "s1",
      status: "bounced",
      confirmed_at: new Date(),
    });
    expect(await reactivateSubscriber(TENANT, "s1")).toBe("reactivated");
    expect(lastData().status).toBe("confirmed");
    expect(lastData().bounce_count).toBe(0);
  });

  it("没确认过的恢复成 pending——恢复不该顺手替人完成双重确认", async () => {
    findFirst.mockResolvedValue({
      id: "s1",
      status: "bounced",
      confirmed_at: null,
    });
    await reactivateSubscriber(TENANT, "s1");
    expect(lastData().status).toBe("pending");
  });

  it("投诉过的**不给**一键恢复", async () => {
    /*
     * 把一个刚举报过你的人重新加回名单，法律与声誉上都是站长在给自己挖坑。
     * 要恢复得手工改库——故意做得比点一下麻烦。
     */
    findFirst.mockResolvedValue({
      id: "s1",
      status: "complained",
      confirmed_at: new Date(),
    });
    expect(await reactivateSubscriber(TENANT, "s1")).toBe("complained");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("找不到就是 not_found", async () => {
    findFirst.mockResolvedValue(null);
    expect(await reactivateSubscriber(TENANT, "nope")).toBe("not_found");
  });
});
