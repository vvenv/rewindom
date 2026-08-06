/**
 * 公开站交互脚本（SSR 注入 / Fastify 下发）。
 *
 * 真源是 `client/enhance/`，由 `site-enhance/assemble.mjs` 写入
 * `site-enhance.generated.ts`。
 */

export {
  SITE_ENHANCE_HASH,
  SITE_ENHANCE_JS,
} from "./site-enhance.generated.js";
