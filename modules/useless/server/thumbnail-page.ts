/**
 * 截缩略图 / 本地预览共用的那一页。
 *
 * 可交互物要跑在**真文档**里才画得出来（canvas、rAF、FIT）。截图还会改视口尺寸，
 * ResizeObserver 一响就会重开画布把刚画的清掉，所以泵帧模式把 observer 摘掉、
 * 把 rAF 收成 `__pump(n)`，才能离线读到稳定的一帧。
 */
import { USELESS_CSS } from "../shared/site-css.generated.js";

export const THUMBNAIL_VIEWPORT = { width: 960, height: 720 } as const;

/** 泵大约 0.8s 的动画，AUTO 那批才不是一张空白画布。 */
export const THUMBNAIL_PUMP_FRAMES = 48;

const PUMP_BODY = `var q=[],F=0,T0=Date.now(),RealDate=window.Date;
window.ResizeObserver=undefined;
function vnow(){return T0+Math.round(F*16.7);}
// \`Date.now\` 和 \`new Date()\` 都得接管。只接管前者的话，读挂钟的条目
// （\`时钟在撒谎\` 直接 \`new Date()\`）在泵帧下永远停在同一秒，看着像死了
function FakeDate(a,b,c,d,e,f,g){
  if(!(this instanceof FakeDate))return new RealDate(vnow()).toString();
  switch(arguments.length){
    case 0:return new RealDate(vnow());
    case 1:return new RealDate(a);
    case 2:return new RealDate(a,b);
    case 3:return new RealDate(a,b,c);
    case 4:return new RealDate(a,b,c,d);
    case 5:return new RealDate(a,b,c,d,e);
    case 6:return new RealDate(a,b,c,d,e,f);
    default:return new RealDate(a,b,c,d,e,f,g);
  }
}
FakeDate.prototype=RealDate.prototype;
FakeDate.now=vnow;
FakeDate.parse=RealDate.parse;
FakeDate.UTC=RealDate.UTC;
window.Date=FakeDate;
window.requestAnimationFrame=function(cb){q.push(cb);return q.length;};
window.__err=[];
window.__pump=function(n){for(var i=0;i<n;i++){F++;var cur=q;q=[];
for(var j=0;j<cur.length;j++){try{cur[j](Date.now());}catch(e){window.__err.push(String(e));}}}};
window.__frames=function(){return F;};`;

function pumpScript(mode: "always" | "query"): string {
  if (mode === "always") {
    return `<script>(function(){${PUMP_BODY}})();</script>`;
  }
  return `<script>if(location.search.indexOf('pump')>=0){(function(){${PUMP_BODY}})();}</script>`;
}

const PAGE_CSS = `:root{--fg:#1c1c1e;--bg:#fbfbf9;--muted-fg:#77777c;--border:rgba(128,128,128,.28);
--surface:#fff;--radius:4px;--accent:#36c}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);
font:14px/1.6 system-ui,sans-serif}
.marketing-site-root{height:100%;display:flex;flex-direction:column}
.useless-stage{display:flex;flex-direction:column;align-items:center;gap:1rem;
width:100%;flex:1 1 auto;min-height:0}
.useless-thing{display:flex;flex-direction:column;width:100%;flex:1 1 auto;min-height:0}
${USELESS_CSS}`;

export function buildUselessThumbnailDocument(
  html: string,
  options: { pump?: "always" | "query" } = {},
): string {
  const pump = pumpScript(options.pump ?? "query");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>useless</title>${pump}<style>${PAGE_CSS}</style></head><body>
<div class="marketing-site-root"><div class="useless-stage">
<div class="useless-thing">${html}</div></div></div>
</body></html>`;
}
