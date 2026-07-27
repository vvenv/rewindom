import { describe, it, expect } from "vitest";

import {
  cellToString,
  parseString,
  parseStringOrNull,
  parseIntParam,
  parseBooleanParam,
  parseYesNoLabel,
} from "./request-parser.js";

describe("cellToString", () => {
  it("should return empty string for null/undefined", () => {
    expect(cellToString(null)).toBe("");
    expect(cellToString(undefined)).toBe("");
  });

  it("should return string as-is", () => {
    expect(cellToString("hello")).toBe("hello");
  });

  it("should convert number to string", () => {
    expect(cellToString(123)).toBe("123");
    expect(cellToString(3.14)).toBe("3.14");
  });

  it("should convert boolean to string", () => {
    expect(cellToString(true)).toBe("true");
    expect(cellToString(false)).toBe("false");
  });

  it("should convert Date to ISO string", () => {
    const date = new Date("2024-01-15");
    expect(cellToString(date)).toBe(date.toISOString());
  });

  it("should extract text from object with text property", () => {
    expect(cellToString({ text: "hello" })).toBe("hello");
  });

  it("should handle richText array", () => {
    const richText = {
      richText: [{ text: "Hello " }, { text: "World" }],
    };
    expect(cellToString(richText)).toBe("Hello World");
  });

  it("should handle nested text property", () => {
    expect(cellToString({ text: { text: "nested" } })).toBe("nested");
  });

  it("should handle result property", () => {
    expect(cellToString({ result: "result value" })).toBe("result value");
  });

  it("should convert any other value to string", () => {
    expect(cellToString([1, 2, 3])).toBe("1,2,3");
    expect(cellToString({ a: 1 })).toBe("[object Object]");
  });
});

describe("parseString", () => {
  it("should return trimmed string for string input", () => {
    expect(parseString("hello")).toBe("hello");
    expect(parseString("  hello  ")).toBe("hello");
  });

  it("should return undefined for non-string input", () => {
    expect(parseString(123)).toBeUndefined();
    expect(parseString(null)).toBeUndefined();
    expect(parseString(undefined)).toBeUndefined();
    expect(parseString({})).toBeUndefined();
  });

  it("should return empty string for empty string input", () => {
    expect(parseString("")).toBe("");
    expect(parseString("   ")).toBe("");
  });
});

describe("parseStringOrNull", () => {
  it("should return null for explicit null", () => {
    expect(parseStringOrNull(null)).toBeNull();
  });

  it("should return string for non-empty string", () => {
    expect(parseStringOrNull("hello")).toBe("hello");
    expect(parseStringOrNull("  hello  ")).toBe("hello");
  });

  it("should return undefined for undefined", () => {
    expect(parseStringOrNull(undefined)).toBeUndefined();
  });

  it("should return undefined for empty/whitespace string", () => {
    expect(parseStringOrNull("")).toBeUndefined();
    expect(parseStringOrNull("   ")).toBeUndefined();
  });

  it("should return undefined for non-string types", () => {
    expect(parseStringOrNull(123)).toBeUndefined();
    expect(parseStringOrNull(true)).toBeUndefined();
    expect(parseStringOrNull({})).toBeUndefined();
  });
});

describe("parseIntParam", () => {
  it("should parse integer from string", () => {
    expect(parseIntParam("42")).toBe(42);
    expect(parseIntParam("0")).toBe(0);
    expect(parseIntParam("-10")).toBe(-10);
  });

  it("should return number as-is", () => {
    expect(parseIntParam(42)).toBe(42);
    expect(parseIntParam(3.14)).toBe(3.14);
  });

  it("should return undefined for invalid string", () => {
    expect(parseIntParam("abc")).toBeUndefined();
    expect(parseIntParam("")).toBeUndefined();
  });

  it("should return undefined for non-numeric types", () => {
    expect(parseIntParam(null)).toBeUndefined();
    expect(parseIntParam(undefined)).toBeUndefined();
    expect(parseIntParam(true)).toBeUndefined();
    expect(parseIntParam({})).toBeUndefined();
  });
});

describe("parseBooleanParam", () => {
  it("should return boolean as-is", () => {
    expect(parseBooleanParam(true)).toBe(true);
    expect(parseBooleanParam(false)).toBe(false);
  });

  it("should parse 'true' string", () => {
    expect(parseBooleanParam("true")).toBe(true);
  });

  it("should parse '1' string", () => {
    expect(parseBooleanParam("1")).toBe(true);
  });

  it("should parse 'false' string", () => {
    expect(parseBooleanParam("false")).toBe(false);
  });

  it("should parse '0' string", () => {
    expect(parseBooleanParam("0")).toBe(false);
  });

  it("should return undefined for other values", () => {
    expect(parseBooleanParam("yes")).toBeUndefined();
    expect(parseBooleanParam("no")).toBeUndefined();
    expect(parseBooleanParam(null)).toBeUndefined();
    expect(parseBooleanParam(undefined)).toBeUndefined();
    expect(parseBooleanParam(123)).toBeUndefined();
  });
});

describe("parseYesNoLabel", () => {
  it("should return true for boolean true", () => {
    expect(parseYesNoLabel(true)).toBe(true);
  });

  it("should return true for number 1", () => {
    expect(parseYesNoLabel(1)).toBe(true);
  });

  it("should return true for '是'", () => {
    expect(parseYesNoLabel("是")).toBe(true);
  });

  it("should return true for 'true' (case insensitive)", () => {
    expect(parseYesNoLabel("true")).toBe(true);
    expect(parseYesNoLabel("TRUE")).toBe(true);
    expect(parseYesNoLabel("True")).toBe(true);
  });

  it("should return false for boolean false", () => {
    expect(parseYesNoLabel(false)).toBe(false);
  });

  it("should return false for number 0", () => {
    expect(parseYesNoLabel(0)).toBe(false);
  });

  it("should return false for '否'", () => {
    expect(parseYesNoLabel("否")).toBe(false);
  });

  it("should return false for 'false' (case insensitive)", () => {
    expect(parseYesNoLabel("false")).toBe(false);
    expect(parseYesNoLabel("FALSE")).toBe(false);
    expect(parseYesNoLabel("False")).toBe(false);
  });

  it("should return undefined for other values", () => {
    expect(parseYesNoLabel("yes")).toBeUndefined();
    expect(parseYesNoLabel("no")).toBeUndefined();
    expect(parseYesNoLabel(null)).toBeUndefined();
    expect(parseYesNoLabel(undefined)).toBeUndefined();
    expect(parseYesNoLabel("")).toBeUndefined();
  });
});
