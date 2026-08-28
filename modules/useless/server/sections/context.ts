import {
  getAdjacentDates,
  getArchiveBounds,
  getThingOn,
} from "../thing.service.js";
import { localDateKey, parseDateKey } from "../thing.util.js";

import {
  normalizeLocale,
  translateServerMessage,
  type AppLocale,
} from "@rewindom/module-sdk/server";

import type {
  UselessLabels,
  UselessRenderContext,
} from "../../shared/useless-section-context.js";

/** 落成当前语言的成品文案——渲染器没有 i18n，这些字必须在这里解好。 */
function buildLabels(locale: AppLocale): UselessLabels {
  const t = (code: string) => translateServerMessage(locale, { code });
  return {
    prev: t("useless.nav.prev"),
    next: t("useless.nav.next"),
    today: t("useless.nav.today"),
    pick: t("useless.nav.pick"),
    empty: t("useless.empty"),
  };
}

/**
 * 段要的那一整包：那天那个 + 前后有东西的天 + 归档边界。
 *
 * `requested` 可能来自访客（`?d=`）。**解不出合法日期一律退回今天**，
 * 而不是报错——地址被人乱改不该让页面 500。
 */
export async function buildUselessContext(
  tenant_id: string,
  requested?: unknown,
  now: Date = new Date(),
  locale: string = "zh-CN",
): Promise<UselessRenderContext> {
  const today = localDateKey(now);
  const asked =
    typeof requested === "string" && parseDateKey(requested)
      ? requested
      : today;

  /*
   * 只有今天会**绑定新的**；回看过去只读已绑的。
   *
   * 否则任何人翻一遍历史就会把整个池子提前消耗掉，而且未来的日期也能被点出来
   * 绑上——「今天那个」就提前泄底了。
   */
  const isToday = asked === today;
  const thing = await getThingOn(tenant_id, asked, { bind: isToday });

  const [adjacent, bounds] = await Promise.all([
    getAdjacentDates(tenant_id, asked),
    getArchiveBounds(tenant_id),
  ]);

  return {
    date: asked,
    is_today: isToday,
    thing: thing
      ? {
          kind: thing.kind,
          title: thing.title,
          text: thing.text,
          html: thing.html,
        }
      : null,
    prev: adjacent.prev,
    // 未来的日子不给「后一天」——那边什么都没有，点过去是空页
    next: adjacent.next && adjacent.next <= today ? adjacent.next : null,
    earliest: bounds.earliest,
    latest: bounds.latest,
    labels: buildLabels(normalizeLocale(locale)),
  };
}

/**
 * 给中台预览用：**不查今天，直接把指定的这个东西放进上下文**。
 *
 * 未排期、已停用的东西根本没有公开地址，只能这样看。日期一栏用它自己的排期，
 * 没排期就显示今天——预览要的是「它长什么样」，不是「它哪天发」。
 */
export function buildPreviewContext(
  thing: {
    kind: UselessRenderContext["thing"] extends infer T
      ? T extends { kind: infer K }
        ? K
        : never
      : never;
    title: string;
    text: string;
    html: string;
    published_on: string | null;
  },
  locale: string = "zh-CN",
  now: Date = new Date(),
): UselessRenderContext {
  const date = thing.published_on ?? localDateKey(now);
  return {
    date,
    is_today: date === localDateKey(now),
    thing: {
      kind: thing.kind,
      title: thing.title,
      text: thing.text,
      html: thing.html,
    },
    // 预览里不给前后天：这是在看一个东西，不是在浏览归档
    prev: null,
    next: null,
    earliest: null,
    latest: null,
    labels: buildLabels(normalizeLocale(locale)),
  };
}
