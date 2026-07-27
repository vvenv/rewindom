export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_CONTENT_MAX_LENGTH = 10_000;
export const NOTE_PREVIEW_MAX_LENGTH = 120;

export interface NoteInput {
  title?: string;
  content?: string;
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
): string | null {
  const requireTitle = options.requireTitle ?? true;

  if (requireTitle) {
    const title = input.title?.trim() ?? "";
    if (!title) {
      return "请输入标题";
    }
    if (title.length > NOTE_TITLE_MAX_LENGTH) {
      return `标题不能超过 ${NOTE_TITLE_MAX_LENGTH} 个字符`;
    }
  } else if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return "标题不能为空";
    }
    if (title.length > NOTE_TITLE_MAX_LENGTH) {
      return `标题不能超过 ${NOTE_TITLE_MAX_LENGTH} 个字符`;
    }
  }

  if (input.content !== undefined && input.content.length > NOTE_CONTENT_MAX_LENGTH) {
    return `内容不能超过 ${NOTE_CONTENT_MAX_LENGTH} 个字符`;
  }

  return null;
}
