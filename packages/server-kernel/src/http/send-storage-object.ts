import { getFileStorageProvider } from "../infra/file-storage/index.js";

import type { FastifyReply } from "fastify";

export interface SendStorageObjectOptions {
  /** 后端不带元数据时用的 Content-Type。 */
  mime_type: string;
  cache_control: string;
}

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
  await reply.send(object.stream);
  return true;
}
