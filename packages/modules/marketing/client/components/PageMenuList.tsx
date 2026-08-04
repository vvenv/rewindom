import { cn } from "@be-water/ui/utils";

import { SiteLink } from "./sections/SiteLink.js";

export interface PageMenuListItem {
  label: string;
  href: string;
}

/**
 * 页面菜单列表：`page-menu` section 的 list 样式使用。
 * 标题用页面自身文案，不走 i18n（与 SSR 一致）。
 */
export function PageMenuList({
  title,
  titlePath,
  items,
  currentPath,
  className,
  showTitle = true,
}: {
  title: string | null;
  titlePath?: string | null;
  items: PageMenuListItem[];
  currentPath: string;
  className?: string;
  /** section 已有自己的 heading 时关掉。 */
  showTitle?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={title || "Pages"} className={cn("text-sm", className)}>
      {showTitle && title ? (
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {titlePath ? (
            <SiteLink href={titlePath} className="hover:text-foreground">
              {title}
            </SiteLink>
          ) : (
            title
          )}
        </h2>
      ) : null}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.href === currentPath;
          return (
            <li
              key={`${item.href}\0${item.label}`}
              aria-current={active ? "page" : undefined}
            >
              <SiteLink
                href={item.href}
                className={cn(
                  "block rounded-lg px-2.5 py-1.5 transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.label}
              </SiteLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
