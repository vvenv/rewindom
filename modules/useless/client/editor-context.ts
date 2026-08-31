/**
 * 编辑器预览的无用之物 —— 对应 SSR 的 `registerSectionContextProvider`。
 *
 * 列表段拉真实已启用的东西；详情模板页没有当前 slug，用第一件当样张。
 */
import { api, i18n } from "@rewindom/module-sdk/client";

import { registerEditorContextProvider } from "@rewindom/builtin/marketing/client/editor-context-providers.js";

import { USELESS_CONTEXT_SECTION_TYPES } from "../shared/section-types.js";
import { USELESS_THING_PAGE_KIND } from "../shared/sections/thing/definition.js";
import {
  emptyUselessContext,
  thingPath,
  uselessContextEntry,
  type UselessThingView,
} from "../shared/useless-section-context.js";

import type { ThingListItem } from "../shared/index.js";

function toPreviewCard(item: ThingListItem): UselessThingView {
  return {
    kind: item.kind,
    slug: item.slug,
    href: item.slug ? thingPath(item.slug) : "/",
    title: item.title,
    text: item.text,
    html: item.html,
    thumbnail: item.thumbnail,
  };
}

export function registerUselessEditorContext(): void {
  registerEditorContextProvider({
    sectionTypes: [...USELESS_CONTEXT_SECTION_TYPES],
    provide: async (input) => {
      let things: UselessThingView[] = [];
      try {
        const data = await api.get<{ items: ThingListItem[] }>("/things", {
          page: 1,
          page_size: 100,
        });
        things = data.items
          .filter((item) => item.enabled)
          .map(toPreviewCard);
      } catch {
        // 目录拉不到就空着，预览结构仍与实站同一套渲染器
      }

      const current =
        input.pageKind === USELESS_THING_PAGE_KIND ? (things[0] ?? null) : null;

      return uselessContextEntry(
        emptyUselessContext({
          things,
          thing: current,
          labels: {
            empty: i18n.t(
              input.pageKind === USELESS_THING_PAGE_KIND
                ? "useless:section.thing.emptyDefault"
                : "useless:section.list.emptyDefault",
            ),
          },
        }),
      );
    },
  });
}
