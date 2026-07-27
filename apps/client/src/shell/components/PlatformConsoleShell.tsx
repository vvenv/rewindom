import type { ReactNode } from "react";

import {
  NavBadgeRegistryProvider,
  PlatformNavProvider,
} from "@be-water/client-kit";
import { PlatformLayout } from "@be-water/modules/platform/client/components/PlatformLayout.js";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

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

  return (
    <ShellProviders>
      <PlatformNavProvider entries={platformNavEntries}>
        <NavBadgeRegistryProvider>
          <PlatformNavBadgeContributors />
          <PlatformLayout />
        </NavBadgeRegistryProvider>
      </PlatformNavProvider>
    </ShellProviders>
  );
}
