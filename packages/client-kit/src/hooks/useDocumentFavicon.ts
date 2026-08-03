import { useEffect } from "react";

const DEFAULT_FAVICON_HREF = "/favicon.svg";

/**
 * 运行时切换 `<link rel="icon">`；传 `null`/`undefined` 时恢复产品默认。
 */
export function useDocumentFavicon(href: string | null | undefined): void {
  useEffect(() => {
    const link =
      document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
      document.head.appendChild(Object.assign(document.createElement("link"), {
        rel: "icon",
      }));

    const previous = link.getAttribute("href");
    link.setAttribute("href", href && href.length > 0 ? href : DEFAULT_FAVICON_HREF);

    return () => {
      if (previous) {
        link.setAttribute("href", previous);
      } else {
        link.setAttribute("href", DEFAULT_FAVICON_HREF);
      }
    };
  }, [href]);
}
