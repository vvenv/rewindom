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

export function validateNoteForm(values: NoteFormValues): string | null {
  const title = values.title.trim();
  if (!title) {
    return "请输入标题";
  }
  if (title.length > NOTE_TITLE_MAX_LENGTH) {
    return `标题不能超过 ${NOTE_TITLE_MAX_LENGTH} 个字符`;
  }
  if (values.content.length > NOTE_CONTENT_MAX_LENGTH) {
    return `内容不能超过 ${NOTE_CONTENT_MAX_LENGTH} 个字符`;
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
