import { describe, expect, it } from "vitest";

import { canUpdateField } from "./field-permission-utils.js";

describe("canUpdateField", () => {
  it("allows system admin regardless of permission list", () => {
    expect(canUpdateField(true, [], "documents.write")).toBe(true);
  });

  it("checks permission list for regular users", () => {
    expect(canUpdateField(false, ["documents.read"], "documents.write")).toBe(
      false,
    );
    expect(canUpdateField(false, ["documents.write"], "documents.write")).toBe(
      true,
    );
  });
});
