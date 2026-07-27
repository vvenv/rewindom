import { describe, expect, it } from "vitest";

import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "./tenant-secret.service.js";

describe("tenant-secret.service", () => {
  it("round-trips secret encryption in test env", () => {
    const plaintext = "b81d6d7bf82c4d45a99bee941ec303fb";
    const encrypted = encryptTenantSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decryptTenantSecret(encrypted)).toBe(plaintext);
  });
});
