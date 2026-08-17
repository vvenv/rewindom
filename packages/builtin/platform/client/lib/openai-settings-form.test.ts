import { describe, expect, it } from "vitest";

import type { TenantLlmStatus } from "@rewindom/shared";

import {
  buildOpenaiSettingsPayload,
  statusToForm,
  validateOpenaiSettingsForm,
} from "./openai-settings-form.js";

const t = (key: string): string => key;

const STATUS: TenantLlmStatus = {
  configured: true,
  source: "platform",
  api_key_hint: "…plat",
  model: null,
  resolved_model: "platform-model",
  model_source: "platform",
  temperature: null,
  resolved_temperature: 0.2,
  temperature_source: "platform",
};

describe("statusToForm", () => {
  it("leaves inherit axes blank so the placeholder can show the platform default", () => {
    expect(statusToForm(STATUS)).toEqual({ model: "", temperature: "" });
  });

  it("fills tenant overrides", () => {
    expect(
      statusToForm({
        ...STATUS,
        model: "site-model",
        temperature: 0.7,
      }),
    ).toEqual({ model: "site-model", temperature: "0.7" });
  });
});

describe("buildOpenaiSettingsPayload", () => {
  it("sends null to restore platform defaults", () => {
    expect(
      buildOpenaiSettingsPayload({ model: "  ", temperature: "" }),
    ).toEqual({ model: null, temperature: null });
  });

  it("trims the model name", () => {
    expect(
      buildOpenaiSettingsPayload({ model: " gpt-4o ", temperature: "0.4" }),
    ).toEqual({ model: "gpt-4o", temperature: 0.4 });
  });
});

describe("validateOpenaiSettingsForm", () => {
  it("accepts empty fields (inherit)", () => {
    expect(
      validateOpenaiSettingsForm({ model: "", temperature: "" }, t),
    ).toBeNull();
  });

  it("rejects temperature outside 0–2", () => {
    expect(
      validateOpenaiSettingsForm({ model: "", temperature: "9" }, t),
    ).toBe("aiSettings.validation.temperatureInvalid");
  });
});
