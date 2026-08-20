/**
 * 中台常驻模板区要画哪些行、分在哪一组。
 *
 * 模板页按自己的 `group` 排。首页版式不是另一张页（还是 `kind: home`），但产品
 * 域相同的版式应和那些页排在一起：当前套用的那套决定首页行落在哪一组；还没套用
 * 的贡献版式在该组占一行「套用版式」。`/` 不会在两组各出现一张已落库的首页。
 */

import {
  DEFAULT_HOME_LAYOUT_KEY,
  listHomeLayouts,
  resolveHomeLayout,
  type HomeLayoutDefinition,
} from "./home-layouts.js";
import "./page-presets.js";
import {
  getPageTemplatePreset,
  HOME_PAGE_KIND,
  isPageTemplateRelevant,
  listPageTemplateKinds,
  type PageTemplateKindDefinition,
} from "./page-templates.js";

export type SiteTemplateAreaItem =
  | { type: "template"; template: PageTemplateKindDefinition }
  | { type: "home_layout"; layout: HomeLayoutDefinition };

export interface SiteTemplateAreaGroup {
  group: string;
  items: SiteTemplateAreaItem[];
}

function pushItem(
  groups: Map<string, SiteTemplateAreaItem[]>,
  order: string[],
  group: string,
  item: SiteTemplateAreaItem,
): void {
  const existing = groups.get(group);
  if (existing) {
    existing.push(item);
    return;
  }
  groups.set(group, [item]);
  order.push(group);
}

function orderGroupItems(
  items: readonly SiteTemplateAreaItem[],
): SiteTemplateAreaItem[] {
  const layouts = items.filter((item) => item.type === "home_layout");
  const templates = items.filter((item) => item.type === "template");
  return [...layouts, ...templates];
}

/**
 * 常驻模板区的分组：登记顺序即组顺序；组内未套用的版式在前，模板页随后。
 */
export function listSiteTemplateAreaGroups(
  entitlements: ReadonlySet<string>,
  homeLayoutKey: string,
): SiteTemplateAreaGroup[] {
  const templates = listPageTemplateKinds().filter(
    (template) =>
      isPageTemplateRelevant(template, entitlements) &&
      Boolean(getPageTemplatePreset(template.kind)),
  );
  const active = resolveHomeLayout(homeLayoutKey, entitlements);
  const homeGroup = active.group;

  const groups = new Map<string, SiteTemplateAreaItem[]>();
  const order: string[] = [];

  for (const template of templates) {
    const group =
      template.kind === HOME_PAGE_KIND && homeGroup
        ? homeGroup
        : template.group;
    pushItem(groups, order, group, { type: "template", template });
  }

  for (const layout of listHomeLayouts(entitlements)) {
    if (!layout.group) continue;
    if (layout.key === DEFAULT_HOME_LAYOUT_KEY) continue;
    if (layout.key === active.key) continue;
    pushItem(groups, order, layout.group, { type: "home_layout", layout });
  }

  return order.map((group) => ({
    group,
    items: orderGroupItems(groups.get(group) ?? []),
  }));
}
