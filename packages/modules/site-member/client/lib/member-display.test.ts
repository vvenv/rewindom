import { describe, expect, it } from "vitest";

import { memberDisplayName, memberInitials } from "./member-display.js";

function member(display_name: string, email = "ada@example.com") {
  return { display_name, email };
}

describe("memberDisplayName", () => {
  it("prefers the nickname", () => {
    expect(memberDisplayName(member("Ada"))).toBe("Ada");
  });

  // 昵称是选填的，空着时页头不能变成一个没有文字的按钮
  it("falls back to the email when the nickname is blank", () => {
    expect(memberDisplayName(member("   "))).toBe("ada@example.com");
    expect(memberDisplayName(null)).toBe("");
  });
});

describe("memberInitials", () => {
  it("takes one letter per word for latin names", () => {
    expect(memberInitials(member("Zhang San"))).toBe("ZS");
    expect(memberInitials(member("ada lovelace king"))).toBe("AL");
  });

  it("takes the first two characters of an unspaced name", () => {
    expect(memberInitials(member("张三丰"))).toBe("张三");
    expect(memberInitials(member("Ada"))).toBe("AD");
  });

  it("falls back to the email", () => {
    expect(memberInitials(member(""))).toBe("AD");
    expect(memberInitials(null)).toBe("");
  });

  // 按码点切：`slice(0, 2)` 会把星平面字符劈成两个半截代理对
  it("does not split astral characters", () => {
    expect(memberInitials(member("𝒜𝓁"))).toBe("𝒜𝓁");
  });
});
