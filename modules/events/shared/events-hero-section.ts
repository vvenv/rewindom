/**
 * 官网首屏 —— 产品主张。
 *
 * 为什么是 events 自己的段而不是通用 `hero`：默认文案是这个产品的主张，添加区块时
 * 选的就是产品切面。实时计数曾经也长在这一段上（`show_stats`），现在是自己的一段
 * `events.live`——主张归租户、数字归系统那条分工，拆开之后在编辑器里看得见。
 *
 * 文案全是 setting。首页 / 专题共用这一段，库存文案
 * 自己写 `{topic}`，不要再长 topic_* 覆盖字段。实体页是另一段 `events.entity-hero`
 * ——添加区块时选的就是产品切面，默认值才能写在各自的 setting 上。
 */

import { EVENTS_ENTITLEMENT, EVENTS_SECTION_GROUP } from "./entitlements.js";
import { EVENTS_FEED_HREF_TEMPLATE } from "./events-section-context.js";

import {
  layoutSettings,
  linkSettings,
  MEDIA_SIDE_OPTIONS,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";
import { NEWSLETTER_SUBSCRIBE_PATH } from "@rewindom/newsletter/shared/newsletter-page-templates.js";

import type { SettingDef } from "@rewindom/builtin/marketing/shared/section-settings.js";
import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const EVENTS_HERO_SECTION_TYPE = "events.hero";

export function eventsHeroSettings(defaults: {
  eyebrow: string;
  headline: string;
  subhead: string;
  /**
   * 实体首屏专属：把累计档案画在标题下面。
   *
   * 只在**有当前实体**的那一段上长这个开关——首页 / 专题没有实体，多一个永远
   * 画不出东西的勾选框只会让人以为自己关错了什么。
   */
  profile?: boolean;
  /**
   * 竖向留白。首页那块是产品主张，撑开好看；实体名片不是——首屏下面紧跟着的是
   * 卡片列表（正文段默认不画标题），72 的下边距加上正文段自己的 48，按钮和第一张
   * 卡片之间会空出 120px 的无人区。
   */
  paddingY?: { top: number; bottom: number };
}): SettingDef[] {
  return [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "eyebrow",
      label: "editor.setting.eyebrow",
      default: defaults.eyebrow,
      info: "events:section.hero.interpolationInfo",
    },
    {
      type: "text",
      id: "headline",
      label: "editor.setting.headline",
      default: defaults.headline,
      required: true,
      info: "events:section.hero.interpolationInfo",
    },
    {
      type: "textarea",
      id: "subhead",
      label: "editor.setting.subhead",
      rows: 3,
      default: defaults.subhead,
      info: "events:section.hero.interpolationInfo",
    },
    ...(defaults.profile
      ? ([
          {
            type: "checkbox",
            id: "show_profile",
            label: "events:section.entityHero.showProfile",
            default: true,
            info: "events:section.entityHero.showProfileInfo",
          },
        ] as SettingDef[])
      : []),
    {
      type: "checkbox",
      id: "show_glow",
      label: "editor.setting.show_glow",
      default: true,
    },
    /*
     * 题图。**默认空**，空时这一段的 markup 与没有这几个设置时逐字节相同——
     * 存量已发布的首页 / 专题页不会因为这几行的上线发生任何视觉变化。
     *
     * id 与取值照抄 marketing `hero`（`image` / `image_alt` / `media_side`）：
     * 租户在两个段之间切换时，同一个概念该叫同一个名字。多出来的只有
     * `image_layout`——通用 hero 的图恒在媒体位，而专题页最想要的是通栏封面。
     *
     * alt 留空是**正常情况**：无障碍文案存在媒体库的 asset 上，同一张图在十个地方
     * 用不该抄十遍。这里只是给「同一张图在这一页有别的意思」留一个覆盖口。
     */
    { type: "image", id: "image", label: "editor.setting.image" },
    { type: "text", id: "image_alt", label: "editor.setting.image_alt" },
    {
      type: "select",
      id: "image_layout",
      label: "events:section.hero.imageLayout",
      default: "split",
      // 不写成 `imageLayout.split`——`imageLayout` 自己已经是叶子，
      // i18next 按 `.` 分层时同一个键不能既是字符串又是对象
      options: [
        { value: "split", label: "events:section.hero.imageLayoutSplit" },
        {
          value: "background",
          label: "events:section.hero.imageLayoutBackground",
        },
      ],
      info: "events:section.hero.imageLayoutInfo",
    },
    {
      type: "select",
      id: "media_side",
      label: "editor.setting.media_side",
      default: "right",
      options: MEDIA_SIDE_OPTIONS,
    },
    { type: "header", content: "editor.group.buttons" },
    /*
     * 主按钮默认是**邮件订阅**，次按钮是 RSS。
     *
     * 两条订阅腿的读者规模差着量级：RSS 是技术读者那一小档，邮件是其余所有人。
     * 首屏最显眼的位置该给后者。
     *
     * 地址用 newsletter 的订阅页——events 早就 `requires: newsletter`，
     * 这条依赖是单向的。站点没开通邮件订阅时租户自己把它改掉，
     * 与其它带默认值的设置同一条口径。
     */
    ...linkSettings("primary", {
      labelDefault: "events:site.subscribeEmail",
      hrefDefault: NEWSLETTER_SUBSCRIBE_PATH,
      hrefPlaceholder: NEWSLETTER_SUBSCRIBE_PATH,
      hrefInfo: "events:section.hero.subscribeEmailHrefInfo",
    }),
    ...linkSettings("secondary", {
      labelDefault: "events:site.subscribe",
      hrefDefault: EVENTS_FEED_HREF_TEMPLATE,
      hrefPlaceholder: EVENTS_FEED_HREF_TEMPLATE,
      hrefInfo: "events:section.hero.subscribeHrefInfo",
    }),
    /*
     * 通栏：光晕与顶部细线要贴视口，否则首屏看起来是页面里的一张卡片。
     * 正文仍居中限宽（content_width 默认），左右 24 = 站点 gutter。
     */
    ...layoutSettings({
      width: "full",
      padding_top: defaults.paddingY?.top ?? 72,
      padding_right: 24,
      padding_bottom: defaults.paddingY?.bottom ?? 72,
      padding_left: 24,
    }),
  ];
}

export const eventsHeroSection: SectionDefinition = {
  type: EVENTS_HERO_SECTION_TYPE,
  label: "events:section.hero.label",
  group: EVENTS_SECTION_GROUP,
  placements: ["page"],
  entitlement: EVENTS_ENTITLEMENT.key,
  settings: eventsHeroSettings({
    eyebrow: "events:site.hero.eyebrow",
    headline: "events:site.hero.headline",
    subhead: "events:site.hero.subhead",
  }),
};
