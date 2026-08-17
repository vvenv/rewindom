import { describe, expect, it } from "vitest";

import {
  LLM_DEFAULT_TEMPERATURE,
  maskApiKeyHint,
  parseLlmModel,
  parseLlmTemperature,
  parseTenantLlmPublicValue,
} from "./tenant-llm.js";

describe("parseLlmModel", () => {
  it("trims and rejects empty", () => {
    expect(parseLlmModel("  gpt-4o  ")).toBe("gpt-4o");
    expect(parseLlmModel("   ")).toBeNull();
    expect(parseLlmModel(null)).toBeNull();
  });

  it("caps length", () => {
    expect(parseLlmModel("x".repeat(120))?.length).toBe(100);
  });
});

describe("parseLlmTemperature", () => {
  it("accepts numbers in 0–2", () => {
    expect(parseLlmTemperature(0)).toBe(0);
    expect(parseLlmTemperature(0.2)).toBe(0.2);
    expect(parseLlmTemperature("1.5")).toBe(1.5);
    expect(parseLlmTemperature(2)).toBe(2);
  });

  it("rejects out of range and garbage", () => {
    expect(parseLlmTemperature(-0.1)).toBeNull();
    expect(parseLlmTemperature(2.1)).toBeNull();
    expect(parseLlmTemperature("nope")).toBeNull();
    expect(parseLlmTemperature("")).toBeNull();
    expect(parseLlmTemperature(null)).toBeNull();
  });
});

describe("parseTenantLlmPublicValue", () => {
  it("reads model and temperature from a JSON object", () => {
    expect(
      parseTenantLlmPublicValue({ model: " deepseek-chat ", temperature: 0.4 }),
    ).toEqual({ model: "deepseek-chat", temperature: 0.4 });
  });

  it("defaults both axes when value is missing or junk", () => {
    expect(parseTenantLlmPublicValue(null)).toEqual({
      model: null,
      temperature: null,
    });
    expect(parseTenantLlmPublicValue("secret")).toEqual({
      model: null,
      temperature: null,
    });
  });
});

describe("maskApiKeyHint", () => {
  it("shows the last four characters", () => {
    expect(maskApiKeyHint("sk-live-1234")).toBe("…1234");
    expect(maskApiKeyHint("  ")).toBeNull();
  });
});

describe("defaults", () => {
  it("keeps the events analyzer temperature as the code default", () => {
    expect(LLM_DEFAULT_TEMPERATURE).toBe(0.2);
  });
});
