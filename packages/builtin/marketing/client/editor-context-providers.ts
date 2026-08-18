/**
 * 编辑器预览的按需数据 —— 客户端对应 `registerSectionContextProvider`。
 *
 * 文档目录、当前篇样本以前是 marketing 自己拉的。抽成注册表之后，site-docs
 * 在 client manifest 顶层登记；编辑器只负责 await 合并进 `contributed`。
 */

export interface EditorContextInput {
  locale: string;
  defaultLocale: string;
  pageKind?: string;
  usedTypes: ReadonlySet<string>;
  /** 站点设置里的 `home_path`；预览链接要和访客 URL 一致。 */
  homePath?: string;
  /** 站点设置里的 `home_layout_key`；与 `homePath` 一起决定公开前缀。 */
  homeLayoutKey?: string;
}

export interface EditorContextProvider {
  sectionTypes: readonly string[];
  provide: (
    input: EditorContextInput,
  ) => Promise<Record<string, unknown>>;
}

const PROVIDERS: EditorContextProvider[] = [];

export function registerEditorContextProvider(
  provider: EditorContextProvider,
): void {
  if (PROVIDERS.includes(provider)) return;
  PROVIDERS.push(provider);
}

export function resetEditorContextProviders(): void {
  PROVIDERS.length = 0;
}

export async function resolveEditorContexts(
  input: EditorContextInput,
): Promise<Record<string, unknown>> {
  const applicable = PROVIDERS.filter((provider) =>
    provider.sectionTypes.some((type) => input.usedTypes.has(type)),
  );
  if (applicable.length === 0) return {};
  const results = await Promise.all(
    applicable.map(async (provider) => {
      try {
        return await provider.provide(input);
      } catch {
        return {};
      }
    }),
  );
  return Object.assign({}, ...results) as Record<string, unknown>;
}
