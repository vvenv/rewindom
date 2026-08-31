/* eslint-disable no-console */
/**
 * 把 useless 的可交互物摊成一张本地页，一屏一条，直接在浏览器里看。
 *
 *   pnpm --filter server exec tsx scripts/preview-useless.ts            # 全部
 *   pnpm --filter server exec tsx scripts/preview-useless.ts 燃烧的纸 双摆  # 只看这几条
 *
 * 写到 /tmp/useless-preview.html，用 OUT=... 改路径。**别用 file:// 打开**：
 * 有几条要读 localStorage，file:// 下的源是 opaque 的，跨访问记忆那一层看不出来。
 * 起个静态服务再看：
 *
 *   python3 -m http.server 8791 -d /tmp
 *
 * `?pump` 会把 rAF 换成手动泵帧（`__pump(n)` / `__frames()`），并摘掉
 * `ResizeObserver`，给自动化核对用——标签页切到后台时浏览器会停掉 rAF，
 * 而截图会改视口尺寸触发重开画布，不这样根本没法离线读画面。
 */
import { writeFileSync } from "node:fs";

import { SEED_EMBEDS } from "../../../modules/useless/server/seed-embeds.js";
import { buildUselessThumbnailDocument } from "../../../modules/useless/server/thumbnail-page.js";

const want = process.argv.slice(2);
const list = want.length
  ? SEED_EMBEDS.filter((e) => want.includes(e.title))
  : SEED_EMBEDS;

if (!list.length) {
  console.error(`没有匹配的标题。目录里有 ${SEED_EMBEDS.length} 条。`);
  process.exit(1);
}

const blocks = list
  .map((e) => {
    const page = buildUselessThumbnailDocument(e.html);
    const body = page.slice(page.indexOf("<body>") + 6, page.indexOf("</body>"));
    return `<section class="pv"><div class="pv-t">${e.title}</div>${body.trim()}</section>`;
  })
  .join("\n");

const first = buildUselessThumbnailDocument("");
const head = first.slice(0, first.indexOf("</head>"));

const out = process.env.OUT || "/tmp/useless-preview.html";
writeFileSync(
  out,
  `${head}<style>
.pv{height:86vh;margin:0 0 3rem;position:relative;border-top:1px solid var(--border)}
.pv-t{position:absolute;left:12px;top:8px;z-index:9;font:12px ui-monospace,monospace;opacity:.45}
.pv .marketing-site-root{height:100%}
</style></head><body>
${blocks}
</body></html>`,
  "utf8",
);
console.log(`[preview-useless] ${list.length} 条 → ${out}`);
