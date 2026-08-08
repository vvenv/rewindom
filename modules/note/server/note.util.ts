export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_CONTENT_MAX_LENGTH = 10_000;
export const NOTE_PREVIEW_MAX_LENGTH = 120;

export interface NoteInput {
  title?: string;
  content?: string;
}

export interface NoteValidationIssue {
  code:
    | "note.title_enter"
    | "note.title_required"
    | "note.title_too_long"
    | "note.content_too_long";
  params?: Record<string, number>;
}

export function buildNoteContentPreview(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= NOTE_PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, NOTE_PREVIEW_MAX_LENGTH)}…`;
}

export function validateNoteInput(
  input: NoteInput,
  options: { requireTitle?: boolean } = {},
): NoteValidationIssue | null {
  const requireTitle = options.requireTitle ?? true;

  if (requireTitle) {
    const title = input.title?.trim() ?? "";
    if (!title) {
      return { code: "note.title_enter" };
    }
    if (title.length > NOTE_TITLE_MAX_LENGTH) {
      return { code: "note.title_too_long", params: { max: NOTE_TITLE_MAX_LENGTH } };
    }
  } else if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return { code: "note.title_required" };
    }
    if (title.length > NOTE_TITLE_MAX_LENGTH) {
      return { code: "note.title_too_long", params: { max: NOTE_TITLE_MAX_LENGTH } };
    }
  }

  if (input.content !== undefined && input.content.length > NOTE_CONTENT_MAX_LENGTH) {
    return { code: "note.content_too_long", params: { max: NOTE_CONTENT_MAX_LENGTH } };
  }

  return null;
}
