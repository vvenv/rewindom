/**
 * 可交互无用之物的公共外壳与类型。
 *
 * 单独一份，是为了让 `seed-embeds.ts` 只当汇总口（各类各一个文件），两边互不 import
 * ——BOX 留在汇总口的话，分类文件取它就绕回去了，成环。
 *
 * 约定见 `../seed-embeds.ts` 顶部：作用域全靠那三条守，这里只提供壳。
 */
export interface SeedEmbed {
  title: string;
  html: string;
}

/** 每个东西的公共外壳：只管自己那一块，不碰页面其余部分。 */
export const BOX =
  "<style>.useless-thing .ut{display:flex;flex-direction:column;align-items:center;" +
  "justify-content:center;gap:.9rem;min-height:15rem;text-align:center;" +
  "font-size:.875rem;line-height:2;color:var(--muted-fg,#777)}" +
  ".useless-thing .ut-mono{font-family:ui-monospace,Menlo,monospace;font-size:.75rem;opacity:.7}" +
  ".useless-thing .ut-btn{font:inherit;padding:.55rem 1.3rem;border:1px solid currentColor;" +
  "background:transparent;color:inherit;cursor:pointer;border-radius:2px;line-height:1;" +
  // 按钮文字不该能被框选——躲避型按钮上尤其难看
  "user-select:none}" +
  ".useless-thing .ut-tap{cursor:pointer;user-select:none}</style>";
