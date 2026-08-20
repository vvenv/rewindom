/**
 * 从 mark.svg 生成 Rewindom 的全部位图品牌资产。
 *
 * SVG 是唯一手改的真源，位图一律由本脚本产出，不要用设计工具单独导一份——
 * 否则位图和 SVG 会各自漂移。各变体也**不重抄一遍路径**：脚本读 mark.svg 再做
 * 受控改写（换填色 / 铺平台底 / 缩字形），改错了会当场抛错。
 *
 * 产物与用途见 README.md 的表。两种处理的区别是这脚本的全部要点：
 *   - 页头 / favicon / OG / 字标：玉玦本身，透明底。浅底 #0369a1，深底 #38bdf8
 *   - 头像 / apple-touch / maskable：铺满 accent、白玉玦；平台自己会套遮罩，
 *     那层底是平台的画布，不是品牌容器。maskable 另外把字形缩进安全区
 *
 * 配色照抄官网当前的深色 token（apps 的 SSR 内联 CSS）：
 *   bg #0a0a0a · fg #fafafa · muted-fg #a1a1aa · accent #0369a1 · dark mark #38bdf8
 * 顶部光晕就是官网 `.sec-glow` 那一手（accent 径向渐变）。
 *
 * 用法:
 *   pnpm --filter server exec node scripts/rewindom-brand/generate.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GlobalFonts, createCanvas, loadImage } from "@napi-rs/canvas";

const DIR = dirname(fileURLToPath(import.meta.url));
const SITE_FONT_DIR = join(DIR, "../../../client/public/assets/site-fonts");

/** 官网深色模式 token —— 改这里之前先确认官网主题也改了。 */
const BG = "#0a0a0a";
const FG = "#fafafa";
const MUTED_FG = "#a1a1aa";
const FAINT_FG = "#52525b";
const RULE = "rgba(250,250,250,.10)";
const ACCENT = "#0369a1";
const ACCENT_RGB = "3,105,161";
const MARK_LIGHT = "#0369a1";
const MARK_DARK = "#38bdf8";
const INK = "#0a0a0a";

/**
 * 与 Logo.tsx / favicon.svg 同一条 path。mark.svg 一旦改几何，这里对不上就抛错。
 */
const GLYPH_PATH =
  "M87.54 27.86A108 108 0 1 0 168.46 27.86L142.24 92.77A38 38 0 1 1 113.76 92.77Z";

/**
 * 字标与正文都走 Inter：产品站 `theme_settings.font_family` 就是它，
 * 不另立显示体。一款字面用字重拉开层级——报头 / 主行 700，支撑句 400。
 *
 * 不走 Newsreader：那是资讯产品的编辑体。Rewindom 是给编码 Agent 用的
 * SaaS 底座，混排无衬线才是它在开发者工具堆里的声音。
 */
const DISPLAY_SLUG = "inter";
const BODY_SLUG = "inter";

/** OG / 字标上的文案取官网 /en 的现行口径，改官网文案时同步改这里。 */
const BRAND = "Rewindom";
/**
 * 字标排版：混排、不配字距。产品名不是新闻报头，全大写会把它收成又一个
 * 无衬线 SaaS 胶囊。混排必须 TRACK=0——这和 yestino 的全大写+宽字距是
 * 同一条规则的另一面。
 */
const BRAND_WEIGHT = 700;
const BRAND_TRACK_EM = 0;
/**
 * 主行取站点 `tagline` 的 en 版本。site_name 就是品牌名（已经在报头），
 * 没有 yestino 那种 `Name - The Signal` 后半截；tagline 才是那句压得住
 * 分享卡的话。支撑行取 `hero.eyebrow`——短、缩到 300px 仍是质感不是噪点。
 *
 * 查现行值：
 *   select site_name, tagline from "MarketingSite";
 * eyebrow 在 `packages/builtin/marketing/client/locales/en.json` 的 `hero.eyebrow`。
 */
const LEAD = "The foundation takes the shape of the product";
const EYEBROW = "Open source · modular monolith";
const DOMAIN = "rewindom.com";

/**
 * 站点发的是可变字重 woff2，文件名带内容 hash（`<slug>-latin-wght-normal-<hash>.woff2`），
 * 按前缀找。不吃系统字体——换台机器出图一致；找不到时回退系统 sans（出图会略有
 * 差异，CI 里别当基线）。
 */
async function registerSiteFonts() {
  let files = [];
  try {
    files = await readdir(SITE_FONT_DIR);
  } catch {
    files = [];
  }

  const pick = (slug, family) => {
    const file = files.find(
      (name) => name.startsWith(`${slug}-latin-wght-normal-`) && name.endsWith(".woff2"),
    );
    if (file && GlobalFonts.registerFromPath(join(SITE_FONT_DIR, file), family)) {
      return family;
    }
    return null;
  };

  const display = pick(DISPLAY_SLUG, "RewindomDisplay");
  const body = pick(BODY_SLUG, "RewindomBody");
  if (display && body) {
    return { display, body };
  }

  GlobalFonts.loadSystemFonts();
  console.warn("[rewindom-brand] 站点字体缺失，回退系统字体");
  return { display: display ?? "Helvetica Neue", body: body ?? "Helvetica Neue" };
}

/** 从 mark.svg 抽出 path；对不上 GLYPH_PATH 就停，避免位图悄悄漂。 */
function readGlyphPath(source) {
  const match = source.match(/\sd="([^"]+)"/);
  if (!match) {
    throw new Error("mark.svg 里找不到 path d，几何变了，生成逻辑要跟着改");
  }
  if (match[1] !== GLYPH_PATH) {
    throw new Error("mark.svg 的 path 与 Logo.tsx 那条对不上，生成逻辑要跟着改");
  }
  return match[1];
}

function svgBuffer(inner) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${inner}</svg>`,
    "utf8",
  );
}

function scaleGroup(inner, scale) {
  if (scale === 1) return inner;
  const shift = (128 * (1 - scale)).toFixed(2);
  return `<g transform="translate(${shift} ${shift}) scale(${scale})">${inner}</g>`;
}

/** 透明底玉玦，给页头 / favicon / OG / 字标。 */
function glyphSvg(path, fill, scale = 1) {
  return svgBuffer(scaleGroup(`<path fill="${fill}" d="${path}"/>`, scale));
}

/**
 * 平台图标：铺满 accent、白玉玦、无圆角。
 * 方/圆是 iOS / Android / X 裁出来的，品牌自己不画容器。
 */
function platformSvg(path, scale = 1) {
  return svgBuffer(
    `<rect width="256" height="256" fill="${ACCENT}"/>${scaleGroup(
      `<path fill="#FFFFFF" d="${path}"/>`,
      scale,
    )}`,
  );
}

/** 官网 `.sec-glow`：accent 径向光晕。`cx` 跟着版面走，不是无来由的顶部居中。 */
function paintGlow(ctx, cx) {
  ctx.save();
  ctx.translate(cx, 30);
  ctx.scale(1, 0.62);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 900);
  glow.addColorStop(0, `rgba(${ACCENT_RGB},.34)`);
  glow.addColorStop(0.35, `rgba(${ACCENT_RGB},.15)`);
  glow.addColorStop(0.68, `rgba(${ACCENT_RGB},.04)`);
  glow.addColorStop(1, `rgba(${ACCENT_RGB},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-2400, -1600, 4800, 3200);
  ctx.restore();
}

/**
 * 画字标：设字号 / 字距，并按**墨迹**上下沿做垂直居中。
 *
 * 混排虽有升部，按 em 盒（textBaseline="middle"）仍会和旁边的标对不齐。
 * 取 actualBoundingBox 才是眼睛看到的中心。
 *
 * @returns 这段字标的宽度，调用方用它算锁定关系的总宽
 */
function paintBrand(ctx, font, size, x, centerY, color) {
  const prevBaseline = ctx.textBaseline;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${(size * BRAND_TRACK_EM).toFixed(2)}px`;
  ctx.font = `${BRAND_WEIGHT} ${size}px ${font}`;
  ctx.fillStyle = color;
  const metrics = ctx.measureText(BRAND);
  const inkCenter =
    (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  ctx.fillText(BRAND, x, centerY + inkCenter);
  ctx.letterSpacing = "0px";
  ctx.textBaseline = prevBaseline;
  return metrics.width - size * BRAND_TRACK_EM;
}

/** 折行：OG 上没有溢出滚动这回事，长句必须自己断。 */
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * og:image / twitter:image。
 *
 * 整幅左对齐、靠一条分隔线把「是谁」和「做什么」分开——分享卡的第一任务是让人
 * 记住品牌名，不是复述产品描述。
 */
function buildOg(mark, fonts) {
  const W = 1200;
  const H = 630;
  const M = 88;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  paintGlow(ctx, 330);
  ctx.textBaseline = "middle";

  const MARK_SIZE = 84;
  const lockY = 128;
  ctx.drawImage(mark, M, lockY, MARK_SIZE, MARK_SIZE);
  paintBrand(ctx, fonts.display, 46, M + MARK_SIZE + 28, lockY + MARK_SIZE / 2, FG);

  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M, 268);
  ctx.lineTo(W - M, 268);
  ctx.stroke();

  /*
   * 主行走显示体、跟报头同一个声音。分享卡在信息流里常被缩到 300px 上下，
   * 那个尺寸上只有报头和这一行还立得住 —— 所以层级要拉开。
   * tagline 比 yestino 的 "The Signal" 长，按实测宽度折最多两行，字号略收。
   */
  const leadMax = W - M * 2;
  ctx.font = `${BRAND_WEIGHT} 48px ${fonts.display}`;
  const leadLines = wrapLines(ctx, LEAD, leadMax).slice(0, 2);
  ctx.fillStyle = FG;
  leadLines.forEach((line, i) => {
    ctx.fillText(line, M, 344 + i * 58);
  });

  ctx.font = `400 26px ${fonts.body}`;
  ctx.fillStyle = MUTED_FG;
  ctx.fillText(EYEBROW, M, 344 + leadLines.length * 58 + 36);

  ctx.font = `400 20px ${fonts.body}`;
  ctx.fillStyle = FAINT_FG;
  ctx.fillText(DOMAIN, M, 546);

  return canvas.toBuffer("image/png");
}

/**
 * 横向字标锁定关系，透明底，给公众号头图 / 演示稿 / 页脚用。
 * 出深浅两版：透明底解决不了字色，深底上要白字、浅底上要黑字。
 */
function buildWordmark(mark, fonts, color) {
  const H = 240;
  const MARK = 156;
  const GAP = 48;
  const SIZE = 92;

  const probe = createCanvas(8, 8).getContext("2d");
  probe.letterSpacing = `${(SIZE * BRAND_TRACK_EM).toFixed(2)}px`;
  probe.font = `${BRAND_WEIGHT} ${SIZE}px ${fonts.display}`;
  const textWidth = probe.measureText(BRAND).width - SIZE * BRAND_TRACK_EM;

  const canvas = createCanvas(MARK + GAP + Math.ceil(textWidth), H);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(mark, 0, (H - MARK) / 2, MARK, MARK);
  paintBrand(ctx, fonts.display, SIZE, MARK + GAP, H / 2, color);
  return canvas.toBuffer("image/png");
}

function rasterize(image, size) {
  const canvas = createCanvas(size, size);
  canvas.getContext("2d").drawImage(image, 0, 0, size, size);
  return canvas.toBuffer("image/png");
}

async function emit(name, buffer, note) {
  await writeFile(join(DIR, name), buffer);
  console.log(`[rewindom-brand] ${name} ${buffer.byteLength}B — ${note}`);
}

const fonts = await registerSiteFonts();
const source = await readFile(join(DIR, "mark.svg"), "utf8");
const path = readGlyphPath(source);

const light = await loadImage(glyphSvg(path, MARK_LIGHT));
const dark = await loadImage(glyphSvg(path, MARK_DARK));
const platform = await loadImage(platformSvg(path));
/*
 * Android maskable：安全区是「中心 80% 直径的圆」。玉玦外缘半径 108，
 * 半宽 128，约 0.84 个半宽，略出安全区；缩到 0.9 落进去。
 */
const maskable = await loadImage(platformSvg(path, 0.9));

await emit("og.png", buildOg(dark, fonts), "1200x630 og:image / twitter:image");
await emit("favicon-512.png", rasterize(light, 512), "favicon 的 PNG 兜底（透明底玉玦）");
await emit("avatar-1024.png", rasterize(platform, 1024), "X / 微信公众号头像（accent 底、白玉玦）");
await emit("apple-touch-icon.png", rasterize(platform, 180), "iOS 加到主屏（系统套圆角）");
await emit("maskable-512.png", rasterize(maskable, 512), "Android 自适应图标（字形在安全区内）");
await emit("wordmark-light.png", buildWordmark(dark, fonts, FG), "深底用的横向字标（#38bdf8 标 + 白字）");
await emit("wordmark-dark.png", buildWordmark(light, fonts, INK), "浅底用的横向字标（#0369a1 标 + 黑字）");
