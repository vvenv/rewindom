import { describe, expect, it } from "vitest";

import {
  PLATFORM_HOME_PATH,
  buildPlatformConsoleUrl,
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
