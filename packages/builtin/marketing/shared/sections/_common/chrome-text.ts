/**
 * chrome 文本块的占位符。
 *
 * 都是「写死进 settings 就会过期」的东西，渲染时再替换。口径对齐 Hugo / Jekyll /
 * Ghost：站点名、年份、站点地址；`{hostname}` 是地址里给备案号用的那一截。
 *
 * - `{year}` 当前年份——建站那天写死 `© 2026`，跨年之后页脚就一直停在去年
 * - `{site}` 站名——改了站名，页脚不跟着变
 * - `{hostname}` 当前访问的主机名（不含端口）——备案号旁边的域名、换绑自定义域
 * - `{url}` 当前站点 origin（含协议，无末尾斜杠）——「访问 https://…」
 *
 * `{hostname}` / `{url}` 都从**这次请求的 origin** 拆，不是库里某条「对外域名」：
 * 工作台与官网同 Host（见 Host 分流），编辑器预览和实站因此是同一个值。未识别的
 * `{foo}` 原样留下，避免误伤文案里的花括号。
 *
 * 以前这是版权块的隐藏行为（「留空则自动生成 © 当年 站名」）：输入框里空着、前台却有
 * 字，想改成「© 2020–{year} Acme, Inc.」无从下手。占位符把同一件事摆到台面上。
 */

export const CHROME_TEXT_TOKENS = ["year", "site", "hostname", "url"] as const;

export interface ChromeTextContext {
  siteName: string;
  /** 不传则用当前日历年。 */
  year?: number;
  /**
   * 当前请求 origin（`https://example.com`）。拆出 `{hostname}` 与 `{url}`。
   * 缺了就把这两项换成空串——页脚不该把花括号吐给访客。
   */
  origin?: string;
}

const TOKEN_PATTERN = new RegExp(
  `\\{(${CHROME_TEXT_TOKENS.join("|")})\\}`,
  "gu",
);

function tokensFromOrigin(origin: string | undefined): {
  hostname: string;
  url: string;
} {
  if (!origin) return { hostname: "", url: "" };
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { hostname: "", url: "" };
    }
    return { hostname: parsed.hostname, url: parsed.origin };
  } catch {
    return { hostname: "", url: "" };
  }
}

export function resolveChromeText(
  text: string,
  context: ChromeTextContext,
): string {
  const fromOrigin = tokensFromOrigin(context.origin);
  const values: Record<(typeof CHROME_TEXT_TOKENS)[number], string> = {
    year: String(context.year ?? new Date().getFullYear()),
    site: context.siteName,
    hostname: fromOrigin.hostname,
    url: fromOrigin.url,
  };
  return text.replace(TOKEN_PATTERN, (_match, key: string) => {
    if (key in values) return values[key as keyof typeof values];
    return _match;
  });
}
