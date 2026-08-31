import {
  getPublishedThingBySlug,
  listPublishedThings,
} from "../thing.service.js";
import { toUselessThingView } from "../ssr/useless-view.js";

import {
  normalizeLocale,
  translateServerMessage,
  type AppLocale,
} from "@rewindom/module-sdk/server";

import type { Thing } from "../../shared/thing.js";
import type {
  UselessLabels,
  UselessRenderContext,
} from "../../shared/useless-section-context.js";

function buildLabels(locale: AppLocale): UselessLabels {
  const t = (code: string) => translateServerMessage(locale, { code });
  return { empty: t("useless.empty") };
}

export async function buildUselessListContext(
  tenant_id: string,
  locale: string = "zh-CN",
): Promise<UselessRenderContext> {
  const things = await listPublishedThings(tenant_id);
  return {
    things: things.map(toUselessThingView),
    thing: null,
    labels: buildLabels(normalizeLocale(locale)),
  };
}

export async function buildUselessThingContext(
  tenant_id: string,
  slug: string,
  locale: string = "zh-CN",
): Promise<UselessRenderContext> {
  const thing = await getPublishedThingBySlug(tenant_id, slug);
  const view = toUselessThingView(thing);
  return {
    things: [view],
    thing: view,
    labels: buildLabels(normalizeLocale(locale)),
  };
}

/**
 * 给中台预览用：**不查公开地址，直接把指定的这个东西放进上下文**。
 */
export function buildPreviewContext(
  thing: Thing,
  locale: string = "zh-CN",
): UselessRenderContext {
  const view = toUselessThingView(thing);
  return {
    things: [view],
    thing: view,
    labels: buildLabels(normalizeLocale(locale)),
  };
}
