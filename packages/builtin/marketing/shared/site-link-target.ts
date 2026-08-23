/**
 * 「站内有哪些地址可以链」的候选表（`link` 设置项的下拉数据）。
 *
 * 页面来自 `MarketingPage`；其它分组（`doc`、`feed` 等）由模块经 link-target provider
 * 填进来。对填链接的人来说是同一件事：指到站里的某个东西。
 */

/** 候选的分组，决定编辑器下拉里的分节顺序与标题。 */
export const SITE_LINK_TARGET_GROUPS = ["page", "doc", "feed"] as const;
export type SiteLinkTargetGroup = (typeof SITE_LINK_TARGET_GROUPS)[number];

export interface SiteLinkTarget {
  /** 直接落进 `settings[id]` 的 href（逻辑路径，不带 locale 前缀）。 */
  value: string;
  /** 已经是可直接显示的文案（不是 i18n key）：内容本来就是租户自己写的。 */
  label: string;
  group: SiteLinkTargetGroup;
  /** 次要信息，如文档所属分类。 */
  hint?: string;
  /** 还没发布：照列（先配导航后发布是常见顺序），但要标出来。 */
  draft?: boolean;
  /**
   * 只在这几种页面上可选。不声明 = 全站可选。
   *
   * 给**值里嵌了页面级 token** 的候选用：`/subscribe?list={topic_list}` 只有在
   * 主题页 / 事件详情页上才解得出东西，摆到实体页上那个参数会被收掉，
   * 读者点过去订的是全站——不是租户以为的那件事。
   *
   * 与 `InterpolationTokenDefinition.page_kinds` 同一条口径：声明了却对不上当前页
   * 就不列（`pageKind` 未知时同样不列，页头页脚那种站点级位置就是这种情况）。
   */
  page_kinds?: readonly string[];
}

/** 候选在这张页面上可不可选。与 `interpolationTokensFor` 逐字同构。 */
export function linkTargetVisibleOnPage(
  target: SiteLinkTarget,
  pageKind: string | undefined,
): boolean {
  if (!target.page_kinds) return true;
  return pageKind !== undefined && target.page_kinds.includes(pageKind);
}
