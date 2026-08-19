import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeTranslationQuota,
  resetTranslationQuota,
} from "./rate-limit.js";

beforeEach(() => {
  resetTranslationQuota();
});

describe("consumeTranslationQuota", () => {
  const now = 1_700_000_000_000;

  it("窗口内累计，超额拒绝并给出重试秒数", () => {
    expect(consumeTranslationQuota("a", 500, now).allowed).toBe(true);
    const denied = consumeTranslationQuota("a", 200, now + 1000);
    expect(denied.allowed).toBe(false);
    expect(denied.retry_after_seconds).toBeGreaterThan(0);
  });

  it("拒绝时不吃掉额度 —— 小请求仍能通过", () => {
    consumeTranslationQuota("a", 590, now);
    expect(consumeTranslationQuota("a", 100, now).allowed).toBe(false);
    expect(consumeTranslationQuota("a", 10, now).allowed).toBe(true);
  });

  it("窗口过期后重置", () => {
    consumeTranslationQuota("a", 600, now);
    expect(consumeTranslationQuota("a", 1, now + 1000).allowed).toBe(false);
    expect(consumeTranslationQuota("a", 600, now + 61_000).allowed).toBe(true);
  });

  it("不同访客互不影响 —— 一个人刷不掉别人的额度", () => {
    consumeTranslationQuota("tenant:1.1.1.1", 600, now);
    expect(
      consumeTranslationQuota("tenant:2.2.2.2", 600, now).allowed,
    ).toBe(true);
  });
});
