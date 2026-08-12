/**
 * 从一份 locale JSON 里按点分 key 取文案。
 *
 * 服务端没有 i18next，但常常要拿到与客户端**同一份**文案：SSR 渲染的段、页面预设
 * 落地时的默认值、发给访客的整句提示。这些地方一律直接 import 模块自己的
 * `client/locales/*.json` 再走本函数 —— 文案的唯一真相源就是那两份 JSON，
 * 也就自动进了 `pnpm check:i18n` 的门禁。
 *
 * 这段解析原本在 `marketing/server/starter-i18n.ts` 与
 * `site-member/server/member-preset-i18n.ts` 各抄了一份。
 */
export function resolveLocaleMessage(
  messages: Record<string, unknown>,
  key: string,
): string | undefined {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}
