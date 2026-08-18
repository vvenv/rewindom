import type { Readable } from "node:stream";

/**
 * 文件存储后端。业务侧（媒体库、品牌资源、未来的附件）只依赖这个接口，
 * 落地在本地磁盘还是 OSS/S3/R2 由 `ATTACHMENT_STORAGE` 决定。
 *
 * 接口里**不出现任何本地磁盘的概念**（绝对路径、fs.Stats、同步流）：
 * 一旦漏出去，业务代码就会绕过抽象直接 `fs.stat`，对象存储再也接不进来。
 */
export interface FileStorageProvider {
  put(
    storageKey: string,
    buffer: Buffer,
    options: FileStoragePutOptions,
  ): Promise<void>;

  /** 取字节流与元数据；对象不存在返回 `null`（不抛）。 */
  open(storageKey: string): Promise<FileStorageObject | null>;

  /** 幂等：对象本就不存在也算删除成功。 */
  delete(storageKey: string): Promise<void>;

  /**
   * 客户端可直接访问的 URL（对象存储直链 / CDN / 预签名 URL）。
   *
   * 本地磁盘没有这种 URL，返回 `null`，调用方回落到自己转发字节。
   * 有直链时让客户端直连是接对象存储的**主要收益**：图片流量不再穿过 Node 进程。
   */
  resolveUrl(storageKey: string): Promise<string | null>;
}

export interface FileStoragePutOptions {
  mime_type: string;
  /**
   * `public` 的对象允许匿名读（对象存储上体现为公读 ACL 或公开 bucket），
   * `private` 只能通过预签名 URL 或服务端转发访问。
   */
  visibility: "public" | "private";
  /**
   * 覆盖默认的一年 immutable。媒体库替换会改同一把存储键的字节，
   * 必须把可缓存时间收掉，否则 CDN 会把旧图一直端出去。
   */
  cache_control?: string;
}

export interface FileStorageObject {
  stream: Readable;
  size: number;
  /** 后端记录的 MIME；本地磁盘不存元数据，返回 `null`，由调用方兜底。 */
  mime_type: string | null;
}
