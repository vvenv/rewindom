/**
 * 公开站账户入口：SSR 已登录则只绑定登出；访客态用 cookie 探测后升级菜单。
 */

interface MemberProfile {
  display_name: string | null;
  email: string;
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

async function fetchMe(): Promise<MemberProfile | null> {
  const request = async (): Promise<Response> =>
    fetch("/api/member/me", { credentials: "include" });

  let response = await request();
  if (response.status === 401) {
    const ok = await refreshAccess();
    if (!ok) return null;
    response = await request();
  }
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: MemberProfile };
  return body.data ?? null;
}

async function logout(): Promise<void> {
  try {
    await fetch("/api/member/logout", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  } catch {
    // ignore
  }
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

function wireMenus(): void {
  for (const details of document.querySelectorAll<HTMLDetailsElement>(
    "details.member-menu",
  )) {
    bindMenuDismiss(details);
  }
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

  // SSR 已输出登录菜单：只绑交互
  if (document.querySelector("details.member-menu")) {
    wireMenus();
    return;
  }

  // 访客登录链：补 redirect
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    "a.member-entry",
  )) {
    link.href = loginHref();
  }

  // 兜底：cookie 有效但 SSR 仍画了访客（极少见）时升级菜单
  void fetchMe().then((member) => {
    if (!member) return;
    replaceEntry(menuHtml(member));
    wireMenus();
  });
}
