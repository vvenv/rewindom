/**
 * 会员专属页：带 token 拉 HTML 片段，写入 `main[data-member-gate]`。
 */

const ACCESS_KEY = "be-water_member_access_token";
const REFRESH_KEY = "be-water_member_refresh_token";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function clearTokens(): void {
  remove(ACCESS_KEY);
  remove(REFRESH_KEY);
}

async function refreshAccess(): Promise<boolean> {
  const refresh = read(REFRESH_KEY);
  if (!refresh) return false;
  try {
    const response = await fetch("/api/member/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!response.ok) {
      clearTokens();
      return false;
    }
    const body = (await response.json()) as {
      data?: { accessToken?: string; refreshToken?: string };
    };
    if (!body.data?.accessToken || !body.data.refreshToken) {
      clearTokens();
      return false;
    }
    write(ACCESS_KEY, body.data.accessToken);
    write(REFRESH_KEY, body.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function fetchPageHtml(
  path: string,
  locale: string | null,
): Promise<string | null> {
  const access = read(ACCESS_KEY);
  if (!access) return null;

  const params = new URLSearchParams({ path });
  if (locale) params.set("locale", locale);
  const url = `/api/site/content/page-html?${params.toString()}`;

  const request = async (token: string): Promise<Response> =>
    fetch(url, { headers: { authorization: `Bearer ${token}` } });

  let response = await request(access);
  if (response.status === 401) {
    const ok = await refreshAccess();
    if (!ok) return null;
    const next = read(ACCESS_KEY);
    if (!next) return null;
    response = await request(next);
  }
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { html?: string } };
  return typeof body.data?.html === "string" ? body.data.html : null;
}

export function enhanceGated(): void {
  const main = document.querySelector<HTMLElement>("main[data-member-gate]");
  if (!main) return;
  if (!read(ACCESS_KEY) || !read(REFRESH_KEY)) return;

  const path = main.getAttribute("data-path") || "/";
  const locale = main.getAttribute("data-locale");

  void fetchPageHtml(path, locale).then((html) => {
    if (html === null) return;
    main.innerHTML = html;
    main.removeAttribute("data-member-gate");
  });
}
