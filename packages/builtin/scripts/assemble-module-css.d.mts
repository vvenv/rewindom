/**
 * `assemble-module-css.mjs` 的类型声明。
 *
 * 打包脚本刻意是纯 `.mjs`（构建期跑，不进任何 bundle），但各模块的单测要 import 它来
 * 验证「生成物与源文件一致」。没有这份声明，`allowJs` 关着的 tsc 会把它判成隐式 any。
 */

export function listModuleCssIds(): string[];
export function assembleModuleSiteCss(moduleId: string): Record<string, string>;
export function writeModuleSiteCssGenerated(moduleId: string): {
  outPath: string;
  exports: string[];
  bytes: number;
};
