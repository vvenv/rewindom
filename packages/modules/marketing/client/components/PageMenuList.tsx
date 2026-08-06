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

  const navClass = className
    ? `page-menu-list ${className}`
    : "page-menu-list";

  return (
    <nav aria-label={title || "Pages"} className={navClass}>
      {showTitle && title ? (
        <h2 className="eyebrow">
          {titlePath ? <SiteLink href={titlePath}>{title}</SiteLink> : title}
        </h2>
      ) : null}
      <ul>
        {items.map((item) => {
          const active = item.href === currentPath;
          return (
            <li
              key={`${item.href}\0${item.label}`}
              aria-current={active ? "page" : undefined}
            >
              <SiteLink href={item.href}>{item.label}</SiteLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
