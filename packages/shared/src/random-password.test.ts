import { describe, expect, it } from "vitest";

import {
  DEFAULT_RANDOM_PASSWORD_LENGTH,
  generateRandomPassword,
} from "./random-password";

describe("generateRandomPassword", () => {
  it("returns password with default length", () => {
    const password = generateRandomPassword();
    expect(password).toHaveLength(DEFAULT_RANDOM_PASSWORD_LENGTH);
    expect(password).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it("respects custom length", () => {
    expect(generateRandomPassword(6)).toHaveLength(6);
  });
});
