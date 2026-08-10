import { cn } from "@be-water/ui/utils";

import { Logo } from "./Logo.js";

export interface BrandMarkProps {
  /** 租户 logo 公开 URL；空则回退产品 Logo。 */
  src?: string | null;
  className?: string;
  alt?: string;
}

/** 侧栏 / 登录英雄区品牌图：有自定义 logo 用 mask 着色，否则用产品 SVG Logo。 */
export function BrandMark({
  src,
  className,
  alt = "Logo",
}: BrandMarkProps) {
  if (src) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn("inline-block bg-current", className)}
        style={{
          maskImage: `url("${src}")`,
          WebkitMaskImage: `url("${src}")`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    );
  }
  return <Logo className={className} />;
}
