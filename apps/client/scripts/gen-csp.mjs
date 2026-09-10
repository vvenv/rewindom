/**
 * 由构建产物生成应用壳层的 CSP（nginx 片段）。
 *
 * ## 为什么是 hash 而不是 nonce
 *
 * 应用壳层是**静态文件**，由 nginx 直出：没有后端参与，就发不出「每个请求一个」的
 * nonce。要发就得把 index.html 改成后端渲染的模板——那是给一个不需要动态的东西
 * 加一层动态。
 *
 * 而 index.html 里的内联脚本每次构建后是固定的，正好适合 hash：算一次写进策略，
 * 没有随机数可预测，也没有每请求的开销。代价是它必须跟着构建走——所以这个脚本
 * 挂在 client 的 postbuild 上，产物变了策略自动跟着变，没有「改了 HTML 忘了改 CSP」
 * 这种失配可能。
 *
 * ## style-src 为什么留着 'unsafe-inline'
 *
 * 壳层里有五处在运行时 `document.createElement("style")`：
 *   apps/client/src/load-shell-css.ts
 *   packages/builtin/translation/client/enhance/widget.ts
 *   packages/builtin/marketing/client/components/theme-editor/PreviewFrame.tsx
 *   packages/builtin/marketing/client/components/appearance/SiteThemeSettingsForm.tsx
 *   packages/builtin/marketing/client/hooks/use-marketing-site-document-theme.ts
 * 这些 `<style>` 元素同样受 style-src 管辖，收紧就会让主题、预览、翻译挂件一起坏。
 * CSP 防 XSS 的价值绝大部分在 script-src；style-src 放开是有意识的取舍，
 * 想收紧得先把这五处改成 CSSOM（adoptedStyleSheets 不受 CSP 约束）。
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CLIENT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_HTML = join(CLIENT_ROOT, "dist", "index.html");
const OUTPUT = join(CLIENT_ROOT, "csp-app.conf");

/** 取出所有**内联**（无 src）script 的内容。 */
export function inlineScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (match) => match[1],
  );
}

export function inlineStyles(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
}

/** CSP 的 hash 是对**元素内容原文**做 sha256 再 base64，不做任何裁剪。 */
export function sha256Source(content) {
  return `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
}

export function buildPolicy(html) {
  const scriptHashes = inlineScripts(html).map(sha256Source);
  const styleHashes = inlineStyles(html).map(sha256Source);

  const directives = [
    ["default-src", ["'self'"]],
    // 内联脚本逐个按 hash 放行；除此之外只允许同源。
    ["script-src", ["'self'", ...scriptHashes]],
    // 见文件头：五处运行时注入的 <style> 决定了这里必须放开。
    // 构建产物里若真有内联 style，也一并按 hash 列出（当前为 0）。
    ["style-src", ["'self'", "'unsafe-inline'", ...styleHashes]],
    // 租户可以填任意外链图片（logo / og:image），附件预览用 blob:，图标用 data:
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    // 前端只打自己的 API（禁止直接 fetch，见 AGENTS.md）
    ["connect-src", ["'self'"]],
    ["media-src", ["'self'", "data:", "blob:"]],
    // Theme Editor 的预览是 srcDoc iframe；内容预览也走同源
    ["frame-src", ["'self'", "blob:"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];

  return directives
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function renderConf(policy, scriptCount) {
  return `# 由 apps/client/scripts/gen-csp.mjs 在构建时生成——**不要手改**。
# 内联脚本的 hash 跟着构建产物走，改了 index.html 重新构建即自动更新。
# 当前锁定 ${scriptCount} 个内联脚本。
#
# 只被「nginx 直出 HTML」的那些 location include；反代给应用的响应由应用自己发
# CSP（那边有租户统计脚本，来源要按站点算），两边不能同时发，否则策略取交集。
add_header Content-Security-Policy "${policy}" always;
`;
}

function main() {
  const html = readFileSync(INDEX_HTML, "utf8");
  const scripts = inlineScripts(html);
  if (scripts.length === 0) {
    // 不是错误，但值得响一声：说明壳层的内联引导脚本没了或写法变了，
    // 静默生成一个「什么都没锁」的策略比报错更糟。
    console.warn("[csp] dist/index.html 里没有内联脚本——请确认这是预期的");
  }
  const policy = buildPolicy(html);
  writeFileSync(OUTPUT, renderConf(policy, scripts.length), "utf8");
  console.log(`[csp] 已生成 ${OUTPUT}（锁定 ${scripts.length} 个内联脚本）`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
