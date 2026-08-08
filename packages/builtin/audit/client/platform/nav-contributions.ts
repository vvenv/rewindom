import type { PlatformNavContribution } from "@be-water/client-kit";

export const auditPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "observability",
      children: [
        { to: "/platform/audit-logs", label: "audit:nav.auditLogs", end: true },
      ],
    },
  ];
