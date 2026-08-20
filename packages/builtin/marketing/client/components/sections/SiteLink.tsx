import { type CSSProperties, type ReactElement, type ReactNode } from "react";

import { Link } from "react-router";

import { useSiteHref } from "./site-locale-context.js";

function isExternal(href: string): boolean {
  return /^(https?:|mailto:|tel:)/u.test(href);
}

/**
 * 页内锚点（`#contact`）不能交给 `Link`：它会被当成相对路径，先补上当前语言前缀
 * 再拼到 pathname 后面，跳到一个不存在的地址。单页站点的「跳到下面那一段」
 * 是最常见的 CTA 写法，起步模板也用它。
 */
function isInPageAnchor(href: string): boolean {
  return href.startsWith("#");
}

/**
 * 站内用 `Link`，站外用 `a`——租户可以填任意外链。
 * 站内链接按当前语言补 locale 前缀（见 `site-locale-context.tsx`）。
 */
export function SiteLink({
  href,
  className,
  style,
  children,
  blockId,
  title,
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** 这条链接就是某个 block 时带上，编辑器据此在预览里选中它。 */
  blockId?: string;
  title?: string;
  "aria-current"?: "page" | "true" | "false" | boolean;
  "aria-label"?: string;
}): ReactElement {
  const localize = useSiteHref();
  if (isExternal(href)) {
    return (
      <a
        href={href}
        data-block-id={blockId}
        className={className}
        style={style}
        rel="noreferrer noopener"
        target="_blank"
        title={title}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
      >
        {children}
      </a>
    );
  }
  if (isInPageAnchor(href)) {
    return (
      <a
        href={href}
        data-block-id={blockId}
        className={className}
        style={style}
        title={title}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      to={localize(href)}
      data-block-id={blockId}
      className={className}
      style={style}
      title={title}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
    >
      {children}
    </Link>
  );
}
