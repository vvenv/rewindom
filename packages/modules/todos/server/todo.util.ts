export const TODO_TITLE_MAX_LENGTH = 200;

export interface TodoInput {
  title?: string;
  completed?: boolean;
}

export function validateTodoInput(
  input: TodoInput,
  options: { partial?: boolean } = {},
): string | null {
  const partial = options.partial ?? false;

  if (!partial || input.title !== undefined) {
    const title = input.title?.trim() ?? "";
    if (!title) {
      return "请输入标题";
    }
    if (title.length > TODO_TITLE_MAX_LENGTH) {
      return `标题不能超过 ${TODO_TITLE_MAX_LENGTH} 个字符`;
    }
  }

  return null;
}
