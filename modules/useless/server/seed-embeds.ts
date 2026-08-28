/**
 * 可交互的无用之物 —— 汇总口。
 *
 * 真正的内容按类分在 `seed-embeds/` 下：一个类一个文件，加东西直接往对应文件的
 * 数组末尾追加。这里只负责拼起来，不放具体的东西。
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
import { DEEP_EMBEDS } from "./seed-embeds/deep.js";
import { MACHINE_EMBEDS } from "./seed-embeds/machine.js";
import { MISC_EMBEDS } from "./seed-embeds/misc.js";
import { PEOPLE_EMBEDS } from "./seed-embeds/people.js";
import { SELF_EMBEDS } from "./seed-embeds/self.js";
import { TIME_EMBEDS } from "./seed-embeds/time.js";
import { WORDS_EMBEDS } from "./seed-embeds/words.js";
import { WORK_EMBEDS } from "./seed-embeds/work.js";

import type { SeedEmbed } from "./seed-embeds/shell.js";

export type { SeedEmbed } from "./seed-embeds/shell.js";

/**
 * 顺序 = 未排期时的入库顺序，也就是回看往前补的顺序。先铺最早那批，再按类走。
 * `DEEP_EMBEDS` 在最后：前七类已经上过站，中间插一类只会把已排期的顺序搅乱。
 */
export const SEED_EMBEDS: SeedEmbed[] = [
  ...MISC_EMBEDS,
  ...TIME_EMBEDS,
  ...PEOPLE_EMBEDS,
  ...WORK_EMBEDS,
  ...WORDS_EMBEDS,
  ...MACHINE_EMBEDS,
  ...SELF_EMBEDS,
  ...DEEP_EMBEDS,
];
