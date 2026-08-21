/**
 * 公开页渲染出口：把媒体库的稳定应用路径改写成对象存储直链。
 *
 * 库 / 区块 JSON 仍存 `/api/public/tenants/:slug/site-assets/:filename`；
 * 有 `S3_PUBLIC_BASE_URL`（且 ATTACHMENT_STORAGE 为 s3/r2）时，SSR HTML /
 * webmanifest / 会员正文片段在出站前改写，访客 `<img>` 直连 CDN，不再先打应用 302。
 */

import { joinPublicObjectUrl } from "@rewindom/server-kernel/infra/file-storage/s3-file-storage.js";
import { config } from "@rewindom/server-kernel/lib/config.js";

import { siteAssetObjectKey } from "./site-asset.service.js";

export interface SiteAssetCdnRewriteContext {
  tenant_id: string;
  tenant_slug: string;
  public_base_url: string;
}

/** 仅 s3/r2 且配了公开根时才有值；本地磁盘恒为空（与 `resolveUrl` 口径一致）。 */
export function siteAssetPublicBaseUrl(): string {
  const kind = config.storage.attachment.storage;
  if (kind !== "s3" && kind !== "r2") return "";
  return config.storage.attachment.s3.publicBaseUrl;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * 把文本里本租户的媒体库公开路径换成 CDN 直链；无公开根时原样返回。
 *
 * 同时认相对路径与带任意 origin 的绝对形式（og:image 会先被补成站点 origin）。
 * 查询串 / hash 原样保留（工作台 `?v=` 若漏进公开 HTML 也不丢）。
 */
export function rewriteSiteAssetUrls(
  text: string,
  input: SiteAssetCdnRewriteContext,
): string {
  const base = input.public_base_url.replace(/\/+$/u, "");
  if (!base || !input.tenant_id || !input.tenant_slug) return text;

  const slugSeg = encodeURIComponent(input.tenant_slug);
  const pattern = new RegExp(
    String.raw`(?:https?:\/\/[^\s"'<>]+)?\/api\/public\/tenants\/${escapeRegExp(slugSeg)}\/site-assets\/([^/?#"'\s<>]+)([?#][^\s"'<>]*)?`,
    "gu",
  );

  return text.replace(
    pattern,
    (_match, filenameEnc: string, suffix: string | undefined) => {
      let filename: string;
      try {
        filename = decodeURIComponent(filenameEnc);
      } catch {
        return _match;
      }
      if (!filename || filename.includes("/") || filename.includes("..")) {
        return _match;
      }
      return (
        joinPublicObjectUrl(base, siteAssetObjectKey(input.tenant_id, filename)) +
        (suffix ?? "")
      );
    },
  );
}

/** 单条 URL（webmanifest icon 等）；不是媒体库路径或无 CDN 时原样返回。 */
export function rewriteSiteAssetUrl(
  url: string | null | undefined,
  input: SiteAssetCdnRewriteContext,
): string | null | undefined {
  if (url == null) return url;
  return rewriteSiteAssetUrls(url, input);
}
