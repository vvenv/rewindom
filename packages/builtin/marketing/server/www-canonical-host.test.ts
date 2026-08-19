import { describe, expect, it } from "vitest";

import {
  resolveWwwCanonicalHost,
  swapOriginHost,
} from "./www-canonical-host.js";

function bound(...hosts: string[]) {
  return (hostname: string): Promise<boolean> =>
    Promise.resolve(hosts.includes(hostname));
}

describe("resolveWwwCanonicalHost", () => {
  it("redirects www to the apex that actually has the site", async () => {
    expect(
      await resolveWwwCanonicalHost("www.yestino.com", bound("yestino.com")),
    ).toBe("yestino.com");
  });

  it("leaves www alone when it is bound itself", async () => {
    expect(
      await resolveWwwCanonicalHost(
        "www.acme.com",
        bound("www.acme.com", "acme.com"),
      ),
    ).toBeNull();
  });

  it("does not strip www when the apex is unbound (FRONTEND_URL=www.…)", async () => {
    expect(
      await resolveWwwCanonicalHost("www.example.com", bound()),
    ).toBeNull();
  });

  it("ignores hosts that are not www", async () => {
    expect(
      await resolveWwwCanonicalHost("yestino.com", bound("yestino.com")),
    ).toBeNull();
    expect(await resolveWwwCanonicalHost(null, bound())).toBeNull();
  });

  it("does not redirect to an unbound apex like `com`", async () => {
    expect(await resolveWwwCanonicalHost("www.com", bound())).toBeNull();
  });

  it("works for single-label hosts (local dev: www.localhost → localhost)", async () => {
    expect(
      await resolveWwwCanonicalHost("www.localhost", bound("localhost")),
    ).toBe("localhost");
  });
});

describe("swapOriginHost", () => {
  it("keeps scheme and port", () => {
    expect(swapOriginHost("https://www.a.com", "a.com")).toBe("https://a.com");
    expect(swapOriginHost("http://www.a.com:7300", "a.com")).toBe(
      "http://a.com:7300",
    );
  });

  it("returns null for junk", () => {
    expect(swapOriginHost("not a url", "a.com")).toBeNull();
  });
});
