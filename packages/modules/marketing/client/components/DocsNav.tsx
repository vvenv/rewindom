import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useMarketingHref } from "../hooks/use-marketing-href.js";
import { DOC_PAGES } from "../lib/docs.js";

/** 文档目录：每篇文档页都渲染完整目录，站内链接互通对收录有帮助。 */
export function DocsNav({ currentSlug }: { currentSlug?: string }) {
  const { t } = useTranslation("marketing");
  const hrefFor = useMarketingHref();

  return (
    <nav aria-label={t("docs.navLabel")} className="text-sm">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("docs.navTitle")}
      </h2>
      <ul className="space-y-0.5">
        {DOC_PAGES.map((page) => {
          const active = page.slug === currentSlug;
          return (
            <li key={page.slug}>
              <Link
                to={hrefFor(page.path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-2.5 py-1.5 transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
