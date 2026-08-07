/**
 * 会员专属页：SSR 未解锁时，带 cookie 拉 HTML 片段写入 `main[data-member-gate]`。
 */

async function refreshAccess(): Promise<boolean> {
  try {
    const response = await fetch("/api/member/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchPageHtml(
  path: string,
  locale: string | null,
): Promise<string | null> {
  const params = new URLSearchParams({ path });
  if (locale) params.set("locale", locale);
  const url = `/api/site/content/page-html?${params.toString()}`;

  const request = async (): Promise<Response> =>
    fetch(url, { credentials: "include" });

  let response = await request();
  if (response.status === 401) {
    const ok = await refreshAccess();
    if (!ok) return null;
    response = await request();
  }
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { html?: string } };
  return typeof body.data?.html === "string" ? body.data.html : null;
}

export function enhanceGated(): void {
  const main = document.querySelector<HTMLElement>("main[data-member-gate]");
  if (!main) return;

  const path = main.getAttribute("data-path") || "/";
  const locale = main.getAttribute("data-locale");

  void fetchPageHtml(path, locale).then((html) => {
    if (html === null) return;
    main.innerHTML = html;
    main.removeAttribute("data-member-gate");
  });
}
