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
  ".useless-thing .ut-btn:empty{width:2.5rem;height:2.5rem;padding:0}" +
  ".useless-thing .ut-tap{cursor:pointer;user-select:none}</style>";

/**
 * 铺满舞台的画布。内部分辨率固定，用 CSS 拉满容器。
 */
export function stageCss(cls: string, extra = ""): string {
  return (
    ".useless-thing ." +
    cls +
    "{position:relative;width:100%;flex:1;min-height:14rem;overflow:hidden" +
    extra +
    "}" +
    ".useless-thing ." +
    cls +
    " canvas{position:absolute;inset:0;width:100%;height:100%;display:block}"
  );
}

export function stageBody(cls: string, w = 960, h = 640): string {
  return (
    "<div class='ut'><div class='" +
    cls +
    "'><canvas width='" +
    String(w) +
    "' height='" +
    String(h) +
    "'></canvas></div></div>"
  );
}

/**
 * 一条东西：样式 + 结构 + IIFE。脚本里已经有容器 `R`。
 */
export function play(css: string, body: string, js: string): string {
  return (
    BOX +
    (css ? "<style>" + css + "</style>" : "") +
    body +
    "<script>(function(){var R=document.currentScript.parentNode;" +
    js +
    "})();</script>"
  );
}

/**
 * 跨访问记忆。拼在 `play()` 的 js 最前面，之后用
 * `M.get(k,d)` / `M.num(k,d)` / `M.set(k,v)`。
 *
 * localStorage 在隐私窗口、或读者把站点数据关掉时**取属性就抛**，所以先探一次、
 * 之后每次再包一层：拿不到就当没记过，东西照样能玩，只是每次回来都从头开始。
 * key 统一加 `ut.` 前缀，免得和官网自己存的东西撞。
 *
 * 只用来记「代价」，不用来记「进度」：跳过的次数、走过的距离、点过的地方。
 * 存住的东西下次回来只会让它更难玩，不会让它更好玩——那才是无用的。
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

/**
 * 满屏、跟手、跟主题的画布。拼在 `play()` 的 js 最前面。
 *
 * 三件事一起做，因为缺任何一件东西看起来都像草稿：
 *
 *   1. 画布按容器**实际尺寸 × devicePixelRatio** 开。固定 `960×640` 再让 CSS 拉满
 *      是糊的，1px 的线在高分屏上尤其糊。
 *   2. 容器尺寸变了跟着重开（`ResizeObserver`，不往 window 上绑事件）。重开会清空
 *      画布，靠累积作画的东西把重建逻辑挂到 `onfit` 上。
 *   3. `INK(a)` 取页面当前的前景色。写死的灰在深色页上是脏的，在浅色页上是虚的。
 *
 * 之后直接用：`G`（2d 上下文）、`W`/`H`（CSS 像素，不含 dpr）、`at(e)`（事件转画
 * 布坐标）、`INK(a)`。
 */
export const FIT =
  "var CV=R.querySelector('canvas'),G=CV.getContext('2d'),W=1,H=1,onfit=null;" +
  "function fit(){var b=CV.parentNode.getBoundingClientRect();" +
  "if(b.width<2||b.height<2)return;" +
  "var dpr=Math.min(2,window.devicePixelRatio||1);" +
  "W=Math.round(b.width);H=Math.round(b.height);" +
  "CV.width=Math.round(W*dpr);CV.height=Math.round(H*dpr);" +
  "G.setTransform(dpr,0,0,dpr,0,0);if(onfit)onfit();}" +
  "var INK=(function(){var c='128,128,128';try{" +
  "var m=window.getComputedStyle(R).color.match(/(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/);" +
  "if(m)c=m[1]+','+m[2]+','+m[3];}catch(e){}" +
  "return function(a){return 'rgba('+c+','+a+')';};})();" +
  "function at(e){var b=CV.getBoundingClientRect();" +
  "return[(e.clientX-b.left)/b.width*W,(e.clientY-b.top)/b.height*H];}" +
  "fit();if(window.ResizeObserver)new ResizeObserver(fit).observe(CV.parentNode);";
