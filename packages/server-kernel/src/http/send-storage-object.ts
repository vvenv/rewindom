import { getFileStorageProvider } from "../infra/file-storage/index.js";

import type { FastifyReply } from "fastify";

export interface SendStorageObjectOptions {
  /** 后端不带元数据时用的 Content-Type。 */
  mime_type: string;
  cache_control: string;
}

/*
 * 走这个 helper 的一律是**用户上传的字节**，所以响应头按「不可信内容」发：
 *
 * - `sandbox` + `default-src 'none'`：SVG 是可执行文档，直接访问资源 URL 或把它塞进
 *   iframe 会在**当前源**上跑脚本。租户站点的源同时挂着 `/app/*` 工作台，等于同源 XSS。
 *   上传时已消毒（见 `lib/image-upload.ts`），这里是第二道：管住存量文件和消毒漏网的。
 * - `nosniff`：别让浏览器把 `.png` 嗅探成 HTML。
 */
const UNTRUSTED_CONTENT_CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

/**
 * 把存储对象发给客户端：能给直链就 302 过去，否则服务端转发字节。
 *
 * 返回 `false` 表示对象不存在——各路由的 404 错误码不同，由调用方自己发。
 */
export async function sendStorageObject(
  reply: FastifyReply,
  storageKey: string,
  options: SendStorageObjectOptions,
): Promise<boolean> {
  const storage = getFileStorageProvider();

  /*
   * 对象存储/CDN 有直链时一定要转过去：图片是站点里请求量最大的一类资源，
   * 逐字节穿过 Node 进程既占内存又把带宽账记在应用服务器上。
   */
  const url = await storage.resolveUrl(storageKey);
  if (url) {
    /*
     * 302 之后内容由对象存储/CDN 直接回，下面那套安全头**管不到它**。
     * 接直链时必须在 bucket / CDN 侧配同等的 CSP 与 nosniff——
     * 或者（更好）把用户内容放到独立域名上，天然不同源。见 docs/design/file-storage.md。
     */
    reply.header("Cache-Control", options.cache_control);
    await reply.redirect(url, 302);
    return true;
  }

  const object = await storage.open(storageKey);
  if (!object) {
    return false;
  }

  reply.header("Content-Type", object.mime_type ?? options.mime_type);
  reply.header("Content-Length", String(object.size));
  reply.header("Cache-Control", options.cache_control);
  reply.header("Content-Security-Policy", UNTRUSTED_CONTENT_CSP);
  reply.header("X-Content-Type-Options", "nosniff");
  await reply.send(object.stream);
  return true;
}
