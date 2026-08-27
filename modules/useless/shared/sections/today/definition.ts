import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import {
  THING_ENTITLEMENT,
  USELESS_SECTION_GROUP,
} from "../../entitlements.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

/** 段 type 带模块前缀，与 `newsletter.subscribe`、`shop.*` 同口径；撞名启动即抛。 */
export const USELESS_TODAY_SECTION_TYPE = "useless.today";

/**
 * 今天那条 —— 公开站上唯一会变的东西，一天换一次。
 *
 * **刻意不声明 `page_kinds`**：它最常见的位置是站点根，但摆到别的页上同样成立
 * （与 `newsletter.subscribe` 同一条理由）。
 *
 * 抬头 / 副标题**不给默认值**：这一段的全部主张就是那句话本身，默认带一行
 * 「今日无用」反而把它降级成了某个栏目的条目。想要抬头的租户自己填。
 */
export const uselessTodaySection: SectionDefinition = {
  type: USELESS_TODAY_SECTION_TYPE,
  label: "useless:section.today.label",
  group: USELESS_SECTION_GROUP,
  placements: ["page"],
  entitlement: THING_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "useless:section.today.group" },
    /*
     * 池子空时显示什么。**必须可配且有库存默认值**——新站点开通模块、还没录句子时
     * 段就已经能被摆上去了，那时渲染出一片空白会让租户以为段坏了。
     */
    {
      type: "text",
      id: "empty_text",
      label: "useless:section.today.emptyText",
      info: "useless:section.today.emptyTextInfo",
      default: "useless:section.today.emptyDefault",
    },
    /*
     * 留白是这一段唯一的版式主张，所以默认值给得比别的段大得多（常规段是 48）。
     * 句子四周的空当就是内容本身；挤在一堆区块中间它就不成立了。
     */
    ...layoutSettings({
      padding_top: 120,
      padding_bottom: 120,
      anchor: "today",
    }),
  ],
};
