/** 媒体库里的一张图（服务端映射与客户端共用的形状）。 */
export interface SiteAsset {
  id: string;
  filename: string;
  /** 公开可访问的 URL；section 的 `image` 设置里存的就是它。 */
  url: string;
  mime_type: string;
  size_bytes: number;
  /** 原始像素尺寸；0 表示解析不出来（SVG 没有固有尺寸）。 */
  width: number;
  height: number;
  /** 无障碍替代文本；空表示装饰性图片。 */
  alt: string;
  created_at: string;
  /** 替换文件会更新；工作台预览用它做 cache-bust，写入字段的仍是 `url`。 */
  updated_at: string;
}

/**
 * 媒体库允许的图片 MIME。
 *
 * 浏览器拖放经常给不出类型（SVG 尤其如此），服务端还会再靠魔数 / 扩展名回落；
 * 这份名单是「最终落库的类型」白名单，前后端共用，避免 input `accept` 与校验漂移。
 */
export const SITE_ASSET_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/x-icon",
] as const;

export const SITE_ASSET_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
] as const;

const SITE_ASSET_MIME_SET = new Set<string>([
  ...SITE_ASSET_MIME_TYPES,
  "image/jpg",
  "image/pjpeg",
  "image/x-png",
  "image/svg",
  "image/vnd.microsoft.icon",
  "image/icon",
]);

const SITE_ASSET_EXTENSION_SET = new Set<string>(SITE_ASSET_FILE_EXTENSIONS);

/** `<input accept>`：MIME + 扩展名都写上，系统文件框才肯列出 svg/webp/avif。 */
export const SITE_ASSET_ACCEPT = [
  ...SITE_ASSET_MIME_TYPES,
  "image/vnd.microsoft.icon",
  "image/svg",
  ...SITE_ASSET_FILE_EXTENSIONS,
].join(",");

export function isSiteAssetFilename(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return SITE_ASSET_EXTENSION_SET.has(name.slice(dot).toLowerCase());
}

export function isSiteAssetFile(file: {
  name: string;
  type: string;
}): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime && SITE_ASSET_MIME_SET.has(mime)) return true;
  return isSiteAssetFilename(file.name);
}

/**
 * 工作台 `<img>` 用：同一公开 URL 被替换后，靠 `updated_at` 让浏览器丢掉旧缓存。
 * 写进 section / 站点设置的必须仍是 `asset.url`，否则每个引用都会变成一次性地址。
 */
export function siteAssetPreviewUrl(asset: {
  url: string;
  updated_at: string;
}): string {
  const joiner = asset.url.includes("?") ? "&" : "?";
  return `${asset.url}${joiner}v=${encodeURIComponent(asset.updated_at)}`;
}
