import { describe, expect, it } from "vitest";

import { resolveViewSiteHref } from "./view-site-href.js";

const local = { protocol: "http:", port: "7300" };
const prod = { protocol: "https:", port: "" };

describe("resolveViewSiteHref", () => {
  it("uses the current host when not impersonating", () => {
    expect(
      resolveViewSiteHref({
        impersonating: false,
        customDomain: "acme.io",
        tenantSlug: "acme",
        tenantBaseDomain: "rewindom.com",
        location: local,
      }),
    ).toBe("/");
  });

  it("prefers the custom domain while impersonating", () => {
    expect(
      resolveViewSiteHref({
        impersonating: true,
        customDomain: "acme.io",
        tenantSlug: "acme",
        tenantBaseDomain: "rewindom.com",
        location: local,
      }),
    ).toBe("https://acme.io");
  });

  it("falls back to the default subdomain with the current protocol and port", () => {
    expect(
      resolveViewSiteHref({
        impersonating: true,
        customDomain: null,
        tenantSlug: "acme",
        tenantBaseDomain: "localhost",
        location: local,
      }),
    ).toBe("http://acme.localhost:7300");
  });

  it("omits the port on the production console host", () => {
    expect(
      resolveViewSiteHref({
        impersonating: true,
        customDomain: "  ",
        tenantSlug: "acme",
        tenantBaseDomain: "rewindom.com",
        location: prod,
      }),
    ).toBe("https://acme.rewindom.com");
  });

  it("stays on / when the default subdomain cannot be built", () => {
    expect(
      resolveViewSiteHref({
        impersonating: true,
        customDomain: null,
        tenantSlug: "acme",
        tenantBaseDomain: null,
        location: local,
      }),
    ).toBe("/");
  });
});
