/**
 * 「填链接」下拉里的订阅候选。
 *
 * 核心判断：**裸路径只有在「整页就是订阅页」时才成立**。
 *
 * 订阅段嵌在首页里时，链接到 `/` 语义上并不指向订阅——读者点了「订阅」按钮，
 * 落到的是首页顶部，订阅框还在下面某处。那种情况下有意义的是**锚点**
 * （`/#subscribe`：跳过去并定位），而不是页面地址本身。
 *
 * 所以：
 *
 * | 页面 | 给什么 |
 * | --- | --- |
 * | 本模块的订阅页（`/subscribe`） | 裸路径。整页就是那张表单，锚点是多余的 |
 * | 其它页面，有锚点 | `path#anchor` + 一条同页 `#anchor` |
 * | 其它页面，没锚点 | **什么都不给**——没有能真正指向订阅的地址 |
 *
 * 最后一行看着严，但新建的订阅段自带 `anchor: subscribe`，落到这一档的只有
 * 「加默认锚点之前建的老段」，而给它一条指向页面顶部的「邮件订阅」正是要避免的误导。
 */
import type { SiteLinkTarget } from "@rewindom/builtin/marketing/shared/site-link-target.js";

export interface SubscribeUsage {
  page_path: string;
  page_kind: string;
  page_title: string;
  anchor: string | null;
  draft: boolean;
}

export interface SubscribeLinkLabels {
  /** 「邮件订阅」。 */
  subscribe: string;
  /** 「跳过去并定位到订阅区块」。 */
  jumpToSection: string;
  /** 「同一页内滚动到订阅区块」。 */
  samePage: string;
}

export function buildSubscribeLinkTargets(input: {
  usages: readonly SubscribeUsage[];
  /** 本模块订阅页的路径。等于它的那一条才给裸路径。 */
  ownPath: string;
  labels: SubscribeLinkLabels;
}): SiteLinkTarget[] {
  const targets: SiteLinkTarget[] = [];
  // 同页锚点在每张页上算出来都是同一个值，去重后只留一条
  const seen = new Set<string>();
  const push = (target: SiteLinkTarget): void => {
    if (seen.has(target.value)) return;
    seen.add(target.value);
    targets.push(target);
  };

  for (const usage of input.usages) {
    const base = {
      group: "page" as const,
      ...(usage.draft ? { draft: true } : {}),
    };

    if (usage.page_path === input.ownPath) {
      // 整页就是订阅页：裸路径即可，再给一条 `/subscribe#subscribe` 是同义反复
      push({
        ...base,
        value: usage.page_path,
        label: `${input.labels.subscribe}：${usage.page_title}`,
      });
      continue;
    }

    if (!usage.anchor) continue;

    push({
      ...base,
      value: `${usage.page_path}#${usage.anchor}`,
      label: `${input.labels.subscribe}：${usage.page_title}`,
      hint: input.labels.jumpToSection,
    });
    /*
     * 同页锚点**只在真的有订阅段的那几种页面上**可选。
     *
     * 不钉的话，主题页上也会列出「同一页内滚动到订阅区块」——而那张页上根本没有
     * 订阅段，点了什么都不会发生。同一个锚点值可能来自多张页，页面 kind 取并集。
     */
    const anchorValue = `#${usage.anchor}`;
    const existing = targets.find((item) => item.value === anchorValue);
    if (existing) {
      existing.page_kinds = [
        ...new Set([...(existing.page_kinds ?? []), usage.page_kind]),
      ];
      continue;
    }
    push({
      ...base,
      value: anchorValue,
      label: `${input.labels.subscribe}（${usage.anchor}）`,
      hint: input.labels.samePage,
      page_kinds: [usage.page_kind],
    });
  }

  return targets;
}
