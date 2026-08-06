import { describe, expect, it } from "vitest";

import {
  PLATFORM_HOME_PATH,
  buildPlatformConsoleUrl,
  isPlatformConsoleOrigin,
} from "./platform-console-url.js";

describe("buildPlatformConsoleUrl", () => {
  it("无 PLATFORM_URL 时回落相对路径", () => {
    expect(buildPlatformConsoleUrl(null)).toBe(PLATFORM_HOME_PATH);
    expect(buildPlatformConsoleUrl("")).toBe(PLATFORM_HOME_PATH);
  });

  it("拼接绝对控制台入口并去掉尾斜杠", () => {
    expect(buildPlatformConsoleUrl("https://platform.example.com/")).toBe(
      "https://platform.example.com/platform",
    );
  });
});

describe("isPlatformConsoleOrigin", () => {
  it("匹配 PLATFORM_URL 的 origin", () => {
    expect(
      isPlatformConsoleOrigin(
        "https://console.example.com/",
        "https://console.example.com",
      ),
    ).toBe(true);
  });

  // 陌生 Host 也没有绑定租户，但它不是控制台
  it("其它 origin 一律不是控制台", () => {
    expect(
      isPlatformConsoleOrigin(
        "https://console.example.com",
        "https://random.example.org",
      ),
    ).toBe(false);
  });

  // 没配 PLATFORM_URL = 控制台与应用同源，与 buildPlatformConsoleUrl 的兜底一致
  it("没配 PLATFORM_URL 时任何 origin 都算控制台", () => {
    expect(isPlatformConsoleOrigin(null, "https://anything.example")).toBe(true);
    expect(isPlatformConsoleOrigin("  ", "https://anything.example")).toBe(true);
  });

  it("配歪的 PLATFORM_URL 不抛", () => {
    expect(isPlatformConsoleOrigin("not a url", "https://x.example")).toBe(
      false,
    );
  });
});
