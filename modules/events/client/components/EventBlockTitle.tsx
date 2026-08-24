import { CardTitle } from "@rewindom/ui/card";

import type { ReactNode } from "react";

/**
 * 详情页板块标题的唯一规格。
 *
 * 标的是**板块**而不是内容标题——「发生了什么」「时间线」「来源」是给证据分栏的标签，
 * 不是一段文章的小标题，所以走小号大写字距，让事件标题保持页面上唯一的大字。
 *
 * 收成一个组件而不是散六处 className：这一页原来「发生了什么 / 时间线 / 来源」是
 * `text-sm uppercase`，「为什么在扩散 / 更新 / 相关事件」是 `text-base`，
 * 两套规格同页并排。公开面 `.events-block-title` 与 `.events-why-title` 是同一次疏漏。
 */
export function EventBlockTitle({ children }: { children: ReactNode }) {
  return (
    <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </CardTitle>
  );
}
