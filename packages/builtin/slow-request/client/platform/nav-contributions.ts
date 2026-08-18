import type { PlatformNavContribution } from "@rewindom/client-kit";

export const slowRequestPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "observability",
      children: [
        {
          to: "/platform/slow-request-logs",
          label: "slow-request:nav.slowRequestLogs",
          end: true,
        },
      ],
    },
  ];
