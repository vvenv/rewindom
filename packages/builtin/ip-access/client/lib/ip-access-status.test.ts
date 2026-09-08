import { describe, expect, it } from "vitest";

import { collectIpAccessAlerts } from "./ip-access-status.js";

const healthy = {
  enabled: true,
  always_allow: ["10.0.0.0/8"],
  proxy_misconfig: { count: 0 },
  pending_auto_rules: 0,
};

describe("collectIpAccessAlerts", () => {
  it("stays quiet when checking is healthy", () => {
    expect(collectIpAccessAlerts(healthy)).toEqual([]);
  });

  it("lists failures in the order an operator should read them", () => {
    expect(
      collectIpAccessAlerts({
        enabled: false,
        always_allow: [],
        proxy_misconfig: { count: 3 },
        pending_auto_rules: 2,
      }),
    ).toEqual([
      "disabled",
      "proxy_misconfig",
      "always_allow_empty",
      "pending_auto",
    ]);
  });
});
