export const THING_TEXT_MAX_LENGTH = 10_000;
/** 审计详情里只留一小段正文——句子可以很长，审计日志不该被整条灌满。 */
export const THING_PREVIEW_MAX_LENGTH = 60;

export interface ThingInput {
  text?: string;
  enabled?: boolean;
}

export interface ThingValidationIssue {
  code: "useless.text_required" | "useless.text_too_long";
  params?: Record<string, number>;
}

export function buildThingPreview(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= THING_PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, THING_PREVIEW_MAX_LENGTH)}…`;
}

export function validateThingInput(
  input: ThingInput,
  options: { partial?: boolean } = {},
): ThingValidationIssue | null {
  const partial = options.partial ?? false;

  if (!partial || input.text !== undefined) {
    const text = input.text?.trim() ?? "";
    if (!text) {
      return { code: "useless.text_required" };
    }
    if (text.length > THING_TEXT_MAX_LENGTH) {
      return {
        code: "useless.text_too_long",
        params: { max: THING_TEXT_MAX_LENGTH },
      };
    }
  }

  return null;
}
