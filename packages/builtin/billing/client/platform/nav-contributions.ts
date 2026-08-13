import { CreditCard } from "lucide-react";

import type { PlatformNavContribution } from "@rewindom/client-kit";

export const billingPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "link",
      order: 35,
      to: "/platform/billing",
      label: "billing:nav.billing",
      icon: CreditCard,
      end: true,
    },
  ];
