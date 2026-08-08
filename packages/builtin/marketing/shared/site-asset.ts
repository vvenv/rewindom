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
}
