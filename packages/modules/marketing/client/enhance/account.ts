/**
 * 公开站账户入口：把 SSR 的未登录 `.member-entry` 升级为已登录菜单。
 */

const ACCESS_KEY = "be-water_member_access_token";
const REFRESH_KEY = "be-water_member_refresh_token";

interface MemberProfile {
  display_name: string | null;
  email: string;
}

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

function hasTokens(): boolean {
  return Boolean(read(ACCESS_KEY) && read(REFRESH_KEY));
}

function clearTokens(): void {
  remove(ACCESS_KEY);
  remove(REFRESH_KEY);
}

function displayName(member: MemberProfile): string {
  const name = member.display_name?.trim();
  if (name) return name;
  return member.email.trim();
}

function initials(member: MemberProfile): string {
  const source = displayName(member);
  if (!source) return "";
  const words = source.split(/\s+/u).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => [...word][0] ?? "")
      .join("")
      .toUpperCase();
  }
  return [...(words[0] ?? "")].slice(0, 2).join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function loginHref(): string {
  const path = `${window.location.pathname}${window.location.search}`;
  if (!path || path.startsWith("/member/login")) return "/member/login";
  return `/member/login?redirect=${encodeURIComponent(path)}`;
}

function loginLabel(): string {
  const locale =
    document.querySelector(".marketing-site-root")?.getAttribute(
      "data-page-locale",
    ) ?? document.documentElement.lang;
  return locale === "en" ? "Sign in" : "登录";
}

function loginEntryHtml(): string {
  return `<a class="btn btn-ghost member-entry" href="${loginHref()}"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(loginLabel())}</a>`;
}

function isEnglish(): boolean {
  const locale =
    document.querySelector(".marketing-site-root")?.getAttribute(
      "data-page-locale",
    ) ?? document.documentElement.lang;
  return locale === "en";
}

function menuHtml(member: MemberProfile): string {
  const name = escapeHtml(displayName(member));
  const email = escapeHtml(member.email);
  const avatar = escapeHtml(initials(member));
  const showEmail = member.email && member.email !== displayName(member);
  const accountLabel = isEnglish() ? "Account" : "账户";
  const logoutLabel = isEnglish() ? "Log out" : "退出登录";
  const menuLabel = isEnglish() ? "Account" : "账户菜单";
  return `<details class="member-menu">
  <summary aria-label="${menuLabel}">
    <span class="member-avatar" aria-hidden>${avatar}</span>
    <span class="member-name">${name}</span>
  </summary>
  <div class="member-menu-panel">
    <div class="member-menu-label">
      <span class="member-avatar" aria-hidden>${avatar}</span>
      <div>
        <strong>${name}</strong>
        ${showEmail ? `<span class="muted">${email}</span>` : ""}
      </div>
    </div>
    <a href="/member/account">${accountLabel}</a>
    <button type="button" data-member-logout>${logoutLabel}</button>
  </div>
</details>`;
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
    const access = body.data?.accessToken;
    const nextRefresh = body.data?.refreshToken;
    if (!access || !nextRefresh) {
      clearTokens();
      return false;
    }
    write(ACCESS_KEY, access);
    write(REFRESH_KEY, nextRefresh);
    return true;
  } catch {
    return false;
  }
}

async function fetchMe(): Promise<MemberProfile | null> {
  const access = read(ACCESS_KEY);
  if (!access) return null;
  const request = async (token: string): Promise<Response> =>
    fetch("/api/member/me", {
      headers: { authorization: `Bearer ${token}` },
    });

  let response = await request(access);
  if (response.status === 401) {
    const ok = await refreshAccess();
    if (!ok) return null;
    const next = read(ACCESS_KEY);
    if (!next) return null;
    response = await request(next);
  }
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: MemberProfile };
  return body.data ?? null;
}

async function logout(): Promise<void> {
  const refresh = read(REFRESH_KEY);
  try {
    if (refresh) {
      await fetch("/api/member/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    }
  } catch {
    // ignore
  }
  clearTokens();
}

function replaceEntry(html: string): void {
  const entries = document.querySelectorAll(".member-entry, details.member-menu");
  for (const node of entries) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const next = wrap.firstElementChild;
    if (next) node.replaceWith(next);
  }
}

function bindMenuDismiss(details: HTMLDetailsElement): void {
  document.addEventListener("pointerdown", (event) => {
    if (!details.open) return;
    if (event.target instanceof Node && details.contains(event.target)) return;
    details.open = false;
  });
}

export function enhanceAccount(): void {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-member-logout]");
    if (!button) return;
    event.preventDefault();
    void logout().then(() => {
      replaceEntry(loginEntryHtml());
    });
  });

  if (!hasTokens()) {
    // SSR 登录链可能没带 redirect；补上当前路径
    for (const link of document.querySelectorAll<HTMLAnchorElement>(
      "a.member-entry",
    )) {
      link.href = loginHref();
    }
    return;
  }

  void fetchMe().then((member) => {
    if (!member) return;
    replaceEntry(menuHtml(member));
    for (const details of document.querySelectorAll<HTMLDetailsElement>(
      "details.member-menu",
    )) {
      bindMenuDismiss(details);
    }
  });
}
