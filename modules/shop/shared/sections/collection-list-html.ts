import {
  sliceCollectionTree,
  type ShopCollectionTreeNode,
} from "../collection.js";
import { readShopContext } from "../shop-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

function countHtml(count: number, showCount: boolean): string {
  if (!showCount) return "";
  return ` <span class="shop-collection-count">(${count})</span>`;
}

function treeHtml(
  nodes: ShopCollectionTreeNode[],
  ctx: Parameters<SectionHtmlRenderer>[1],
  showCount: boolean,
  currentSlug: string,
): string {
  if (nodes.length === 0) return "";
  const items = nodes
    .map((node) => {
      const current =
        currentSlug && node.slug === currentSlug ? ' aria-current="page"' : "";
      const kids = treeHtml(node.children, ctx, showCount, currentSlug);
      return `<li><a href="${escapeHtml(siteHref(node.href, ctx))}"${current}><span>${escapeHtml(node.title)}${countHtml(node.product_count, showCount)}</span></a>${kids}</li>`;
    })
    .join("");
  return `<ul class="shop-collection-tree">${items}</ul>`;
}

export const renderCollectionListHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  if (!shop) return "";
  const s = section.settings;
  const nodes = sliceCollectionTree(shop.collections, {
    root_slug: settingText(s, "root_slug"),
    depth: settingNumber(s, "depth", 3),
    include_root: settingBool(s, "include_root"),
    show_empty: settingBool(s, "show_empty"),
  });
  const heading = sectionHeading(s);
  if (nodes.length === 0) {
    const empty = settingText(s, "empty_text");
    return `${heading}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}`;
  }
  return `${heading}${treeHtml(nodes, ctx, settingBool(s, "show_count"), shop.collection_slug ?? "")}`;
};
