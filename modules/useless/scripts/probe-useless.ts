/**
 * 无头核对台：把一件可交互物装进 Chromium，泵帧、跑探针、把结果打出来。
 *
 * 之前这套核对是靠浏览器扩展现敲 JS 做的——扩展一断线就全断，
 * 而且每次都得重写一遍取样代码。这里把它落成脚本，可复跑、可进 diff。
 *
 *   pnpm --filter @rewindom/useless exec tsx scripts/probe-useless.ts <标题> <探针文件> [帧数]
 *
 * 探针文件是一段 JS，在页面里求值，能拿到：
 *   CV   画布
 *   G    2d 上下文
 *   px() 整张画布的 ImageData
 *   pump(n)  再泵 n 帧
 *   tap(fx,fy)     在相对坐标上按一下（pointerdown）
 *   drag(fx,fy)    在相对坐标上拖一下（pointermove + buttons）
 * 最后一个表达式的值会被打印。
 */
import { readFileSync } from "node:fs";

import { SEED_EMBEDS } from "../server/seed-embeds.js";
import {
  THUMBNAIL_VIEWPORT,
  buildUselessThumbnailDocument,
} from "../server/thumbnail-page.js";

const [title, probePath, framesArg] = process.argv.slice(2);
if (!title || !probePath) {
  console.error("用法：probe-useless.ts <标题> <探针文件> [帧数]");
  process.exit(1);
}

const embed = SEED_EMBEDS.find((e) => e.title === title);
if (!embed) {
  console.error(`没有「${title}」。目录里有 ${SEED_EMBEDS.length} 条。`);
  process.exit(1);
}

const probe = readFileSync(probePath, "utf8");
const frames = Number(framesArg ?? 300);

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: THUMBNAIL_VIEWPORT });
  page.on("pageerror", (e) => console.error("[页面报错]", String(e)));
  await page.setContent(
    buildUselessThumbnailDocument(embed.html, { pump: "always" }),
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction("typeof window.__pump === 'function'");
  await page.evaluate(`window.__pump(${frames})`);

  const result = await page.evaluate(`(function(){
    var ROOT = document.querySelector('.useless-thing');
    var CV = ROOT && ROOT.querySelector('canvas');
    var G = CV && CV.getContext('2d');
    var box = (CV || ROOT) && (CV || ROOT).getBoundingClientRect();
    function px(){ return G.getImageData(0, 0, CV.width, CV.height); }
    function pump(n){ window.__pump(n); }
    function ev(type, fx, fy, buttons){
      (CV || ROOT).dispatchEvent(new PointerEvent(type, {
        clientX: box.left + box.width * fx,
        clientY: box.top + box.height * fy,
        buttons: buttons, bubbles: true, pointerId: 1,
      }));
    }
    function tap(fx, fy){ ev('pointerdown', fx == null ? 0.5 : fx, fy == null ? 0.5 : fy, 1); }
    function drag(fx, fy){ ev('pointermove', fx, fy, 1); }
    return (function(){ ${probe} })();
  })()`);

  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
  const errs = await page.evaluate("window.__err");
  if (Array.isArray(errs) && errs.length) console.error("[rAF 报错]", errs);
} finally {
  await browser.close();
}
