import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 租户站 SSR 页面里要引用的 SPA 入口脚本。
 *
 * 绑定域上**所有** HTML 文档都由这里的 SSR 产出（nginx 把它们反代给 Fastify），
 * 所以要让站点有交互（账户入口、明暗切换、会员页正文），只能由 SSR 自己把 SPA
 * 的入口带上。文件名带 vite 的内容哈希，唯一可靠的来源是构建产物里的 `app.html`。
 *
 * 拿不到就返回 `null`，页面退化成纯静态 HTML —— 开发态（客户端跑 vite dev server、
 * 没有 dist）与只跑服务端的场景都会走到这条路，不该因此让站点打不开。
 */

/** `<script type="module" ... src="/assets/index-XXXX.js">` 里的 src。 */
const MODULE_SCRIPT_SRC =
  /<script[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/iu;

/*
 * 相对 `process.cwd()` 找 dist：
 * - 容器里 entrypoint 会 `cd /app`，产物在 `/app/apps/client/dist`
 * - 本地 `pnpm --filter server dev|start` 的 cwd 是 `apps/server`
 * 两处都覆盖，避免依赖 `import.meta.url`——服务端是 esbuild 打包过的单文件，
 * 打包前后它指向的位置完全不同。
 */
const CANDIDATES = [
  "apps/client/dist/app.html",
  "../client/dist/app.html",
] as const;

/** `undefined` = 还没找过；`null` = 找过且没有。 */
let cached: string | null | undefined;

function readSpaEntry(): string | null {
  for (const candidate of CANDIDATES) {
    try {
      const html = readFileSync(
        path.resolve(process.cwd(), candidate),
        "utf8",
      );
      const src = MODULE_SCRIPT_SRC.exec(html)?.[1];
      if (src) return src;
    } catch {
      // 换下一个候选路径
    }
  }
  return null;
}

/**
 * 解析一次并缓存：产物在进程生命周期内不会变，而这是每个页面请求都要走的路径。
 */
export function resolveSpaEntrySrc(): string | null {
  // 显式判 `undefined`：`??=` 对 `null` 也会重新赋值，等于「没找到」永远不进缓存，
  // 缺产物时每个页面请求都要再去空读两次盘。
  if (cached === undefined) {
    cached = readSpaEntry();
  }
  return cached;
}

/** 仅供测试：清掉缓存。 */
export function resetSpaEntryCache(): void {
  cached = undefined;
}
