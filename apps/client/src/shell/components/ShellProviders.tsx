import type { ReactNode } from "react";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

export function ShellProviders({ children }: { children: ReactNode }): ReactNode {
  const { shellContributions } = useAppShellConfig();

  return shellContributions.shellProviders.reduceRight<ReactNode>(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children,
  );
}
