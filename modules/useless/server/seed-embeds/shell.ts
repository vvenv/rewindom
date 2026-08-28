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

/**
 * 每个东西的公共外壳：只管自己那一块，不碰页面其余部分。
 *
 * 手感写在 `useless.css`。这里只保证没加载段 CSS 时仍能排版、能点。
 */
export const BOX =
  "<style>.useless-thing .ut{display:flex;flex-direction:column;align-items:center;" +
  "justify-content:center;gap:1rem;width:100%;height:100%;min-height:14rem;flex:1;" +
  "text-align:center;" +
  "font-size:.875rem;line-height:1.7;color:var(--muted-fg,#777);" +
  "user-select:none;-webkit-tap-highlight-color:transparent}" +
  ".useless-thing .ut-mono{font-family:ui-monospace,Menlo,monospace;font-size:.75rem;" +
  "opacity:.45;min-height:1.2em}" +
  ".useless-thing .ut-btn{font:inherit;padding:.45rem 1.1rem;border:1px solid currentColor;" +
  "background:transparent;color:inherit;cursor:pointer;border-radius:0;line-height:1;" +
  "user-select:none}" +
  ".useless-thing .ut-tap{cursor:pointer;user-select:none}</style>";

/**
 * 跨访问记忆。拼在 IIFE 开头，之后用 `M.get(k,d)` / `M.num(k,d)` / `M.set(k,v)`。
 *
 * localStorage 在隐私窗口、或读者把站点数据关掉时**取属性就抛**，所以先探一次、
 * 之后每次再包一层：拿不到就当没记过，东西照样能玩，只是每次回来都从头开始。
 * key 统一加 `ut.` 前缀，免得和官网自己存的东西撞。
 */
export const MEM =
  "var M=(function(){var ok=true;try{window.localStorage.setItem('ut.probe','1');" +
  "window.localStorage.removeItem('ut.probe');}catch(e){ok=false;}" +
  "return{get:function(k,d){if(!ok)return d;" +
  "try{var v=window.localStorage.getItem('ut.'+k);return v===null?d:v;}catch(e){return d;}}," +
  "set:function(k,v){if(!ok)return;" +
  "try{window.localStorage.setItem('ut.'+k,String(v));}catch(e){}}," +
  "num:function(k,d){var v=this.get(k,null);var n=v===null?NaN:parseFloat(v);" +
  "return isFinite(n)?n:d;}};})();";
