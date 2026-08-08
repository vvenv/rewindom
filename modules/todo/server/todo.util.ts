export const TODO_TITLE_MAX_LENGTH = 200;

export interface TodoInput {
  title?: string;
  completed?: boolean;
}

export interface TodoValidationIssue {
  code: "todo.title_required" | "todo.title_too_long";
  params?: Record<string, number>;
}

export function validateTodoInput(
  input: TodoInput,
  options: { partial?: boolean } = {},
): TodoValidationIssue | null {
  const partial = options.partial ?? false;

  if (!partial || input.title !== undefined) {
    const title = input.title?.trim() ?? "";
    if (!title) {
      return { code: "todo.title_required" };
    }
    if (title.length > TODO_TITLE_MAX_LENGTH) {
      return {
        code: "todo.title_too_long",
        params: { max: TODO_TITLE_MAX_LENGTH },
      };
    }
  }

  return null;
}
