import { useMemo, type ReactNode } from "react";

import { PlatformLayout } from "@be-water/builtin/platform/client/components/PlatformLayout.js";
import {
  NavBadgeRegistryProvider,
  PlatformNavProvider,
  usePublicConfig,
} from "@be-water/client-kit";

import { useAppShellConfig } from "../contexts/app-shell-context.js";
import { filterPlatformNavForSingleTenant } from "../lib/filter-platform-nav-single-tenant.js";

import { ShellProviders } from "./ShellProviders.js";

function PlatformNavBadgeContributors(): ReactNode {
  const { shellContributions } = useAppShellConfig();

  return (
    <>
      {shellContributions.platformNavBadge.map((Component, index) => (
        <Component key={index} />
      ))}
    </>
  );
}

/** Wraps platform layout with nav registry, badge contributors, and module contributions. */
export function PlatformConsoleShell(): ReactNode {
  const { platformNavEntries } = useAppShellConfig();
  const {
    data: { single_tenant },
  } = usePublicConfig();

  const entries = useMemo(
    () =>
      single_tenant
        ? filterPlatformNavForSingleTenant(platformNavEntries)
        : platformNavEntries,
    [platformNavEntries, single_tenant],
  );

  return (
    <ShellProviders>
      <PlatformNavProvider entries={entries}>
        <NavBadgeRegistryProvider>
          <PlatformNavBadgeContributors />
          <PlatformLayout />
        </NavBadgeRegistryProvider>
      </PlatformNavProvider>
    </ShellProviders>
  );
}
