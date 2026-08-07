/**
 * `assemble.mjs` 的类型声明。
 *
 * 打包脚本刻意是纯 `.mjs`（构建期跑，不进任何 bundle），但单测要 import 它来验证
 * 「生成物与源文件一致」。没有这份声明，`allowJs` 关着的 tsc 会把它判成隐式 any。
 */

export function listMarketingSiteCssSources(): string[];
export function assembleMarketingSiteCss(): string;
export function writeMarketingSiteCssGenerated(): {
  outPath: string;
  bytes: number;
  files: number;
};
