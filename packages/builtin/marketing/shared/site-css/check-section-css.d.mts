/**
 * `check-section-css.mjs` 的类型声明。
 *
 * 门禁脚本刻意是纯 `.mjs`（构建期 / CI 跑，不进任何 bundle），但单测要 import 它，
 * 好让越界在 `pnpm test` 就露出来、而不是等谁想起来跑 `pnpm check:section-css`。
 */

export function findSectionCssViolations(): string[];
