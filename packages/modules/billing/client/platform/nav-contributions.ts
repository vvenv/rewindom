import { CreditCard } from "lucide-react";

import type { PlatformNavContribution } from "@be-water/client-kit";

export const billingPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "link",
      order: 35,
      to: "/platform/billing",
      label: "订阅与付款",
      icon: CreditCard,
      end: true,
    },
  ];
