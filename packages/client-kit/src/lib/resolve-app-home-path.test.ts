import { describe, expect, it } from "vitest";

import {
  EXAMPLE_HOME_PATH_CANDIDATES,
  resolveAppHomePath,
  type HomePathCandidate,
} from "./resolve-app-home-path";

const hasAllPermissions = () => true;
const hasNoPermissions = () => false;

const PRODUCT_CANDIDATES: readonly HomePathCandidate[] = [
  { path: "/estimate", tenantModule: "estimation" },
  ...EXAMPLE_HOME_PATH_CANDIDATES,
];

describe("resolveAppHomePath", () => {
  it("returns the first candidate the tenant enabled and the user may access", () => {
    expect(
      resolveAppHomePath(
        { modules: { notes: true }, features: {} },
        hasAllPermissions,
        EXAMPLE_HOME_PATH_CANDIDATES,
      ),
    ).toBe("/notes");
  });

  it("treats a module as enabled when its entitlement is absent", () => {
    expect(
      resolveAppHomePath(
        { modules: {}, features: {} },
        hasAllPermissions,
        EXAMPLE_HOME_PATH_CANDIDATES,
      ),
    ).toBe("/notes");
  });

  it("skips a candidate whose tenant module is disabled", () => {
    expect(
      resolveAppHomePath(
        { modules: { notes: false }, features: {} },
        hasAllPermissions,
        EXAMPLE_HOME_PATH_CANDIDATES,
      ),
    ).toBeNull();
  });

  it("skips disabled product modules and falls through to the next candidate", () => {
    expect(
      resolveAppHomePath(
        { modules: { estimation: false, notes: true }, features: {} },
        hasAllPermissions,
        PRODUCT_CANDIDATES,
      ),
    ).toBe("/notes");
  });

  it("skips a candidate the user lacks permission for", () => {
    expect(
      resolveAppHomePath(
        { modules: { notes: true }, features: {} },
        hasNoPermissions,
        EXAMPLE_HOME_PATH_CANDIDATES,
      ),
    ).toBeNull();
  });

  it("returns null when entitlements are unknown and permissions are missing", () => {
    expect(
      resolveAppHomePath(undefined, hasNoPermissions, EXAMPLE_HOME_PATH_CANDIDATES),
    ).toBeNull();
  });

  it("cannot skip a disabled module when tenantModule is omitted", () => {
    expect(
      resolveAppHomePath(
        { modules: { notes: false }, features: {} },
        hasAllPermissions,
        [{ path: "/notes" }],
      ),
    ).toBe("/notes");
  });
});
