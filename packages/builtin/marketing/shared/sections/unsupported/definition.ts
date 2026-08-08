import type { SectionDefinition } from "../types.js";

/**
 * 「这份代码不认识的段」的容器。
 *
 * `placements: []` 意味着它永远不会出现在编辑器的「添加区块」菜单里——租户加不出来，
 * 只有解析层在撞见未知 type 时才会产生它（见 `section-schema.ts` 的 `parsePageSection`）。
 * 没有任何 `settings`：连字段都不认识，谈不上编辑；面板里只给一句说明和一个删除入口。
 *
 * 两端渲染表里也没有它，所以公开页与 SSR 一致地什么都不输出——**不可用不等于露出半个坏掉的段**。
 */
export const unsupportedSection: SectionDefinition = {
  type: "unsupported",
  label: "editor.sectionType.unsupported",
  placements: [],
  settings: [],
};
