import { cn } from "@be-water/ui/utils";

import { siblingPages, type PublicSitePage } from "../../shared/site-cms.js";

import { SiteLink } from "./sections/SiteSections.js";

/**
 * 同级页面菜单：列出与当前页共享父路径的所有页面，父页面作为菜单标题。
 *
 * 与 kind 无关——文档正文页列出兄弟文档，任何嵌套路径都同样适用。
 * 标题用父页面自己的标题，不走 i18n：租户内容不该被平台文案覆盖，
 * SSR（ssr-render.ts 的 `renderPageNavHtml`）也才好渲染出一模一样的一份。
 */
export function SitePageNav({
  pages,
  currentPath,
  className,
}: {
  pages: PublicSitePage[];
  currentPath: string;
  className?: string;
}) {
  const { parent, items } = siblingPages(pages, currentPath);
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={parent?.title || "Pages"}
      className={cn("text-sm", className)}
    >
      {parent ? (
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <SiteLink href={parent.path} className="hover:text-foreground">
            {parent.title}
          </SiteLink>
        </h2>
      ) : null}
      <ul className="space-y-0.5">
        {items.map((page) => {
          const active = page.path === currentPath;
          return (
            <li key={page.path} aria-current={active ? "page" : undefined}>
              <SiteLink
                href={page.path}
                className={cn(
                  "block rounded-lg px-2.5 py-1.5 transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {page.title}
              </SiteLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
