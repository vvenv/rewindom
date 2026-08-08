export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_CONTENT_MAX_LENGTH = 10_000;

export interface NoteFormValues {
  title: string;
  content: string;
}

export const INITIAL_NOTE_FORM: NoteFormValues = {
  title: "",
  content: "",
};

type NoteTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function validateNoteForm(
  values: NoteFormValues,
  t: NoteTranslate,
): string | null {
  const title = values.title.trim();
  if (!title) {
    return t("validation.titleRequired");
  }
  if (title.length > NOTE_TITLE_MAX_LENGTH) {
    return t("validation.titleTooLong", { max: NOTE_TITLE_MAX_LENGTH });
  }
  if (values.content.length > NOTE_CONTENT_MAX_LENGTH) {
    return t("validation.contentTooLong", { max: NOTE_CONTENT_MAX_LENGTH });
  }
  return null;
}

export function buildNotePayload(values: NoteFormValues): {
  title: string;
  content: string;
} {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
  };
}
