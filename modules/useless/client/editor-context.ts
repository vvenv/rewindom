/**
 * 编辑器预览的「那天那个」—— 对应 SSR 的 `registerSectionContextProvider`。
 *
 * 只登记 SSR 那边预览就是空白，只登记这边实站不渲染，两边都要。
 * 取的是同一条数据（工作台的 `GET /api/things/today`），预览里看到的就是实站会出的那个。
 */
import { api, i18n } from "@rewindom/module-sdk/client";

import { registerEditorContextProvider } from "@rewindom/builtin/marketing/client/editor-context-providers.js";

import { USELESS_TODAY_SECTION_TYPE } from "../shared/sections/today/definition.js";
import { uselessContextEntry } from "../shared/useless-section-context.js";

import type { TodayThingResponse } from "../shared/index.js";

export function registerUselessEditorContext(): void {
  registerEditorContextProvider({
    sectionTypes: [USELESS_TODAY_SECTION_TYPE],
    /*
     * 东西是纯文本 / HTML、没有 locale map，所以不必把 `input.locale` 带成 `?locale=`
     * ——不是漏了。内容哪天改成按语言存，这里要跟着页面语言取。
     */
    provide: async () => {
      const res = await api.get<TodayThingResponse>("/api/things/today");
      const thing = res.thing;
      const today = new Date(Date.now() + 480 * 60_000)
        .toISOString()
        .slice(0, 10);
      return uselessContextEntry({
        date: thing?.published_on ?? today,
        is_today: true,
        thing: thing
          ? {
              kind: thing.kind,
              title: thing.title,
              text: thing.text,
              html: thing.html,
            }
          : null,
        /*
         * 预览里前后天一律为空：编辑器是在排版，不是在浏览归档，
         * 给出能点的链接反而会把人带出编辑器。
         */
        prev: null,
        next: null,
        earliest: null,
        latest: null,
        /*
         * 预览侧用客户端 i18n 解同一批文案（SSR 那边走 translateServerMessage）。
         * 两边都必须解成成品——渲染器同步、拿不到 i18n。
         */
        labels: {
          prev: i18n.t("useless:nav.prev"),
          next: i18n.t("useless:nav.next"),
          today: i18n.t("useless:nav.today"),
          pick: i18n.t("useless:nav.pick"),
          empty: i18n.t("useless:section.today.emptyDefault"),
        },
      });
    },
  });
}
