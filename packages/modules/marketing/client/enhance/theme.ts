/**
 * 公开站明暗切换（无 React）。
 *
 * 与 `client/lib/site-color-mode.ts` / SSR `marketingSiteColorModeScript` 同源：
 * `localStorage.site-color-mode` + `<html data-site-color-mode>`。
 */

const STORAGE_KEY = "site-color-mode";
const ATTR = "data-site-color-mode";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const SUN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';

const MOON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

type Mode = "light" | "dark" | "system";
type Resolved = "light" | "dark";

function readMode(): Mode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // ignore
  }
  return "system";
}

function prefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

function resolvedOf(mode: Mode): Resolved {
  if (mode !== "system") return mode;
  return prefersDark() ? "dark" : "light";
}

function apply(resolved: Resolved): void {
  const root = document.documentElement;
  root.setAttribute(ATTR, resolved);
  root.style.colorScheme = resolved;
}

function setMode(next: Mode): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  apply(resolvedOf(next));
  syncButtons();
}

function syncButtons(): void {
  const mode = readMode();
  const resolved = resolvedOf(mode);
  const label =
    mode === "system" ? "跟随系统" : mode === "dark" ? "深色" : "浅色";
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "button.theme-toggle",
  )) {
    button.title = `当前主题: ${label}`;
    button.innerHTML = resolved === "dark" ? MOON_SVG : SUN_SVG;
  }
}

export function enhanceTheme(): void {
  syncButtons();
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button.theme-toggle");
    if (!button) return;
    event.preventDefault();
    const resolved = resolvedOf(readMode());
    setMode(resolved === "dark" ? "light" : "dark");
  });
}
