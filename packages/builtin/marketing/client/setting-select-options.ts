/**
 * select 设置项的运行时选项（分类、文档类目这类随租户变的候选）。
 *
 * 静态 `options` 仍写在 schema 里；动态那截由贡献方 `registerSettingSelectOptions`
 * 填进来。marketing 不知道业务形状，只按 id 调度。
 */

export interface SettingSelectOption {
  value: string;
  /** 已经是当前语言的展示文案，编辑器不再 t()。 */
  label: string;
}

export interface SettingSelectOptionSource {
  id: string;
  options: (
    contributed: Readonly<Record<string, unknown>> | undefined,
  ) => readonly SettingSelectOption[];
}

const SOURCES = new Map<string, SettingSelectOptionSource>();

export function registerSettingSelectOptions(
  source: SettingSelectOptionSource,
): void {
  SOURCES.set(source.id, source);
}

export function resetSettingSelectOptions(): void {
  SOURCES.clear();
}

export function getSettingSelectOptions(
  id: string,
  contributed: Readonly<Record<string, unknown>> | undefined,
): readonly SettingSelectOption[] {
  return SOURCES.get(id)?.options(contributed) ?? [];
}
