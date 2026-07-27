import type { AppNavItem } from "./app-nav-types.js";

let quickLinksProvider: (() => (AppNavItem & { keywords: string })[]) | null =
  null;

export function registerAppNavQuickLinksProvider(
  provider: () => (AppNavItem & { keywords: string })[],
): void {
  quickLinksProvider = provider;
}

export function getAppNavQuickLinks(): (AppNavItem & { keywords: string })[] {
  return quickLinksProvider?.() ?? [];
}
