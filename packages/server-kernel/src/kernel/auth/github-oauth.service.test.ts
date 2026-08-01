import { describe, expect, it } from "vitest";

import { normalizeOAuthUsername } from "./oauth-common.js";

describe("normalizeOAuthUsername", () => {
  it("lowercases and keeps valid logins", () => {
    expect(normalizeOAuthUsername("OctoCat")).toBe("octocat");
  });

  it("pads short names", () => {
    expect(normalizeOAuthUsername("ab").length).toBeGreaterThanOrEqual(3);
  });

  it("strips invalid characters", () => {
    expect(normalizeOAuthUsername("foo.bar!")).toBe("foobar");
  });
});
