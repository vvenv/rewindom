import { createContext, useContext, type ReactNode } from "react";

import type { PlatformNavEntry } from "../lib/platform-nav-types.js";

const PlatformNavContext = createContext<readonly PlatformNavEntry[]>([]);

export function PlatformNavProvider({
  entries,
  children,
}: {
  entries: readonly PlatformNavEntry[];
  children: ReactNode;
}): ReactNode {
  return (
    <PlatformNavContext.Provider value={entries}>
      {children}
    </PlatformNavContext.Provider>
  );
}

export function usePlatformNavEntries(): readonly PlatformNavEntry[] {
  return useContext(PlatformNavContext);
}
