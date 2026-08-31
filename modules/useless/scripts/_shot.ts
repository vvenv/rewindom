/** 把一条装进无头 Chromium，按给定的脚本走一段，截图存盘。 */
import { SEED_EMBEDS } from "../server/seed-embeds.js";
import { THUMBNAIL_VIEWPORT, buildUselessThumbnailDocument } from "../server/thumbnail-page.js";

const [title, outDir, plan] = process.argv.slice(2);
const embed = SEED_EMBEDS.find((e) => e.title === title);
if (!embed) { console.error("没有这条：" + title); process.exit(1); }

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: THUMBNAIL_VIEWPORT });
page.on("pageerror", (e) => console.error("[页面报错]", String(e)));
await page.setContent(buildUselessThumbnailDocument(embed.html, { pump: "always" }), { waitUntil: "domcontentloaded" });
await page.waitForFunction("typeof window.__pump === 'function'");
await page.evaluate(`window.__box = (function(){
  var R=document.querySelector('.useless-thing'), C=R.querySelector('canvas');
  return (C||R).getBoundingClientRect();
})();
window.__tap = function(fx,fy){
  var R=document.querySelector('.useless-thing'), C=R.querySelector('canvas'), b=window.__box;
  (C||R).dispatchEvent(new PointerEvent('pointerdown',{clientX:b.left+b.width*fx,
    clientY:b.top+b.height*fy,buttons:1,bubbles:true,pointerId:1}));
};`);

// plan: "名字:帧数[:fx,fy] , ..."
for (const step of plan.split(",")) {
  const [name, frames, spot] = step.split(":");
  if (spot) { const [fx, fy] = spot.split("/").map(Number); await page.evaluate(`window.__tap(${fx},${fy})`); }
  await page.evaluate(`window.__pump(${Number(frames)})`);
  await page.screenshot({
    path: `${outDir}/${name}.png`,
    omitBackground: true,
  });
  console.log("→", name);
}
const errs = await page.evaluate("window.__err");
if (Array.isArray(errs) && errs.length) console.error("[rAF 报错]", errs);
await browser.close();
