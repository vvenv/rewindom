import { cn } from "@be-water/ui/utils";

import { useAppVersion } from "../hooks/useAppVersion.js";

interface AppVersionProps {
  className?: string;
}

export function AppVersion({ className }: AppVersionProps) {
  const { data, isPending } = useAppVersion();

  if (!isPending && !data?.version) {
    return null;
  }

  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      {isPending ? "…" : data.version}
    </p>
  );
}
