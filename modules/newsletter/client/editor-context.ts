/**
 * 编辑器里订阅段的候选列表。
 *
 * 候选来自各内容源在 `onBoot` 登记的东西，**随站点变**，编译期枚举不出来——
 * 所以段定义里那个静态 `options` 只有「本站全部」一项兜底，真正的清单从这里来
 *（`options_from` 的运行时选项源，与 shop 的分类下拉同一套机制）。
 *
 * 这也是「多个模块都提供订阅源时，段怎么知道自己对应哪一个」的落点：
 * **不推断，让租户在下拉里选**。
 */
import { api, i18n, normalizeLocale } from "@rewindom/module-sdk/client";

import { registerEditorContextProvider } from "@rewindom/builtin/marketing/client/editor-context-providers.js";
import { registerSettingSelectOptions } from "@rewindom/builtin/marketing/client/setting-select-options.js";

import { buildListOptions } from "../shared/newsletter-source.js";
import {
  NEWSLETTER_ALL_LISTS,
  NEWSLETTER_LIST_SELECT_OPTIONS,
} from "../shared/newsletter.js";
import {
  NEWSLETTER_CONTEXT_KEY,
  newsletterContextEntry,
} from "../shared/newsletter-section-context.js";
import { NEWSLETTER_SUBSCRIBE_SECTION_TYPE } from "../shared/sections/subscribe/definition.js";

import type { NewsletterList } from "../shared/newsletter-source.js";
import type { NewsletterSectionLabels } from "../shared/newsletter-section-context.js";

type ListRow = NewsletterList;

function listsFromContributed(
  contributed: Readonly<Record<string, unknown>> | undefined,
): ListRow[] {
  const context = contributed?.[NEWSLETTER_CONTEXT_KEY];
  if (!context || typeof context !== "object") return [];
  const lists = (context as { lists?: unknown }).lists;
  if (!Array.isArray(lists)) return [];
  return lists.filter(
    (row): row is ListRow =>
      Boolean(row) &&
      typeof (row as ListRow).list_key === "string" &&
      typeof (row as ListRow).label === "string",
  );
}

/**
 * 预览里那一行「订阅范围：AI · 每天一封摘要」。
 *
 * 与实站同一份形状（`buildNewsletterSectionLabels`），只是文案从 i18next 出。
 * **`lng` 显式钉成页面语言**：`i18n.t` 默认跟工作台界面语言走，而列表名是按页面
 * 语言取的——不钉的话同一行里会混着两种语言。
 */
function buildLabels(
  locale: string,
  lists: readonly ListRow[],
): NewsletterSectionLabels {
  const line = (list: string): string =>
    i18n.t("newsletter:scope.line", { lng: locale, list });
  const scopes: Record<string, string> = {
    [NEWSLETTER_ALL_LISTS]: line(
      i18n.t("newsletter:scope.all", { lng: locale }),
    ),
  };
  for (const list of lists) scopes[list.list_key] = line(list.label);

  return {
    scopes,
    cadences: {
      daily: i18n.t("newsletter:cadence.dailyDigest", { lng: locale }),
      weekly: i18n.t("newsletter:cadence.weeklyDigest", { lng: locale }),
    },
  };
}

export function registerNewsletterEditorContext(): void {
  registerEditorContextProvider({
    sectionTypes: [NEWSLETTER_SUBSCRIBE_SECTION_TYPE],
    provide: async (input) => {
      /*
       * **按当前选中页面的 locale 取**，不是工作台界面语言：列表标签来自内容源
       * （events 的主题名），两者不一致时预览与实站会显示两份文案。
       * api client 的 Accept-Language 写的是界面语言，所以要显式带 `locale`。
       */
      const locale = normalizeLocale(input.locale);
      try {
        const data = await api.get<{ items: ListRow[] }>("/newsletter/lists", {
          locale,
        });
        return newsletterContextEntry({
          lists: data.items,
          labels: buildLabels(locale, data.items),
        });
      } catch {
        // 拉不到就只剩「本站全部」那一项，段仍然可用
        return newsletterContextEntry({
          lists: [],
          labels: buildLabels(locale, []),
        });
      }
    },
  });

  registerSettingSelectOptions({
    id: NEWSLETTER_LIST_SELECT_OPTIONS,
    options: (contributed) => {
      const lists = listsFromContributed(contributed);
      /*
       * 「本站全部」始终排第一并**带上数量**：多个内容源并存时，租户一眼看得见
       * 选它意味着订多少东西——不然「全部」听起来像个无害的默认，
       * 实际上会让读者收到一堆他没想订的内容。
       */
      return [
        {
          value: NEWSLETTER_ALL_LISTS,
          // 带数量的是**运行时**这一份；schema 里的静态兜底用不带占位符的那条
          label: i18n.t("newsletter:section.subscribe.listAllCount", {
            count: lists.length,
          }),
        },
        // 来源前缀只在多源时出现，判断逻辑在 shared 里（有单测）
        ...buildListOptions(lists),
      ];
    },
  });
}
