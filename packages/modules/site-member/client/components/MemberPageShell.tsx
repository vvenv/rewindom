import type { ReactNode } from "react";

import { cn } from "@be-water/ui/utils";


/**
 * 会员页的中性外壳。
 *
 * 刻意不复用租户站点的页头页脚：那需要 site-member 反向依赖 marketing 的
 * `TenantSiteView`，而会员页是工具页而非 CMS 内容，套上站点 chrome 还会在
 * 站点未发布时无处可渲染。
 */
export function MemberPageShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className={cn("w-full max-w-md space-y-6", className)}>
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
