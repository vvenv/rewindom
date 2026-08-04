import { type ReactElement, type ReactNode } from "react";

import { Link } from "react-router";

import { useSiteHref } from "./site-locale-context.js";

function isExternal(href: string): boolean {
  return /^(https?:|mailto:|tel:)/u.test(href);
}

/**
 * 站内用 `Link`，站外用 `a`——租户可以填任意外链。
 * 站内链接按当前语言补 locale 前缀（见 `site-locale-context.tsx`）。
 */
export function SiteLink({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page" | "true" | "false" | boolean;
}): ReactElement {
  const localize = useSiteHref();
  if (isExternal(href)) {
    return (
      <a
        href={href}
        className={className}
        rel="noreferrer noopener"
        target="_blank"
        aria-current={ariaCurrent}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={localize(href)} className={className} aria-current={ariaCurrent}>
      {children}
    </Link>
  );
}
