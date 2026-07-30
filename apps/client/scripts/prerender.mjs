#!/usr/bin/env node
/**
 * 把官网路由渲染成静态 HTML（SSG）。
 *
 *   node scripts/prerender.mjs
 *   SITE_URL=https://your-domain.com node scripts/prerender.mjs
 *
 * 前置：`vite build`（出 dist）与 `vite build --ssr`（出 dist-ssr）都已跑完。
 * 逻辑全在 `src/prerender/html.ts`（有单测），这里只做 IO 与编排。
 *
 * 产物：
 *   dist/index.html              ← 落地页（`/` 由 nginx 的 index 指令直接命中）
 *   dist/app.html                ← 原始 SPA 外壳，给应用路由与未知路径兜底
 *   dist/pricing/index.html
 *   dist/docs/<slug>/index.html
 *   dist/sitemap.xml · dist/robots.txt
 *
 * 为什么要单独留一份 app.html：`dist/index.html` 被落地页占了，若继续拿它做 SPA 兜底，
 * 刷新 /notes 会先闪一屏官网内容再切回应用。
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLIENT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const DIST = path.join(CLIENT_ROOT, "dist");
const SSR_DIST = path.join(CLIENT_ROOT, "dist-ssr");
const SSR_ENTRY = path.join(SSR_DIST, "entry.js");
const SPA_FALLBACK = "app.html";

/** SPA 兜底外壳不该被收录：它对任何路径都返回同一份空壳。 */
const NOINDEX_TAG = '<meta name="robots" content="noindex" />';

async function main() {
  const origin = process.env.SITE_URL?.trim();
  const entry = await import(SSR_ENTRY).catch((error) => {
    throw new Error(
      `载入 ${path.relative(CLIENT_ROOT, SSR_ENTRY)} 失败——先跑 vite build --ssr。原因：${error.message}`,
    );
  });

  const {
    PRERENDER_ROUTES,
    renderPage,
    buildHead,
    buildRobots,
    buildSitemap,
    injectPrerenderedPage,
    outputPathFor,
  } = entry;

  const siteOrigin = origin || entry.DEFAULT_ORIGIN;
  if (!origin) {
    console.warn(
      `[prerender] 未设置 SITE_URL，canonical 与 sitemap 用默认域名 ${siteOrigin}——上线前请设置。`,
    );
  }

  const template = await readFile(path.join(DIST, "index.html"), "utf8");

  // 先把原始外壳另存为兜底文件，再拿 index.html 装落地页
  await writeFile(
    path.join(DIST, SPA_FALLBACK),
    template.replace("</head>", `    ${NOINDEX_TAG}\n  </head>`),
    "utf8",
  );

  const lastmod = new Date().toISOString().slice(0, 10);

  for (const route of PRERENDER_ROUTES) {
    const body = await renderPage(route.path);
    if (body.trim() === "") {
      throw new Error(`${route.path} 渲染结果为空——路由没匹配上或页面抛了错`);
    }

    const html = injectPrerenderedPage({
      template,
      head: buildHead(route, siteOrigin),
      body,
    });

    const outputPath = path.join(DIST, outputPathFor(route.path));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf8");
    console.log(
      `[prerender] ${route.path} → ${path.relative(DIST, outputPath)} (${(html.length / 1024).toFixed(1)} kB)`,
    );
  }

  await writeFile(
    path.join(DIST, "sitemap.xml"),
    buildSitemap(PRERENDER_ROUTES, siteOrigin, lastmod),
    "utf8",
  );
  await writeFile(
    path.join(DIST, "robots.txt"),
    buildRobots(siteOrigin),
    "utf8",
  );
  console.log(`[prerender] sitemap.xml + robots.txt（${siteOrigin}）`);

  // SSR 产物只是中间件，别留在部署镜像里
  await rm(SSR_DIST, { recursive: true, force: true });
}

await main();
