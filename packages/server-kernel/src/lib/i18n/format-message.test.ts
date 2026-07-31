import { describe, expect, it } from "vitest";

import { formatMessage, isServerMessageCode } from "./format-message.js";

describe("formatMessage", () => {
  it("interpolates params", () => {
    expect(formatMessage("Hello {{name}}", { name: "Ada" })).toBe("Hello Ada");
  });

  it("keeps missing placeholders", () => {
    expect(formatMessage("{{a}}-{{b}}", { a: 1 })).toBe("1-{{b}}");
  });
});

describe("isServerMessageCode", () => {
  it("accepts dotted codes", () => {
    expect(isServerMessageCode("notes.not_found")).toBe(true);
    expect(isServerMessageCode("auth.audit.login_success")).toBe(true);
  });

  it("rejects Chinese / bare labels", () => {
    expect(isServerMessageCode("笔记不存在")).toBe(false);
    expect(isServerMessageCode("NOT_FOUND")).toBe(false);
  });
});
