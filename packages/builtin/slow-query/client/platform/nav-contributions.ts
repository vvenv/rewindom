import type { PlatformNavContribution } from "@rewindom/client-kit";

export const slowQueryPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "observability",
      children: [
        { to: "/platform/slow-query-logs", label: "slow-query:nav.slowQueryLogs", end: true },
      ],
    },
  ];
