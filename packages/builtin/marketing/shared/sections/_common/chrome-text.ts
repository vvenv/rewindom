/**
 * chrome 文本块的占位符。
 *
 * 只有两个，都是「写死进 settings 就会过期」的东西：
 *
 * - `{year}` 当前年份——建站那天写死 `© 2026`，跨年之后页脚就一直停在去年
 * - `{site}` 站名——改了站名，页脚不跟着变
 *
 * 以前这是版权块的隐藏行为（「留空则自动生成 © 当年 站名」）：输入框里空着、前台却有
 * 字，想改成「© 2020–{year} Acme, Inc.」无从下手。占位符把同一件事摆到台面上。
 */

const PLACEHOLDERS = /\{(year|site)\}/gu;

export function resolveChromeText(
  text: string,
  context: { siteName: string; year?: number },
): string {
  const year = String(context.year ?? new Date().getFullYear());
  return text.replace(PLACEHOLDERS, (_match, key: string) =>
    key === "year" ? year : context.siteName,
  );
}
