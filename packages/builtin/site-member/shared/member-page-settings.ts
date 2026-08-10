/**
 * 会员那三张版式页（登录 / 注册 / 我的账户）共用的段设置与外壳 class。
 *
 * 三张页面在访客眼里是同一套东西：同一张居中的卡、同样的留白、同一个「要不要卡片
 * 外框」的开关。设置各写一遍的结果是它们慢慢长歪——登录页能关卡片、账户页不能，
 * 而没有任何人做过这个决定。
 */

import {
  settingBool,
  type SettingDef,
  type SettingValues,
} from "../../marketing/shared/section-settings.js";
import { layoutSettings } from "../../marketing/shared/sections/_common/settings.js";

/** 卡片外框开关。关掉只剩居中限宽，页面自己的底色 / 底图直接透上来。 */
export function memberCardSettings(): SettingDef[] {
  return [
    { type: "header", content: "site-member:section.frame.header" },
    {
      type: "checkbox",
      id: "show_card",
      label: "site-member:section.frame.showCard",
      default: true,
      info: "site-member:section.frame.showCardInfo",
    },
  ];
}

/**
 * 版式默认值。
 *
 * `narrow`：认证卡本来就窄，铺满整幅的登录框没人这么排。
 *
 * 上下留白**默认给足**（64 / 80）：这几页通常只有一张卡，不给内补白的话卡会直接顶在
 * 页头下沿，整页重心压在最上面一截——会员页是入口，空得从容比塞得紧要紧。租户嫌多
 * 可以在版式里调回去，反过来「怎么把它推下来」是要问一圈才知道的。
 *
 * 外观（背景 / 描边 / 圆角）已由 `layoutSettings()` 末尾带上，不要再追加一次
 * `styleSettings()`——那会让编辑器里出现两组同名的颜色字段。
 */
export function memberPageLayoutSettings(): SettingDef[] {
  return layoutSettings({
    content_width: "narrow",
    padding_top: 64,
    padding_bottom: 80,
  });
}

/** 卡片外壳的 class——两端渲染共用，免得一边改了 modifier 另一边还在老样子。 */
export function memberCardClass(
  settings: SettingValues,
  extra?: string,
): string {
  return [
    "member-auth-card",
    settingBool(settings, "show_card") ? "" : "is-plain",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
