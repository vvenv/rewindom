/**
 * `assemble.mjs` 的类型声明。
 *
 * 装配脚本刻意是 `.mjs`（构建前跑，不经 tsc），但 `theme-fonts.test.ts` 会 import 它
 * 来核对生成物与真源一致。没有这份声明时 `noImplicitAny` 会把整个 import 判成 any
 * 并报 TS7016。手写而不是开 `allowJs`：开了会把仓库里所有 `.mjs` 脚本一起拉进类型检查。
 */

/** 装配拉丁 / latin-ext 切片：返回各字族的 `@font-face` CSS 与落盘的 woff2 文件名。 */
export function assembleThemeFonts(): {
  faces: Record<string, string>;
  files: string[];
};

/** 把装配结果写进 `theme-fonts.generated.ts`。 */
export function writeThemeFontsGenerated(): {
  outPath: string;
  publicDir: string;
  keys: string[];
  files: string[];
};
