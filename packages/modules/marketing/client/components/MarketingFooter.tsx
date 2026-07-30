import { Logo } from "@be-water/client-kit";
import { Link } from "react-router";

import { SITE, SITE_FOOTER_GROUPS } from "../../shared/index.js";

function isExternal(href: string): boolean {
  return /^(https?:|mailto:)/u.test(href);
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Logo className="size-6 text-foreground" />
            <span className="font-medium">{SITE.name}</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            {SITE.tagline}——{SITE.description}
          </p>
        </div>

        {SITE_FOOTER_GROUPS.map((group) => (
          <nav key={group.label} aria-label={group.label} className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h2>
            <ul className="space-y-2 text-sm">
              {group.links.map((link) => (
                <li key={`${group.label}-${link.href}`}>
                  {isExternal(link.href) ? (
                    <a
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
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
