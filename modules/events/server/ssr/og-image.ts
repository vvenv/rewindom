/**
 * 事件的社交卡片图（og:image）—— 1200×630 PNG，按需生成。
 *
 * 为什么每条事件要有自己的图：卡片是这条链接在别人时间线里的**全部外观**。
 * 十条事件共用一张品牌图时，读者只能靠那行小字标题分辨，点开率被白白压掉。
 *
 * 配色与版式照抄 `apps/server/scripts/yestino-brand/generate.mjs` 里的官网深色 token
 * ——分享卡片与落地页要像同一个产品。改官网主题时两处一起改。
 *
 * **可降级**：服务端进程手里不一定有字体文件（容器、精简镜像）。拿不到字体就报
 * 「不可用」，详情页据此不设 og:image，回落站点品牌图。宁可少一个花样，
 * 也不要发一张字都画不出来的图。
 */

import { readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GlobalFonts, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

const WIDTH = 1200;
const HEIGHT = 630;

/** 官网深色 token —— 改这里之前先确认官网主题也改了。 */
const BG = "#0a0a0a";
const FG = "#fafafa";
const MUTED_FG = "#a1a1aa";
const BORDER = "rgba(250,250,250,.14)";
const ACCENT_RGB = "79,70,229"; // #4F46E5

/** 官网自己发的字体，dist 那份在容器里也在（Dockerfile 拷了 client/dist）。 */
const FONT_DIRS = [
  "apps/client/dist/assets/site-fonts",
  "apps/client/public/assets/site-fonts",
];

export interface EventOgInput {
  title: string;
  /** 已落成当前语言的主题名 / 阶段名，画成胶囊 */
  pills: readonly string[];
  /** 「12 个来源」这类已经拼好的一行小字；空串则不画 */
  footnote: string;
  /** 右下角的站点标识，一般是域名 */
  brand: string;
}

/**
 * 中日韩兜底字族。
 *
 * 官网发的 Inter 只有拉丁字形——站点主语言是中文时，胶囊与脚注会画成一排豆腐块
 * （实测，别再只挂 Inter）。这里按序找系统里**真的存在**的一款接在后面，
 * skia 会逐字回退。一款都没有时不额外做什么：拉丁内容照常，非拉丁仍是豆腐，
 * 那是运行环境缺字体，不该让整张卡片跟着不出。
 */
const CJK_FALLBACKS = [
  "PingFang SC",
  "Hiragino Sans GB",
  "Hiragino Sans",
  "Noto Sans CJK SC",
  "Noto Sans SC",
  "Source Han Sans SC",
  "Microsoft YaHei",
  "WenQuanYi Zen Hei",
  "Songti SC",
  "Arial Unicode MS",
];

/**
 * 字体只解析一次，解析结果是一条**字族列表**（canvas 的 font 简写支持逐字回退）。
 *
 * `null` = 还没试过；`""` = 试过且一个都没有（此时整个功能不可用）。
 */
let resolvedFont: string | null = null;

/** 字族名带空格时要加引号，否则 canvas 的 font 简写解析不出来。 */
function quoteFamily(name: string): string {
  return name.includes(" ") ? `"${name}"` : name;
}

function withCjkFallback(primary: string): string {
  const extra = CJK_FALLBACKS.filter((name) => GlobalFonts.has(name));
  return [primary, ...extra].map(quoteFamily).join(", ");
}

/** 从本文件往上找仓库根（容器里是 `/app`，开发时是仓库目录）。 */
function repoRootFrom(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "apps", "client"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function resolveFont(): string {
  if (resolvedFont !== null) return resolvedFont;

  const root = repoRootFrom(dirname(fileURLToPath(import.meta.url)));
  if (root) {
    for (const relative of FONT_DIRS) {
      const dir = join(root, relative);
      if (!existsSync(dir)) continue;
      // 文件名带内容 hash（inter-latin-wght-normal-<hash>.woff2），按前缀找
      const file = readdirSync(dir).find(
        (name) =>
          name.startsWith("inter-latin-wght-normal-") && name.endsWith(".woff2"),
      );
      if (file && GlobalFonts.registerFromPath(join(dir, file), "Inter")) {
        resolvedFont = withCjkFallback("Inter");
        return resolvedFont;
      }
    }
  }

  /*
   * 找不到 Inter 就用系统字体（napi-rs canvas 在 import 时就把它们加载好了）。
   * 精简镜像里可能一个都没有——那时 `families` 是空的，整个功能报「不可用」。
   */
  const system = GlobalFonts.families[0]?.family;
  resolvedFont = system ? withCjkFallback(system) : "";
  return resolvedFont;
}

/**
 * 这个进程画不画得出卡片图。
 *
 * 调用方（详情页）据此决定要不要指过来——不可用时**不设** og:image，
 * 页面回落站点品牌图，而不是发一个 404 的图片地址。
 */
export function isEventOgImageAvailable(): boolean {
  return resolveFont() !== "";
}

/** 官网 `.sec-glow`：顶部中央的 accent 径向光晕。 */
function paintGlow(ctx: SKRSContext2D): void {
  ctx.save();
  ctx.translate(WIDTH / 2, 40);
  ctx.scale(1, 0.62);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 980);
  glow.addColorStop(0, `rgba(${ACCENT_RGB},.34)`);
  glow.addColorStop(0.35, `rgba(${ACCENT_RGB},.15)`);
  glow.addColorStop(0.68, `rgba(${ACCENT_RGB},.04)`);
  glow.addColorStop(1, `rgba(${ACCENT_RGB},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(-WIDTH * 2, -HEIGHT * 2, WIDTH * 4, HEIGHT * 4);
  ctx.restore();
}

/**
 * 断行的最小单位。
 *
 * **不能只按空格断**：中文标题整句没有空格，会被当成一个词一路画出画布
 * （实测，混排的「OpenAI 与微软就算力……」正是这样跑飞的）。所以拉丁词整块走、
 * 中日韩逐字走，`glue` 记住这一格前面原本有没有空格，好把行文本还原回去。
 */
interface WrapToken {
  text: string;
  glue: string;
}

/** 中日韩（含全角标点）——这些字符之间可以直接断行。 */
const BREAKABLE = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uff60\u3000-\u303f]/u;

export function tokenize(text: string): WrapToken[] {
  const tokens: WrapToken[] = [];
  let latin = "";
  let pendingGlue = "";

  const flushLatin = (): void => {
    if (!latin) return;
    tokens.push({ text: latin, glue: tokens.length === 0 ? "" : pendingGlue });
    latin = "";
    pendingGlue = "";
  };

  for (const char of text) {
    if (/\s/u.test(char)) {
      flushLatin();
      pendingGlue = " ";
      continue;
    }
    if (BREAKABLE.test(char)) {
      flushLatin();
      tokens.push({ text: char, glue: tokens.length === 0 ? "" : pendingGlue });
      pendingGlue = "";
      continue;
    }
    latin += char;
  }
  flushLatin();
  return tokens;
}

/** 按宽度断行，最多 `maxLines` 行，超出的用省略号收尾。 */
export function wrapLines(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const tokens = tokenize(text);
  const lines: string[] = [];
  let current = "";
  let used = 0;

  for (const token of tokens) {
    const candidate = current ? `${current}${token.glue}${token.text}` : token.text;
    if (measure(candidate) <= maxWidth || current === "") {
      current = candidate;
      used += 1;
      continue;
    }
    lines.push(current);
    if (lines.length === maxLines) {
      current = "";
      break;
    }
    current = token.text;
    used += 1;
  }
  if (current && lines.length < maxLines) lines.push(current);

  // 还有没画完的格子 → 最后一行收省略号（省略号自己也要占宽度）
  if (used < tokens.length && lines.length > 0) {
    let last = lines[lines.length - 1] ?? "";
    while (last && measure(`${last}…`) > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

/** 事件卡片上那种只描边不填色的胶囊。 */
function paintPill(
  ctx: SKRSContext2D,
  font: string,
  x: number,
  centerY: number,
  text: string,
): number {
  const fontSize = 22;
  const padX = 18;
  const padY = 11;
  ctx.font = `500 ${fontSize}px ${font}`;
  const width = ctx.measureText(text).width + padX * 2;
  const height = fontSize + padY * 2;
  const top = centerY - height / 2;
  ctx.beginPath();
  ctx.roundRect(x, top, width, height, height / 2);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = MUTED_FG;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, centerY + 1);
  return x + width + 12;
}

/**
 * 画一张卡片。字体不可用时抛——调用方应当先问 `isEventOgImageAvailable()`。
 */
export function renderEventOgPng(input: EventOgInput): Buffer {
  const font = resolveFont();
  if (font === "") {
    throw new Error("events.og_font_unavailable");
  }

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  paintGlow(ctx);

  const marginX = 72;
  let cursorX = marginX;
  for (const pill of input.pills.slice(0, 3)) {
    cursorX = paintPill(ctx, font, cursorX, 110, pill);
  }

  const titleSize = 60;
  ctx.font = `700 ${titleSize}px ${font}`;
  ctx.fillStyle = FG;
  ctx.textBaseline = "alphabetic";
  const lines = wrapLines(
    (text) => ctx.measureText(text).width,
    input.title,
    WIDTH - marginX * 2,
    3,
  );
  /*
   * 标题块**垂直居中**在胶囊行与脚注之间：一行、两行、三行的标题都摆在同一块
   * 视觉重心上，卡片不会因为标题长短一会儿头重一会儿脚重。
   */
  const lineHeight = titleSize * 1.25;
  const bandCenter = (150 + (HEIGHT - 130)) / 2;
  let y = bandCenter - (lines.length * lineHeight) / 2 + titleSize;
  for (const line of lines) {
    ctx.fillText(line, marginX, y);
    y += lineHeight;
  }

  if (input.footnote) {
    ctx.font = `400 26px ${font}`;
    ctx.fillStyle = MUTED_FG;
    ctx.fillText(input.footnote, marginX, HEIGHT - 96);
  }

  ctx.font = `500 26px ${font}`;
  ctx.fillStyle = MUTED_FG;
  ctx.fillText(input.brand, marginX, HEIGHT - 48);

  return canvas.toBuffer("image/png");
}
