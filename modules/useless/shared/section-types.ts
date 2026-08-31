import { USELESS_LIST_SECTION_TYPE } from "./sections/list/definition.js";
import { USELESS_THING_SECTION_TYPE } from "./sections/thing/definition.js";

/**
 * 通用 SSR 与编辑器预览按这组 type 按需取数。
 *
 * 同时也是本模块自有 SSR 页的跳过清单——path fallback 已经带着完整的
 * `thing`，provider 再查一遍是白打一轮库。首页列表段仍走 provider。
 */
export const USELESS_CONTEXT_SECTION_TYPES = [
  USELESS_LIST_SECTION_TYPE,
  USELESS_THING_SECTION_TYPE,
] as const;
