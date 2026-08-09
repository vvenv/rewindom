/**
 * 「站内有哪些地址可以链」的候选表（`link` 设置项的下拉数据）。
 *
 * 页面来自 `MarketingPage`，文档来自 `MarketingDoc`——两张表，但对填链接的人来说
 * 是同一件事：我要指到站里的某个东西。所以合成一张列表由服务端一次给全，
 * 编辑器不需要知道它们分属两个模块。
 */

/** 候选的分组，决定编辑器下拉里的分节顺序与标题。 */
export const SITE_LINK_TARGET_GROUPS = ["page", "doc"] as const;
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
}
