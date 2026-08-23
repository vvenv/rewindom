import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { NEWSLETTER_SERVER_I18N } from "./i18n.js";
import {
  buildNewsletterSectionContext,
  buildNewsletterSectionLabels,
} from "./section-context.js";

import {
  registerNewsletterSource,
  resetNewsletterSources,
} from "../shared/newsletter-source.js";
import { NEWSLETTER_ALL_LISTS } from "../shared/newsletter.js";

import { registerServerI18nBundles } from "@rewindom/module-sdk/server";

import type { NewsletterSource } from "../shared/newsletter-source.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function source(overrides: Partial<NewsletterSource> = {}): NewsletterSource {
  return {
    id: "events",
    listLists: async () => [{ list_key: "events:topic:ai", label: "AI" }],
    ownsList: (key) => key.startsWith("events:"),
    describeList: async () => null,
    listItemsSince: async () => ({ items: [], next_cursor: null }),
    ...overrides,
  };
}

describe("订阅段的文案表", () => {
  beforeAll(() => {
    registerServerI18nBundles([NEWSLETTER_SERVER_I18N]);
  });

  afterEach(() => {
    resetNewsletterSources();
  });

  it("每个候选列表各一句整话——段渲染器拿不到 i18n，拼不了中英文的冒号", async () => {
    registerNewsletterSource(source());
    const labels = await buildNewsletterSectionLabels({
      tenant_id: TENANT,
      locale: "zh-CN",
    });
    expect(labels.scopes["events:topic:ai"]).toBe("订阅范围：AI");
  });

  it("「本站全部」那一条不依赖任何内容源", async () => {
    // 一个源都没接的站点，订阅段照样要能说清「订的是什么」
    const labels = await buildNewsletterSectionLabels({
      tenant_id: TENANT,
      locale: "zh-CN",
    });
    expect(labels.scopes[NEWSLETTER_ALL_LISTS]).toBe("订阅范围：本站全部更新");
  });

  it("跟着页面语言走", async () => {
    registerNewsletterSource(source());
    const labels = await buildNewsletterSectionLabels({
      tenant_id: TENANT,
      locale: "en",
    });
    expect(labels.scopes["events:topic:ai"]).toBe("Subscribing to AI");
    expect(labels.cadences.daily).toBe("A digest every day");
  });

  it("两档周期都备好——段选哪档由租户定，读者只能从这一行知道", async () => {
    const labels = await buildNewsletterSectionLabels({
      tenant_id: TENANT,
      locale: "zh-CN",
    });
    expect(labels.cadences).toEqual({
      daily: "每天一封摘要",
      weekly: "每周一封摘要",
    });
  });

  it("内容源查不动只少那一档候选，其余照常", async () => {
    /*
     * 订阅入口不该因为一个内容源出问题就消失——这与 `listAvailableLists` 同一条口径。
     */
    registerNewsletterSource(
      source({
        listLists: async () => {
          throw new Error("source down");
        },
      }),
    );
    const labels = await buildNewsletterSectionLabels({
      tenant_id: TENANT,
      locale: "zh-CN",
    });
    expect(labels.scopes[NEWSLETTER_ALL_LISTS]).toBe("订阅范围：本站全部更新");
  });
});

describe("`?list=` 指定的范围", () => {
  beforeAll(() => {
    registerServerI18nBundles([NEWSLETTER_SERVER_I18N]);
  });

  afterEach(() => {
    resetNewsletterSources();
  });

  it("认得的 key 落成范围，名字问内容源要", async () => {
    /*
     * 这一条以前只有本模块的 `/subscribe` 路由认，于是同一张订阅页从
     * `/zh-CN/subscribe?list=...`（走 marketing 通用管线）打开就退回了「本站全部」。
     * 范围属于请求，不属于哪条路由。
     */
    registerNewsletterSource(source({ describeList: async () => "AI" }));
    const context = await buildNewsletterSectionContext({
      tenant_id: TENANT,
      locale: "zh-CN",
      requested_list: "events:topic:ai",
    });
    expect(context.subscribe).toEqual({
      list_key: "events:topic:ai",
      scope_label: "订阅范围：AI",
    });
  });

  it("没有内容源认领就当没传——不能让读者订上一个永远不会有内容的列表", async () => {
    registerNewsletterSource(source());
    const context = await buildNewsletterSectionContext({
      tenant_id: TENANT,
      locale: "zh-CN",
      requested_list: "bogus:x",
    });
    expect(context.subscribe).toBeUndefined();
  });

  it("非字符串（`?list=a&list=b` 这种）一律当没传", async () => {
    registerNewsletterSource(source());
    const context = await buildNewsletterSectionContext({
      tenant_id: TENANT,
      locale: "zh-CN",
      requested_list: ["events:topic:ai", "events:topic:tech"],
    });
    expect(context.subscribe).toBeUndefined();
  });

  it("名字解不出时范围仍生效，只是少那一行说明", async () => {
    // 实体被删了、或源查不动；这时把范围丢掉才是错的——读者的意图写在地址里
    registerNewsletterSource(source());
    const context = await buildNewsletterSectionContext({
      tenant_id: TENANT,
      locale: "zh-CN",
      requested_list: "events:entity:gone",
    });
    expect(context.subscribe).toEqual({
      list_key: "events:entity:gone",
      scope_label: "",
    });
  });

  it("没带参数时只有文案表", async () => {
    const context = await buildNewsletterSectionContext({
      tenant_id: TENANT,
      locale: "zh-CN",
    });
    expect(context.subscribe).toBeUndefined();
    expect(context.labels.cadences.daily).toBe("每天一封摘要");
  });
});
