/** Minimal Vite env typings so workspace client packages typecheck under this project. */
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  /**
   * 只覆盖本包用到的 eager + `?raw` 形态；值统一为 `unknown`，调用处按需断言。
   */
  glob(
    pattern: string | string[],
    options?: { query?: string; import?: string; eager?: boolean },
  ): Record<string, unknown>;
}

/** Vite CSS import（如 @uiw/react-md-editor/markdown-editor.css）。 */
declare module "*.css";
