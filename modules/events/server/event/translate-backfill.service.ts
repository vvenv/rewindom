import { APP_LOCALES, prisma } from "@rewindom/module-sdk/server";

import { resolveEventTranslator } from "./translator/index.js";

import {
  hasLocaleText,
  isEventLocalizedMap,
  mergeLocalizedMaps,
} from "../../shared/index.js";

import type { EventLocalizedMap } from "../../shared/index.js";
import type { AppLocale } from "@rewindom/module-sdk";
import type { FastifyBaseLogger } from "fastify";

/**
 * 补译标题——只在**规则分析器**那条路上需要（LLM 在写摘要时就把各语言给全了）。
 *
 * 三个刻意的取舍：
 *
 * 1. **只翻标题，不翻摘要**。MyMemory 免费额度是 5,000 字符/天（填了邮箱 50,000），
 *    一条摘要 400 字符——翻十几条就没了。标题 60~100 字符，同样的额度能覆盖一整天的
 *    新事件。摘要留原文，详情页会如实标注它是原文。
 * 2. **按热度优先**。额度总会先用在用户最可能看到的事件上；没轮到的下一轮再来，
 *    译文一旦落库就永久缓存（原文不变就不会重翻，见 `carryOverTranslations`）。
 * 3. **翻不动就留原文**。读取侧本来就会回落到原文，不存在「翻译失败=空白」。
 */

/** 一轮最多考察多少个事件。额度耗尽时会提前停，这个数只是查询上限。 */
const SCAN_LIMIT = 200;

export interface BackfillResult {
  scanned: number;
  translated: number;
}

export async function backfillEventTranslations(options?: {
  log?: FastifyBaseLogger;
  scanLimit?: number;
}): Promise<BackfillResult> {
  const translator = resolveEventTranslator();
  if (translator.id === "noop") {
    return { scanned: 0, translated: 0 };
  }

  const targets = APP_LOCALES.map((locale) => locale.slug);

  const events = await prisma.newsEvent.findMany({
    orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
    take: options?.scanLimit ?? SCAN_LIMIT,
    select: {
      id: true,
      title: true,
      origin_locale: true,
      title_i18n: true,
    },
  });

  let translated = 0;
  for (const event of events) {
    const origin = event.origin_locale as AppLocale;
    const stored: EventLocalizedMap = isEventLocalizedMap(event.title_i18n)
      ? event.title_i18n
      : {};
    const base = mergeLocalizedMaps(stored, { [origin]: event.title });

    const missing = targets.filter(
      (locale) => locale !== origin && !hasLocaleText(base, locale),
    );
    if (missing.length === 0) {
      continue;
    }

    const additions: EventLocalizedMap = {};
    for (const locale of missing) {
      const [result] = await translator.translate([event.title], origin, locale);
      if (result) {
        additions[locale] = result;
      }
    }

    if (Object.keys(additions).length === 0) {
      // 一条都没翻出来：多半是额度用尽或限流，本轮不必再往下扫
      break;
    }

    await prisma.newsEvent.update({
      where: { id: event.id },
      data: { title_i18n: mergeLocalizedMaps(base, additions) },
    });
    translated += 1;
  }

  if (translated > 0) {
    options?.log?.info(
      { translated, translator: translator.id },
      "[events] 标题补译完成",
    );
  }
  return { scanned: events.length, translated };
}
