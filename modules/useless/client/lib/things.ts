export const THING_TEXT_MAX_LENGTH = 10_000;

/** DateTime 在表单里是 ISO 串（空串 = 未设置），提交前才交给服务端转 Date */
export interface ThingFormValues {
  text: string;
  enabled: boolean;
}

// 与 Prisma 的 @default(true) 对齐：新建的句子默认参与轮换。
export const INITIAL_THING_FORM: ThingFormValues = {
  text: "",
  enabled: true,
};

type ThingTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function validateThingForm(
  values: ThingFormValues,
  t: ThingTranslate,
): string | null {
  const text = values.text.trim();
  if (!text) {
    return t("validation.textRequired");
  }
  if (text.length > THING_TEXT_MAX_LENGTH) {
    return t("validation.textTooLong", { max: THING_TEXT_MAX_LENGTH });
  }

  return null;
}

export function buildThingPayload(values: ThingFormValues): {
  text: string;
  enabled: boolean;
} {
  return {
    text: values.text.trim(),
    enabled: values.enabled,
  };
}
