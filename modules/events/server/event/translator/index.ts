import { config } from "@rewindom/module-sdk/server";

import { myMemoryTranslator } from "./mymemory-translator.js";
import { noopTranslator, type EventTranslator } from "./translator.js";

export type { EventTranslator } from "./translator.js";
export { noopTranslator } from "./translator.js";
export {
  myMemoryTranslator,
  remainingTranslationBudget,
  resetTranslationBudget,
} from "./mymemory-translator.js";

/**
 * 选翻译器。
 *
 * `auto`（默认）= MyMemory：它不需要任何账号或 key，所以「自动」就等于开。
 * 想彻底关掉事后翻译（比如已经配了 LLM，不希望再有任何外部请求）设
 * `EVENTS_TRANSLATOR=none`。
 */
export function resolveEventTranslator(): EventTranslator {
  const mode = config.events.translator;
  if (mode === "none") {
    return noopTranslator;
  }
  return myMemoryTranslator;
}
