/**
 * 可交互的无用之物 —— 汇总口。
 *
 * 真正的内容分在 `seed-embeds/` 下：`tap` 是要你动手的，`auto` 是自己在长的。
 * 这里只负责拼起来，不放具体的东西。
 *
 * **直接注入页面，不套 iframe**——所以每一个都必须自己守住作用域，否则会把
 * 整个官网一起改掉：
 *
 *   1. CSS 选择器一律收在 `.useless-thing` 里。**不许**出现 `body` / `html` /
 *      `*` / 裸标签选择器。
 *   2. JS 用 `document.currentScript.parentNode` 拿到自己的容器，事件绑在容器上，
 *      查元素也只在容器内查。**不许**往 `document` 上绑事件。
 *   3. 不用 id 选择器（同一页摆两个会撞），一律用 class + 容器内查询。
 *
 * 另外：这些字符串本身是 TS 模板串，内部不要出现反引号或 ${，所以 JS 一律用
 * 字符串拼接。
 *
 * 这三条由 `seed-embeds.test.ts` 逐条把关，违反了测试就红。
 */
import { AUTO_EMBEDS } from "./seed-embeds/auto.js";
import { TAP_EMBEDS } from "./seed-embeds/tap.js";

import type { SeedEmbed } from "./seed-embeds/shell.js";

export type { SeedEmbed } from "./seed-embeds/shell.js";

/** 顺序 = 目录上的默认顺序（created_at）。先要动手的，再自己在长的。 */
export const SEED_EMBEDS: SeedEmbed[] = [...TAP_EMBEDS, ...AUTO_EMBEDS];
