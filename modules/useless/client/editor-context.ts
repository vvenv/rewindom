/**
 * 编辑器预览的「今天那条」—— 对应 SSR 的 `registerSectionContextProvider`。
 *
 * 只登记 SSR 那边预览就是空白，只登记这边实站不渲染，两边都要。
 * 取的是同一条数据（工作台的 `GET /api/things/today`），预览里看到的就是实站会出的那句。
 */
import { api } from "@rewindom/module-sdk/client";

import { registerEditorContextProvider } from "@rewindom/builtin/marketing/client/editor-context-providers.js";

import { USELESS_TODAY_SECTION_TYPE } from "../shared/sections/today/definition.js";
import { uselessContextEntry } from "../shared/useless-section-context.js";

import type { TodayThingResponse } from "../shared/index.js";

export function registerUselessEditorContext(): void {
  registerEditorContextProvider({
    sectionTypes: [USELESS_TODAY_SECTION_TYPE],
    /*
     * 句子是纯文本、没有 locale map，所以不必把 `input.locale` 带成 `?locale=`
     * ——不是漏了。正文哪天改成按语言存，这里要跟着页面语言取（见 site-section skill）。
     */
    provide: async () => {
      const res = await api.get<TodayThingResponse>("/api/things/today");
      return uselessContextEntry({
        today: res.thing ? { text: res.thing.text } : null,
      });
    },
  });
}
