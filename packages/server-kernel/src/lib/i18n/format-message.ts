/** 将 `Hello {{name}}` 按 params 插值；缺失的占位保留原样。 */
export function formatMessage(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params || Object.keys(params).length === 0) {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/gu, (match, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });
}

/** 形如 `notes.not_found` / `common.unauthorized` 的稳定消息 code。 */
export function isServerMessageCode(value: string): boolean {
  return /^[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)+$/u.test(value);
}
