/**
 * 访客站的明暗偏好：**独立于工作台 `next-themes`** 的一份小状态。
 *
 * 官网与工作台是同一个 SPA、同一个 origin，共用 `localStorage.theme` 的话，访客在
 * 官网点深色会顺手把租户管理台也切黑（反之亦然）。所以这里自己存 key、自己往
 * `<html>` 上打 `data-site-color-mode`，与 `.dark` 那条线彻底分开。
 */

import {
  SITE_COLOR_MODE_ATTR,
  SITE_COLOR_MODE_STORAGE_KEY,
  SITE_COLOR_MODES,
  type ResolvedSiteColorMode,
  type SiteColorMode,
} from "../../shared/marketing-site-theme.js";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function isSiteColorMode(value: unknown): value is SiteColorMode {
  return (
    typeof value === "string" &&
    (SITE_COLOR_MODES as readonly string[]).includes(value)
  );
}

/** 隐私模式 / 禁用存储时 `localStorage` 会直接抛，退回跟随设备。 */
function readStoredMode(): SiteColorMode {
  try {
    const raw = localStorage.getItem(SITE_COLOR_MODE_STORAGE_KEY);
    return isSiteColorMode(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

function prefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

let mode: SiteColorMode =
  typeof window === "undefined" ? "system" : readStoredMode();

const listeners = new Set<() => void>();
let detach: (() => void) | null = null;

function emit(): void {
  for (const listener of [...listeners]) listener();
}

function attach(): void {
  const media = window.matchMedia(DARK_QUERY);
  const onMedia = (): void => emit();
  // 另一个标签页改了偏好；`key === null` 是 `clear()`，同样要重读。
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== SITE_COLOR_MODE_STORAGE_KEY) return;
    mode = readStoredMode();
    emit();
  };
  media.addEventListener("change", onMedia);
  window.addEventListener("storage", onStorage);
  detach = () => {
    media.removeEventListener("change", onMedia);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSiteColorMode(): SiteColorMode {
  return mode;
}

export function getResolvedSiteColorMode(): ResolvedSiteColorMode {
  if (mode !== "system") return mode;
  return prefersDark() ? "dark" : "light";
}

export function setSiteColorMode(next: SiteColorMode): void {
  mode = next;
  try {
    localStorage.setItem(SITE_COLOR_MODE_STORAGE_KEY, next);
  } catch {
    // 存不下就只在本次会话生效，不该因此不给切
  }
  emit();
}

export function subscribeSiteColorMode(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      detach?.();
      detach = null;
    }
  };
}

/**
 * 把解析后的明暗写到某个 document 的 `<html>`（预览 iframe 也走这里）。
 *
 * 顺带写 `style.colorScheme`：工作台的 next-themes 也在这个内联属性上写值，
 * 内联样式压过样式表里的 `color-scheme`，不覆盖的话滚动条、表单控件会留在
 * 工作台那一态。
 */
export function applySiteColorMode(
  doc: Document,
  resolved: ResolvedSiteColorMode,
): void {
  const root = doc.documentElement;
  root.setAttribute(SITE_COLOR_MODE_ATTR, resolved);
  root.style.colorScheme = resolved;
}

/**
 * 记下 `<html>` 上原本的明暗痕迹，返回复原函数。
 *
 * SPA 从官网导航回 `/app` 时要把这两处还给工作台：`colorScheme` 是 next-themes
 * 挂载时写死的内联值，被官网改掉后它不会自己写回来。
 */
export function snapshotSiteColorMode(doc: Document): () => void {
  const root = doc.documentElement;
  const previousAttr = root.getAttribute(SITE_COLOR_MODE_ATTR);
  const previousScheme = root.style.colorScheme;
  return () => {
    if (previousAttr === null) root.removeAttribute(SITE_COLOR_MODE_ATTR);
    else root.setAttribute(SITE_COLOR_MODE_ATTR, previousAttr);
    root.style.colorScheme = previousScheme;
  };
}
