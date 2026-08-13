import { APP_DISPLAY_NAME } from "@be-water/shared";
import { cn } from "@be-water/ui/utils";

import { Logo } from "./Logo.js";

export interface BrandMarkProps {
  /** 租户 logo 公开 URL；空则回退产品 Logo。 */
  src?: string | null;
  className?: string;
  alt?: string;
}

/** 侧栏 / 登录英雄区品牌图：有自定义 logo 用 `<img>` 原样展示，否则用产品 SVG Logo。 */
export function BrandMark({
  src,
  className,
  alt = APP_DISPLAY_NAME,
}: BrandMarkProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("inline-block object-contain", className)}
      />
    );
  }
  return <Logo className={className} />;
}
