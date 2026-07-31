import { Logo } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SITE } from "../../shared/index.js";
import { useMarketingHref } from "../hooks/use-marketing-href.js";

function isExternal(href: string): boolean {
  return /^(https?:|mailto:)/u.test(href);
}

const FOOTER_GROUPS = [
  {
    labelKey: "footer.groups.product",
    links: [
      { labelKey: "footer.links.intro", href: "/" },
      { labelKey: "footer.links.pricing", href: "/pricing" },
      { labelKey: "footer.links.login", href: "/login" },
    ],
  },
  {
    labelKey: "footer.groups.docs",
    links: [
      { labelKey: "footer.links.docsHome", href: "/docs" },
      { labelKey: "footer.links.quickstart", href: "/docs/quickstart" },
      { labelKey: "footer.links.agentFirst", href: "/docs/agent-first" },
      { labelKey: "footer.links.modules", href: "/docs/modules" },
    ],
  },
  {
    labelKey: "footer.groups.resources",
    links: [{ labelKey: "footer.links.github", href: SITE.repoUrl }],
  },
] as const;

export function MarketingFooter() {
  const { t } = useTranslation("marketing");
  const hrefFor = useMarketingHref();

  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Logo className="size-6 text-foreground" />
            <span className="font-medium">{SITE.name}</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("site.tagline")}——{t("site.description")}
          </p>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav
            key={group.labelKey}
            aria-label={t(group.labelKey)}
            className="space-y-3"
          >
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t(group.labelKey)}
            </h2>
            <ul className="space-y-2 text-sm">
              {group.links.map((link) => (
                <li key={`${group.labelKey}-${link.href}`}>
                  {isExternal(link.href) ? (
                    <a
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {t(link.labelKey)}
                    </a>
                  ) : (
                    <Link
                      to={hrefFor(link.href)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t(link.labelKey)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto w-full max-w-6xl border-t border-border/60 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} {SITE.name}
      </div>
    </footer>
  );
}
