import { describe, expect, it } from "vitest";

import { resolveAppHomePath } from "./resolve-app-home-path";

const hasAllPermissions = () => true;
const hasNoPermissions = () => false;

describe("resolveAppHomePath", () => {
  it("returns the first candidate the tenant enabled and the user may access", () => {
    expect(
      resolveAppHomePath(
        { modules: { notes: true }, features: {} },
        hasAllPermissions,
      ),
    ).toBe("/notes");
  });

  it("treats a module as enabled when its entitlement is absent", () => {
    expect(
      resolveAppHomePath({ modules: {}, features: {} }, hasAllPermissions),
    ).toBe("/notes");
  });

  it("skips a candidate whose tenant module is disabled", () => {
    expect(
      resolveAppHomePath(
        { modules: { notes: false }, features: {} },
        hasAllPermissions,
      ),
    ).toBeNull();
  });

  it("skips a candidate the user lacks permission for", () => {
    expect(
      resolveAppHomePath(
        { modules: { notes: true }, features: {} },
        hasNoPermissions,
      ),
    ).toBeNull();
  });

  it("returns null when entitlements are unknown and permissions are missing", () => {
    expect(resolveAppHomePath(undefined, hasNoPermissions)).toBeNull();
  });
});
