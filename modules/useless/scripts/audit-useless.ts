/**
 * 把每一条都装进无头 Chromium 跑一遍，找"根本没在动"的。
 *
 * 查四件事，都是吃过亏才加的：
 *   画了没  —— 同步阶段抛错的话，泵帧的 try/catch 抓不到，画布一个像素都没被碰过
 *   还在动没 —— rAF 链断了、或者跑进了不动的定点
 *   报错没  —— rAF 里抛的
 *   点了有反应没 —— 只对声明了 pointerdown 的条目查
 *
 * 只判"死没死"，判不了"说的和做的是不是一回事"——那个得一条一条写探针。
 */
import { SEED_EMBEDS } from "../server/seed-embeds.js";
import {
  THUMBNAIL_VIEWPORT,
  buildUselessThumbnailDocument,
} from "../server/thumbnail-page.js";

const only = process.argv.slice(2);
const list = only.length
  ? SEED_EMBEDS.filter((e) => only.includes(e.title))
  : SEED_EMBEDS;

const PROBE = `(function(){
  var ROOT = document.querySelector('.useless-thing');
  if (!ROOT) return { kind: 'noroot' };
  var CV = ROOT.querySelector('canvas');
  var G = CV && CV.getContext('2d');
  // 有画布就取像素，没有就把 DOM 和内联样式当状态——不少条目根本不用画布
  function hash(){
    var h = 0, lit = 0, n = 0;
    if (CV) {
      var d = G.getImageData(0, 0, CV.width, CV.height).data;
      for (var i = 0; i < d.length; i += 4 * 7) {
        n++; h = (h * 31 + d[i] + d[i+1] * 3 + d[i+2] * 7) | 0;
        if (d[i] + d[i+1] + d[i+2] > 40) lit++;
      }
    } else {
      var s = ROOT.innerHTML;
      var els = ROOT.querySelectorAll('*');
      for (var k = 0; k < els.length; k++) s += '|' + (els[k].getAttribute('style') || '');
      for (var j = 0; j < s.length; j++) h = (h * 31 + s.charCodeAt(j)) | 0;
      n = 1; lit = 1;
    }
    return { h: h, lit: +(lit / n * 100).toFixed(2) };
  }
  var box = (CV || ROOT).getBoundingClientRect();
  function ev(type, fx, fy, buttons){
    (CV || ROOT).dispatchEvent(new PointerEvent(type, {
      clientX: box.left + box.width * fx, clientY: box.top + box.height * fy,
      buttons: buttons, bubbles: true, pointerId: 1,
    }));
  }
  window.__pump(220);
  var a = hash();
  window.__pump(160);
  var b = hash();
  window.__pump(160);
  var c = hash();
  // 摸得散一点、也多给几帧：只点正中间 + 只泵 6 帧，好几条"等你动手"的条目
  // 会被误判成死的——它们的热区不在正中，动画也要几帧才起来
  var before = hash();
  // 右上角要有一个：「推送」那张卡片就贴在那儿，热区只有它
  var spots = [[0.5,0.5],[0.28,0.34],[0.72,0.36],[0.30,0.70],[0.70,0.72],[0.5,0.14],[0.5,0.86],[0.80,0.11]];
  // 按下去要停一会儿再松：「一次」是按住才长、松手当场清空的，
  // 按下就松的手势正好是它设计来惩罚的那个，一松全没，看着就像死的。
  // 而且只比"最后一帧"也不行——「协调」点下的单格本来就会被吞回去。
  // 所以：按住、给帧、每几帧看一眼，有一眼不一样就算它认了这回事
  var reacted = false;
  for (var si = 0; si < spots.length && !reacted; si++) {
    ev('pointerdown', spots[si][0], spots[si][1], 1);
    for (var t = 0; t < 4; t++) {
      window.__pump(5);
      ev('pointermove', spots[si][0] + 0.02 * t, spots[si][1] + 0.02 * t, 1);
      if (hash().h !== before.h) { reacted = true; break; }
    }
    ev('pointerup', spots[si][0], spots[si][1], 0);
    window.__pump(4);
    if (hash().h !== before.h) reacted = true;
  }
  // 还有敲键盘的：「最后一个键」整条是个键盘，只听 keydown，
  // 光用指针事件永远探不到，会被判成死的
  if (!reacted) {
    var target = ROOT.querySelector('[tabindex]') || ROOT.firstElementChild || ROOT;
    if (target.focus) target.focus();
    var keys = ['A', 'E', 'S', ' '];
    for (var ki = 0; ki < keys.length && !reacted; ki++) {
      for (var el = 0; el < 2; el++) {
        (el ? target : ROOT).dispatchEvent(
          new KeyboardEvent('keydown', { key: keys[ki], bubbles: true }),
        );
      }
      window.__pump(8);
      if (hash().h !== before.h) reacted = true;
    }
  }
  var after = { h: reacted ? before.h + 1 : before.h };
  return {
    canvas: !!CV,
    lit: c.lit,
    moving: !(a.h === b.h && b.h === c.h),
    reacts: before.h !== after.h,
    err: (window.__err || []).slice(0, 2),
  };
})()`;

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const bad: string[] = [];
try {
  const page = await browser.newPage({ viewport: THUMBNAIL_VIEWPORT });
  for (const embed of list) {
    const wantsTap = embed.html.includes("'pointerdown'");
    let pageErr = "";
    const onErr = (e: Error) => {
      pageErr = String(e).slice(0, 120);
    };
    page.on("pageerror", onErr);
    try {
      await page.setContent(
        buildUselessThumbnailDocument(embed.html, { pump: "always" }),
        { waitUntil: "domcontentloaded" },
      );
      await page.waitForFunction("typeof window.__pump === 'function'");
      const r = (await page.evaluate(PROBE)) as {
        kind?: string;
        canvas: boolean;
        lit: number;
        moving: boolean;
        reacts: boolean;
        err: string[];
      };
      const flags: string[] = [];
      if (r.kind === "noroot") flags.push("连容器都没有");
      if (pageErr) flags.push("同步阶段抛错：" + pageErr);
      if (r.err?.length) flags.push("rAF 抛错：" + r.err.join(" | "));
      // 判死的标准只有一条：既不自己动，点了也没反应。
      // 「静止等你动手」是好几条的正常样子（观察、审核、默认值都是），不算死
      if (!r.moving && !r.reacts) flags.push("既不自己动，点了也没反应");
      if (r.canvas && r.lit < 0.3 && !r.reacts) flags.push(`画布几乎全黑（亮 ${r.lit}%）且点了没反应`);
      if (wantsTap && !r.reacts) flags.push("接了 pointerdown 但点了没反应");
      if (flags.length) {
        bad.push(embed.title);
        console.log(`✗ ${embed.title}  ${flags.join("；")}`);
      }
    } finally {
      page.off("pageerror", onErr);
    }
  }
} finally {
  await browser.close();
}
console.log(`\n体检 ${list.length} 条，有问题的 ${bad.length} 条${bad.length ? "：" + bad.join("、") : "。"}`);
