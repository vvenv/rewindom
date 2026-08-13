import { useMemo } from "react";

import {
  getPlatformPageTitle,
  isNavChildActive,
  isNavGroupActive,
  translatePlatformNavEntries,
  usePlatformNavEntries,
} from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";

export type {
  PlatformNavChild,
  PlatformNavEntry,
  PlatformNavGroup,
  PlatformNavLink,
} from "@rewindom/client-kit";

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
  const { t, i18n } = useTranslation([
    "platform",
    "billing",
    "audit",
    "error-log",
    "slow-query",
  ]);

  const translatedEntries = useMemo(
    () => translatePlatformNavEntries(platformNavEntries, t),
    [platformNavEntries, t, i18n.language],
  );

  return {
    platformNavEntries: translatedEntries,
    getPlatformPageTitle: (pathname: string, search = "") =>
      getPlatformPageTitle(translatedEntries, pathname, search, t),
    isNavChildActive,
    isNavGroupActive,
  };
}
