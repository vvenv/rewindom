import {
  EVENT_SUMMARY_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  isEventTopic,
  type EventTopic,
} from "../../shared/index.js";

export interface EventEditFormValues {
  title: string;
  summary: string;
  topic: EventTopic;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function validateEventEditForm(
  values: EventEditFormValues,
  t: Translate,
): string | null {
  const title = values.title.trim();
  if (!title) {
    return t("edit.validation.titleRequired");
  }
  if (title.length > EVENT_TITLE_MAX_LENGTH) {
    return t("edit.validation.titleTooLong", { max: EVENT_TITLE_MAX_LENGTH });
  }
  if (values.summary.length > EVENT_SUMMARY_MAX_LENGTH) {
    return t("edit.validation.summaryTooLong", {
      max: EVENT_SUMMARY_MAX_LENGTH,
    });
  }
  if (!isEventTopic(values.topic)) {
    return t("edit.validation.topicInvalid");
  }
  return null;
}

export function buildEventUpdatePayload(values: EventEditFormValues): {
  title: string;
  summary: string;
  topic: EventTopic;
} {
  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    topic: values.topic,
  };
}
