import {
  getPlatformPageTitle,
  isNavChildActive,
  isNavGroupActive,
  usePlatformNavEntries,
} from "@be-water/client-kit";

export type {
  PlatformNavChild,
  PlatformNavEntry,
  PlatformNavGroup,
  PlatformNavLink,
} from "@be-water/client-kit";

export { isNavChildActive, isNavGroupActive };

export function getPlatformPageTitleForEntries(
  pathname: string,
  search = "",
): string {
  // Test / storybook helper when PlatformNavProvider is absent.
  return getPlatformPageTitle([], pathname, search);
}

export function usePlatformNavConfig() {
  const platformNavEntries = usePlatformNavEntries();
  return {
    platformNavEntries,
    getPlatformPageTitle: (pathname: string, search = "") =>
      getPlatformPageTitle(platformNavEntries, pathname, search),
    isNavChildActive,
    isNavGroupActive,
  };
}
