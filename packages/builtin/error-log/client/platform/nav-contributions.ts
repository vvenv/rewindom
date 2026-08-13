import type { PlatformNavContribution } from "@rewindom/client-kit";

export const errorLogPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "observability",
      children: [
        { to: "/platform/error-logs", label: "error-log:nav.errorLogs", end: true },
      ],
    },
  ];
