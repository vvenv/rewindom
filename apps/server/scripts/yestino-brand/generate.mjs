/**
 * 从 mark.svg 生成 Yestino 的位图品牌资产：og.png(1200x630) 与 favicon-512.png。
 *
 * SVG 是唯一手改的真源，位图一律由本脚本产出，不要用设计工具单独导一份——
 * 否则位图和 SVG 会各自漂移。
 *
 * 配色 / 版式全部照抄官网当前的深色 token（apps 的 SSR 内联 CSS）：
 *   bg #0a0a0a · fg #fafafa · muted-fg #a1a1aa · border rgba(250,250,250,.14) · accent #4F46E5
 * 顶部光晕就是官网 `.sec-glow` 那一手（accent 径向渐变），只是铺满整幅。
 *
 * 字体用官网自己发的 Inter（apps/client/public/assets/site-fonts），不吃系统字体，
 * 换台机器出图一致；找不到时回退系统 sans（出图会略有差异，CI 里别当基线）。
 *
 * 用法:
 *   pnpm --filter server exec node scripts/yestino-brand/generate.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GlobalFonts, createCanvas, loadImage } from "@napi-rs/canvas";

const DIR = dirname(fileURLToPath(import.meta.url));
const SITE_FONT_DIR = join(DIR, "../../../client/public/assets/site-fonts");

/** 官网深色模式 token —— 改这里之前先确认官网主题也改了。 */
const BG = "#0a0a0a";
const MUTED_FG = "#a1a1aa";
const FAINT_FG = "#52525b";
const BORDER = "rgba(250,250,250,.14)";
const ACCENT_RGB = "79,70,229"; // #4F46E5

/** OG 上的文案取官网 /en 的现行口径，改官网文案时同步改这里。 */
const TAGLINE = "Events discovered across sources, and how they got here";
const PILLS = ["Rising", "Now", "Timeline"];
const DOMAIN = "yestino.com";

async function registerInter() {
  try {
    const files = await readdir(SITE_FONT_DIR);
    // 文件名带内容 hash（inter-latin-wght-normal-<hash>.woff2），按前缀找
    const file = files.find(
      (name) => name.startsWith("inter-latin-wght-normal-") && name.endsWith(".woff2"),
    );
    if (file && GlobalFonts.registerFromPath(join(SITE_FONT_DIR, file), "Inter")) {
      return "Inter";
    }
  } catch {
    // 落到系统字体
  }
  GlobalFonts.loadSystemFonts();
  console.warn("[yestino-brand] 未找到 Inter，回退系统 sans");
  return "Helvetica Neue";
}

/** 官网 `.sec-glow`：顶部中央的 accent 径向光晕。 */
function paintGlow(ctx, width, height) {
  ctx.save();
  ctx.translate(width / 2, 40);
  ctx.scale(1, 0.62);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 980);
  glow.addColorStop(0, `rgba(${ACCENT_RGB},.34)`);
  glow.addColorStop(0.35, `rgba(${ACCENT_RGB},.15)`);
  glow.addColorStop(0.68, `rgba(${ACCENT_RGB},.04)`);
  glow.addColorStop(1, `rgba(${ACCENT_RGB},0)`);
  ctx.fillStyle = glow;
  // 缩放后仍要盖满整幅，范围给足
  ctx.fillRect(-width * 2, -height * 2, width * 4, height * 4);
  ctx.restore();
}

/** 官网事件卡片上的状态胶囊：只描边、不填色。 */
function paintPill(ctx, font, x, centerY, text) {
  const fontSize = 20;
  const padX = 18;
  const padY = 11;
  ctx.font = `500 ${fontSize}px ${font}`;
  const width = ctx.measureText(text).width + padX * 2;
  const height = fontSize + padY * 2;
  ctx.beginPath();
  ctx.roundRect(x, centerY - height / 2, width, height, 999);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = MUTED_FG;
  ctx.fillText(text, x + padX, centerY + 1);
  return width;
}

function paintCentered(ctx, text, y, width) {
  ctx.fillText(text, (width - ctx.measureText(text).width) / 2, y);
}

async function buildOg(mark, font) {
  const W = 1200;
  const H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  paintGlow(ctx, W, H);
  ctx.textBaseline = "middle";

  // 只放品牌标，水平居中
  const MARK_SIZE = 132;
  const rowX = (W - MARK_SIZE) / 2;
  const rowY = 158;
  ctx.drawImage(mark, rowX, rowY, MARK_SIZE, MARK_SIZE);

  ctx.font = `400 30px ${font}`;
  ctx.fillStyle = MUTED_FG;
  paintCentered(ctx, TAGLINE, 362, W);

  ctx.font = `500 20px ${font}`;
  const pillWidths = PILLS.map((text) => ctx.measureText(text).width + 36);
  const pillsWidth = pillWidths.reduce((a, b) => a + b, 0) + 12 * (PILLS.length - 1);
  let pillX = (W - pillsWidth) / 2;
  PILLS.forEach((text, i) => {
    paintPill(ctx, font, pillX, 446, text);
    pillX += pillWidths[i] + 12;
  });

  ctx.font = `400 20px ${font}`;
  ctx.fillStyle = FAINT_FG;
  paintCentered(ctx, DOMAIN, 524, W);

  return canvas.toBuffer("image/png");
}

function buildFavicon(mark, size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(mark, 0, 0, size, size);
  return canvas.toBuffer("image/png");
}

const font = await registerInter();
const mark = await loadImage(await readFile(join(DIR, "mark.svg")));

const og = await buildOg(mark, font);
await writeFile(join(DIR, "og.png"), og);
console.log(`[yestino-brand] og.png 1200x630 ${og.byteLength}B (font=${font})`);

const favicon = buildFavicon(mark, 512);
await writeFile(join(DIR, "favicon-512.png"), favicon);
console.log(`[yestino-brand] favicon-512.png ${favicon.byteLength}B`);
