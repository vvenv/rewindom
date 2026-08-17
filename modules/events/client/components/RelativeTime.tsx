import { useTranslation } from "react-i18next";

import { relativeTimeParts } from "../lib/events.js";

/**
 * 相对时间（「12 分钟前」）。用 Intl.RelativeTimeFormat 而不是自己拼文案——
 * 否则每加一种语言都要再写一遍复数与词序规则。
 */
export function RelativeTime({ iso }: { iso: string }) {
  const { i18n } = useTranslation("events");
  const { value, unit } = relativeTimeParts(iso);
  const formatted = new Intl.RelativeTimeFormat(i18n.language, {
    numeric: "auto",
  }).format(value, unit);

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString(i18n.language)}>
      {formatted}
    </time>
  );
}
