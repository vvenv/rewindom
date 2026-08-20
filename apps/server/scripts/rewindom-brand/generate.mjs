/**
 * 从 mark.svg 生成 Rewindom 的全部位图品牌资产。
 *
 * SVG 是唯一手改的真源，位图一律由本脚本产出，不要用设计工具单独导一份——
 * 否则位图和 SVG 会各自漂移。各变体也**不重抄一遍路径**：脚本读 mark.svg 再做
 * 受控改写（去圆角 / 缩字形），改错了会当场抛错，而不是悄悄出一张不一样的图。
 *
 * 产物与用途见 README.md 的表。三种容器处理的区别是这脚本的全部要点：
 *   - favicon：保留自带圆角，没有平台遮罩，圆角得自己带
 *   - 头像 / apple-touch / maskable：满幅出血、**不带**圆角，平台自己会套遮罩，
 *     自带圆角会被二次裁切成一圈毛边
 *   - maskable 另外把字形缩到 Android 安全区（中心 80% 直径的圆）以内
 *
 * 配色照抄官网当前的深色 token（apps 的 SSR 内联 CSS）：
 *   bg #0a0a0a · fg #fafafa · muted-fg #a1a1aa · border rgba(250,250,250,.14) · accent #0369a1
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
const ACCENT_RGB = "3,105,161"; // #0369a1
const INK = "#0a0a0a"; // 浅底字标用

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

/**
 * 按变体改写 mark.svg。
 *
 * 两处改写都断言原文里确实有那个片段：mark.svg 的几何一旦重构（换成 <path> 画容器、
 * 或把 <g> 拆开），这里必须跟着改，抛错比出一张圆角没去掉的头像好。
 *
 * @param {string} source mark.svg 原文
 * @param {{ squared?: boolean; scale?: number }} opts
 */
function variantSvg(source, { squared = false, scale = 1 } = {}) {
  let svg = source;

  if (squared) {
    // 满幅出血：平台（iOS 圆角 / Android 遮罩 / X 圆形）自己会切，自带圆角会二次裁切
    if (!svg.includes('rx="60"')) {
      throw new Error('mark.svg 里找不到 rx="60"，容器几何变了，去圆角逻辑要跟着改');
    }
    svg = svg.replace('rx="60"', 'rx="0"');
  }

  if (scale !== 1) {
    // 绕画布中心缩字形，容器不动
    const marker = '<g fill="#FFFFFF">';
    if (!svg.includes(marker)) {
      throw new Error("mark.svg 里找不到字形 <g>，缩放逻辑要跟着改");
    }
    const shift = 128 * (1 - scale);
    svg = svg.replace(
      marker,
      `<g transform="translate(${shift.toFixed(2)} ${shift.toFixed(2)}) scale(${scale})" fill="#FFFFFF">`,
    );
  }

  return Buffer.from(svg, "utf8");
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
  // 缩放后仍要盖满整幅，范围给足
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
  // 末字后面那一份字距是排版留白，不该算进锁定关系的宽度
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
  const M = 88; // 左边距
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  paintGlow(ctx, 330); // 光晕压在锁定关系后面
  ctx.textBaseline = "middle";

  // 报头：标 + 字标
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

  // 先量宽度才能开画布：量的时候字距设置要和真正画的时候一致
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

/* 带圆角的原样标：favicon / OG / 字标里用，这些场景没有平台遮罩。 */
const rounded = await loadImage(variantSvg(source));
/* 满幅出血、无圆角：交给平台自己的遮罩。 */
const squared = await loadImage(variantSvg(source, { squared: true }));
/*
 * Android maskable：安全区是「中心 80% 直径的圆」。字形已在 mark.svg 里缩到 0.78，
 * 外缘离中心约 0.65 个半宽，本来就在安全区内；再收一档到 0.95，给遮罩留余量。
 */
const maskable = await loadImage(variantSvg(source, { squared: true, scale: 0.95 }));

await emit("og.png", buildOg(rounded, fonts), "1200x630 og:image / twitter:image");
await emit("favicon-512.png", rasterize(rounded, 512), "favicon 的 PNG 兜底（自带圆角）");
await emit("avatar-1024.png", rasterize(squared, 1024), "X / 微信公众号头像（满幅、无圆角）");
await emit("apple-touch-icon.png", rasterize(squared, 180), "iOS 加到主屏（系统套圆角）");
await emit("maskable-512.png", rasterize(maskable, 512), "Android 自适应图标（字形在安全区内）");
await emit("wordmark-light.png", buildWordmark(rounded, fonts, FG), "深底用的横向字标（白字）");
await emit("wordmark-dark.png", buildWordmark(rounded, fonts, INK), "浅底用的横向字标（黑字）");
