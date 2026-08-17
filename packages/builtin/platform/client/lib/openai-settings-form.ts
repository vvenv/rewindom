import {
  LLM_MODEL_MAX_LENGTH,
  LLM_TEMPERATURE_MAX,
  LLM_TEMPERATURE_MIN,
  parseLlmTemperature,
  type TenantLlmStatus,
  type TenantLlmWriteBody,
} from "@rewindom/shared";

export interface OpenaiSettingsFormValues {
  model: string;
  temperature: string;
}

export const INITIAL_OPENAI_SETTINGS_FORM: OpenaiSettingsFormValues = {
  model: "",
  temperature: "",
};

export function statusToForm(
  status: TenantLlmStatus,
): OpenaiSettingsFormValues {
  return {
    model: status.model ?? "",
    temperature:
      status.temperature !== null ? String(status.temperature) : "",
  };
}

export function buildOpenaiSettingsPayload(
  form: OpenaiSettingsFormValues,
): TenantLlmWriteBody {
  const model = form.model.trim();
  const temperatureRaw = form.temperature.trim();
  return {
    model: model.length > 0 ? model : null,
    temperature:
      temperatureRaw.length > 0 ? Number(temperatureRaw) : null,
  };
}

type Translate = (key: string) => string;

export function validateOpenaiSettingsForm(
  form: OpenaiSettingsFormValues,
  t: Translate,
): string | null {
  if (form.model.trim().length > LLM_MODEL_MAX_LENGTH) {
    return t("aiSettings.validation.modelTooLong");
  }
  const temperatureRaw = form.temperature.trim();
  if (!temperatureRaw) return null;
  const temperature = parseLlmTemperature(temperatureRaw);
  if (temperature === null) {
    return t("aiSettings.validation.temperatureInvalid");
  }
  if (temperature < LLM_TEMPERATURE_MIN || temperature > LLM_TEMPERATURE_MAX) {
    return t("aiSettings.validation.temperatureInvalid");
  }
  return null;
}
