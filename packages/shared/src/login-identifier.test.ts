import { describe, expect, it } from "vitest";

import {
  InvalidLoginIdentifierError,
  parseLoginIdentifier,
} from "./login-identifier.js";
import {
  DEFAULT_TENANT_SLUG,
} from "./tenant-defaults.js";

describe("parseLoginIdentifier", () => {
  it("maps plain username to default tenant", () => {
    expect(parseLoginIdentifier("admin")).toEqual({
      username: "admin",
      tenant_slug: DEFAULT_TENANT_SLUG,
    });
  });

  it("parses explicit default tenant", () => {
    expect(parseLoginIdentifier(`admin@${DEFAULT_TENANT_SLUG}`)).toEqual({
      username: "admin",
      tenant_slug: DEFAULT_TENANT_SLUG,
    });
  });

  it("parses custom tenant slug", () => {
    expect(parseLoginIdentifier("bob@acme")).toEqual({
      username: "bob",
      tenant_slug: "acme",
    });
  });

  it("normalizes tenant slug to lowercase", () => {
    expect(parseLoginIdentifier("bob@ACME")).toEqual({
      username: "bob",
      tenant_slug: "acme",
    });
  });

  it("uses last @ as tenant separator", () => {
    expect(parseLoginIdentifier("user@mail@acme")).toEqual({
      username: "user@mail",
      tenant_slug: "acme",
    });
  });

  it("rejects admin@", () => {
    expect(() => parseLoginIdentifier("admin@")).toThrow(InvalidLoginIdentifierError);
  });

  it("rejects @acme", () => {
    expect(() => parseLoginIdentifier("@acme")).toThrow(InvalidLoginIdentifierError);
  });
});
