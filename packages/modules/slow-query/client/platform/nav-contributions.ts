import type { PlatformNavContribution } from "@be-water/client-kit";

export const slowQueryPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "observability",
      children: [
        { to: "/platform/slow-query-logs", label: "慢查询", end: true },
      ],
    },
  ];
