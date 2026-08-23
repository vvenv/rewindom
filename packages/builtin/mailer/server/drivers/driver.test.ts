import { describe, expect, it } from "vitest";

import { isRetriableError, transportErrorMessage } from "./driver.js";

describe("错误分级", () => {
  /*
   * 两种协议的语义正好相反，混用一套判据就会在其中一边全错：
   * SMTP 的 5xx 是永久失败，HTTP 的 5xx 是临时失败。
   */
  it.each([
    [400, false],
    [401, false],
    [403, false],
    [422, false], // 域名未验证——重试一百次也还是没验证
    [429, true], // 限流，等一会儿再来
    [500, true],
    [503, true],
  ])("HTTP %i → 可重试 %s", (statusCode, expected) => {
    expect(isRetriableError({ statusCode })).toBe(expected);
  });

  it.each([
    [421, true],
    [450, true], // 对方暂时不收
    [500, false],
    [550, false], // 地址不存在
  ])("SMTP %i → 可重试 %s", (responseCode, expected) => {
    expect(isRetriableError({ responseCode })).toBe(expected);
  });

  it("HTTP 状态码优先于 SMTP 响应码", () => {
    // 同时带两个只可能是 HTTP driver 抛的，别被 SMTP 那条判据抢走
    expect(isRetriableError({ statusCode: 422, responseCode: 450 })).toBe(
      false,
    );
  });

  it("拿不到码就当连接级失败，可重试", () => {
    expect(isRetriableError(new Error("socket hang up"))).toBe(true);
    expect(isRetriableError(undefined)).toBe(true);
  });
});

describe("transportErrorMessage", () => {
  it("Error 取 message，其余转字符串", () => {
    expect(transportErrorMessage(new Error("boom"))).toBe("boom");
    expect(transportErrorMessage("plain")).toBe("plain");
  });
});
